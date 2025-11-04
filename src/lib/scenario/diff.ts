import type { GraphDocument, GraphEdge, GraphNode } from "../schema/types";
import type {
  ScenarioDiff,
  NodeDiff,
  EdgeDiff,
  ChangeCategory,
  Scenario,
} from "./types";

export function computeScenarioDiff(
  baseDoc: GraphDocument,
  targetDoc: GraphDocument,
): ScenarioDiff {
  const nodeDiffs: NodeDiff[] = [];
  const edgeDiffs: EdgeDiff[] = [];

  // Create lookup maps
  const baseNodesMap = new Map(baseDoc.nodes.map((n) => [n.id, n]));
  const targetNodesMap = new Map(targetDoc.nodes.map((n) => [n.id, n]));
  const baseEdgesMap = new Map(baseDoc.edges.map((e) => [e.id, e]));
  const targetEdgesMap = new Map(targetDoc.edges.map((e) => [e.id, e]));

  // Check all target nodes
  for (const targetNode of targetDoc.nodes) {
    const baseNode = baseNodesMap.get(targetNode.id);
    if (!baseNode) {
      // Added node
      nodeDiffs.push({
        type: "added",
        node: targetNode,
      });
    } else {
      // Check if modified
      const changes = getNodeChanges(baseNode, targetNode);
      if (changes.length > 0) {
        nodeDiffs.push({
          type: "modified",
          node: targetNode,
          originalNode: baseNode,
          changes,
        });
      } else {
        nodeDiffs.push({
          type: "unchanged",
          node: targetNode,
          originalNode: baseNode,
        });
      }
    }
  }

  // Check for removed nodes
  for (const baseNode of baseDoc.nodes) {
    if (!targetNodesMap.has(baseNode.id)) {
      nodeDiffs.push({
        type: "removed",
        node: baseNode,
        originalNode: baseNode,
      });
    }
  }

  // Check all target edges
  for (const targetEdge of targetDoc.edges) {
    const baseEdge = baseEdgesMap.get(targetEdge.id);
    if (!baseEdge) {
      // Added edge
      edgeDiffs.push({
        type: "added",
        edge: targetEdge,
      });
    } else {
      // Check if modified
      const changes = getEdgeChanges(baseEdge, targetEdge);
      if (changes.length > 0) {
        edgeDiffs.push({
          type: "modified",
          edge: targetEdge,
          originalEdge: baseEdge,
          changes,
        });
      } else {
        edgeDiffs.push({
          type: "unchanged",
          edge: targetEdge,
          originalEdge: baseEdge,
        });
      }
    }
  }

  // Check for removed edges
  for (const baseEdge of baseDoc.edges) {
    if (!targetEdgesMap.has(baseEdge.id)) {
      edgeDiffs.push({
        type: "removed",
        edge: baseEdge,
        originalEdge: baseEdge,
      });
    }
  }

  // Compute summary
  const summary = {
    nodesAdded: nodeDiffs.filter((d) => d.type === "added").length,
    nodesRemoved: nodeDiffs.filter((d) => d.type === "removed").length,
    nodesModified: nodeDiffs.filter((d) => d.type === "modified").length,
    edgesAdded: edgeDiffs.filter((d) => d.type === "added").length,
    edgesRemoved: edgeDiffs.filter((d) => d.type === "removed").length,
    edgesModified: edgeDiffs.filter((d) => d.type === "modified").length,
  };

  return {
    nodes: nodeDiffs,
    edges: edgeDiffs,
    summary,
  };
}

function getNodeChanges(
  baseNode: GraphNode,
  targetNode: GraphNode,
): Array<{ field: string; oldValue: unknown; newValue: unknown }> {
  const changes: Array<{ field: string; oldValue: unknown; newValue: unknown }> = [];

  if (baseNode.name !== targetNode.name) {
    changes.push({ field: "name", oldValue: baseNode.name, newValue: targetNode.name });
  }

  if (baseNode.kind === "person" && targetNode.kind === "person") {
    const baseAttrs = baseNode.attributes;
    const targetAttrs = targetNode.attributes;

    if (baseAttrs.title !== targetAttrs.title) {
      changes.push({ field: "title", oldValue: baseAttrs.title, newValue: targetAttrs.title });
    }

    if (baseAttrs.tier !== targetAttrs.tier) {
      changes.push({ field: "tier", oldValue: baseAttrs.tier, newValue: targetAttrs.tier });
    }

    if (JSON.stringify(baseAttrs.brands) !== JSON.stringify(targetAttrs.brands)) {
      changes.push({ field: "brands", oldValue: baseAttrs.brands, newValue: targetAttrs.brands });
    }

    if (JSON.stringify(baseAttrs.channels) !== JSON.stringify(targetAttrs.channels)) {
      changes.push({
        field: "channels",
        oldValue: baseAttrs.channels,
        newValue: targetAttrs.channels,
      });
    }

    if (JSON.stringify(baseAttrs.departments) !== JSON.stringify(targetAttrs.departments)) {
      changes.push({
        field: "departments",
        oldValue: baseAttrs.departments,
        newValue: targetAttrs.departments,
      });
    }

    if (baseAttrs.location !== targetAttrs.location) {
      changes.push({
        field: "location",
        oldValue: baseAttrs.location,
        newValue: targetAttrs.location,
      });
    }
  }

  return changes;
}

