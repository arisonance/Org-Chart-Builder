import type { GraphEdge, GraphNode } from "../schema/types";

export type Subgraph = {
  id: string;
  nodeIds: string[];
  edgeIds: string[];
  size: number;
};

export function identifySubgraphs(nodes: GraphNode[], edges: GraphEdge[]): Subgraph[] {
  const subgraphs: Subgraph[] = [];
  const visited = new Set<string>();

  // Build adjacency list
  const graph = new Map<string, string[]>();
  nodes.forEach((node) => graph.set(node.id, []));
  edges.forEach((edge) => {
    if (!graph.has(edge.source)) graph.set(edge.source, []);
    if (!graph.has(edge.target)) graph.set(edge.target, []);
    graph.get(edge.source)!.push(edge.target);
    graph.get(edge.target)!.push(edge.source);
  });

  function dfs(nodeId: string, component: Set<string>) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    component.add(nodeId);
    
    const neighbors = graph.get(nodeId) || [];
    neighbors.forEach((neighbor) => dfs(neighbor, component));
  }

  nodes.forEach((node) => {
    if (!visited.has(node.id)) {
      const component = new Set<string>();
      dfs(node.id, component);
      
      const componentEdges = edges.filter(
        (e) => component.has(e.source) && component.has(e.target),
      );

      subgraphs.push({
        id: `subgraph-${subgraphs.length}`,
        nodeIds: Array.from(component),
        edgeIds: componentEdges.map((e) => e.id),
        size: component.size,
      });
    }
  });

  return subgraphs;
}

export function groupByProximity(
  nodeId: string,
  nodes: GraphNode[],
  edges: GraphEdge[],
  maxDistance: number = 2,
): Map<number, string[]> {
  const groups = new Map<number, string[]>();
  
  // Build adjacency list
  const graph = new Map<string, string[]>();
  nodes.forEach((node) => graph.set(node.id, []));
  edges.forEach((edge) => {
    if (!graph.has(edge.source)) graph.set(edge.source, []);
    if (!graph.has(edge.target)) graph.set(edge.target, []);
    graph.get(edge.source)!.push(edge.target);
    graph.get(edge.target)!.push(edge.source);
  });

  // BFS to group by distance
  const queue: Array<{ id: string; distance: number }> = [{ id: nodeId, distance: 0 }];
  const visited = new Set<string>([nodeId]);

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (!groups.has(current.distance)) {
      groups.set(current.distance, []);
    }
    groups.get(current.distance)!.push(current.id);

    if (current.distance < maxDistance) {
      const neighbors = graph.get(current.id) || [];
      neighbors.forEach((neighbor) => {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push({ id: neighbor, distance: current.distance + 1 });
        }
      });
    }
  }

  return groups;
}

export function getTeamStructure(
  managerId: string,
  edges: GraphEdge[],
  maxDepth: number = 10,
): { nodeIds: string[]; edgeIds: string[]; depth: number } {
  const nodeIds = new Set<string>([managerId]);
  const edgeIds = new Set<string>();
  let currentLevel = [managerId];
  let depth = 0;

  while (currentLevel.length > 0 && depth < maxDepth) {
    const nextLevel: string[] = [];

    currentLevel.forEach((currentNodeId) => {
      // Find all direct reports (manager edges where current node is source)
      edges.forEach((edge) => {
        if (edge.source === currentNodeId && edge.metadata.type === "manager") {
          nodeIds.add(edge.target);
          edgeIds.add(edge.id);
          nextLevel.push(edge.target);
        }
      });
    });

    currentLevel = nextLevel;
    depth++;
  }

  return {
    nodeIds: Array.from(nodeIds),
    edgeIds: Array.from(edgeIds),
    depth,
  };
}