function getEdgeChanges(
  baseEdge: GraphEdge,
  targetEdge: GraphEdge,
): Array<{ field: string; oldValue: unknown; newValue: unknown }> {
  const changes: Array<{ field: string; oldValue: unknown; newValue: unknown }> = [];

  if (baseEdge.source !== targetEdge.source) {
    changes.push({ field: "source", oldValue: baseEdge.source, newValue: targetEdge.source });
  }

  if (baseEdge.target !== targetEdge.target) {
    changes.push({ field: "target", oldValue: baseEdge.target, newValue: targetEdge.target });
  }

  if (baseEdge.metadata.type !== targetEdge.metadata.type) {
    changes.push({
      field: "type",
      oldValue: baseEdge.metadata.type,
      newValue: targetEdge.metadata.type,
    });
  }

  return changes;
}

export function getAffectedNodes(
  diff: ScenarioDiff,
  edges: GraphEdge[],
): Set<string> {
  const affected = new Set<string>();

  // Add all changed nodes
  diff.nodes.forEach((nodeDiff) => {
    if (nodeDiff.type !== "unchanged") {
      affected.add(nodeDiff.node.id);
    }
  });

  // Add nodes connected to changed edges
  diff.edges.forEach((edgeDiff) => {
    if (edgeDiff.type !== "unchanged") {
      affected.add(edgeDiff.edge.source);
      affected.add(edgeDiff.edge.target);
    }
  });

  return affected;
}

export function getAffectedEdges(
  diff: ScenarioDiff,
  nodeIds: Set<string>,
): Set<string> {
  const affected = new Set<string>();

  // Add all changed edges
  diff.edges.forEach((edgeDiff) => {
    if (edgeDiff.type !== "unchanged") {
      affected.add(edgeDiff.edge.id);
    }
  });

  // Add edges connected to changed nodes
  diff.edges.forEach((edgeDiff) => {
    if (
      nodeIds.has(edgeDiff.edge.source) ||
      nodeIds.has(edgeDiff.edge.target)
    ) {
      affected.add(edgeDiff.edge.id);
    }
  });

  return affected;
}

export function categorizeChanges(diff: ScenarioDiff): ChangeCategory[] {
  const categories: ChangeCategory[] = [];

  // People changes
  const peopleChanges = diff.nodes
    .filter((d) => d.type !== "unchanged")
    .map((d) => ({
      description:
        d.type === "added"
          ? `Added ${d.node.name}`
          : d.type === "removed"
          ? `Removed ${d.node.name}`
          : `Modified ${d.node.name}${
              d.changes ? `: ${d.changes.map((c) => c.field).join(", ")}` : ""
            }`,
      nodeIds: [d.node.id],
      edgeIds: [] as string[],
      severity: (d.type === "removed" ? "high" : d.type === "added" ? "medium" : "low") as
        | "low"
        | "medium"
        | "high",
    }));

  if (peopleChanges.length > 0) {
    categories.push({
      type: "people",
      changes: peopleChanges,
    });
  }

  // Relationship changes
  const relationshipChanges = diff.edges
    .filter((d) => d.type !== "unchanged")
    .map((d) => ({
      description:
        d.type === "added"
          ? `Added ${d.edge.metadata.type} relationship`
          : d.type === "removed"
          ? `Removed ${d.edge.metadata.type} relationship`
          : `Modified ${d.edge.metadata.type} relationship`,
      nodeIds: [d.edge.source, d.edge.target],
      edgeIds: [d.edge.id],
      severity: (d.edge.metadata.type === "manager" ? "high" : "medium") as
        | "low"
        | "medium"
        | "high",
    }));

  if (relationshipChanges.length > 0) {
    categories.push({
      type: "relationships",
      changes: relationshipChanges,
    });
  }

  // Attribute changes
  const attributeChanges = diff.nodes
    .filter((d) => d.type === "modified" && d.changes && d.changes.length > 0)
    .map((d) => ({
      description: `Updated ${d.node.name}: ${d.changes!.map((c) => c.field).join(", ")}`,
      nodeIds: [d.node.id],
      edgeIds: [] as string[],
      severity: "low" as "low" | "medium" | "high",
    }));

  if (attributeChanges.length > 0) {
    categories.push({
      type: "attributes",
      changes: attributeChanges,
    });
  }

  return categories;
}

export function getChangeDescription(nodeDiff: NodeDiff): string {
  if (nodeDiff.type === "added") {
    return `Added to organization`;
  }
  if (nodeDiff.type === "removed") {
    return `Removed from organization`;
  }
  if (nodeDiff.type === "modified" && nodeDiff.changes) {
    return nodeDiff.changes
      .map((c) => `${c.field}: ${c.oldValue} → ${c.newValue}`)
      .join(", ");
  }
  return "No changes";
}

