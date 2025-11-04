import type { GraphEdge, GraphNode, PersonNode } from "../schema/types";

export type NetworkConnection = {
  nodeId: string;
  distance: number;
  relationshipType?: string;
  edgeId?: string;
};

export function getSphereOfInfluence(
  nodeId: string,
  edges: GraphEdge[],
  depth: number = 2,
): Set<string> {
  const sphere = new Set<string>([nodeId]);
  
  // Build adjacency list (bidirectional)
  const graph = new Map<string, string[]>();
  edges.forEach((edge) => {
    if (!graph.has(edge.source)) graph.set(edge.source, []);
    if (!graph.has(edge.target)) graph.set(edge.target, []);
    
    graph.get(edge.source)!.push(edge.target);
    graph.get(edge.target)!.push(edge.source);
  });

  // BFS with depth limit
  let currentLevel = new Set([nodeId]);
  
  for (let level = 0; level < depth; level++) {
    const nextLevel = new Set<string>();
    
    for (const node of currentLevel) {
      const neighbors = graph.get(node) || [];
      neighbors.forEach((neighbor) => {
        if (!sphere.has(neighbor)) {
          sphere.add(neighbor);
          nextLevel.add(neighbor);
        }
      });
    }
    
    currentLevel = nextLevel;
    if (currentLevel.size === 0) break;
  }

  return sphere;
}

export function getDirectConnections(
  nodeId: string,
  edges: GraphEdge[],
): NetworkConnection[] {
  const connections: NetworkConnection[] = [];

  edges.forEach((edge) => {
    if (edge.source === nodeId) {
      connections.push({
        nodeId: edge.target,
        distance: 1,
        relationshipType: edge.metadata.type,
        edgeId: edge.id,
      });
    } else if (edge.target === nodeId) {
      connections.push({
        nodeId: edge.source,
        distance: 1,
        relationshipType: edge.metadata.type,
        edgeId: edge.id,
      });
    }
  });

  return connections;
}

export function calculateCentrality(
  nodeId: string,
  nodes: GraphNode[],
  edges: GraphEdge[],
): number {
  // Simple degree centrality: count of direct connections
  const connections = getDirectConnections(nodeId, edges);
  
  // Normalize by total possible connections
  const maxPossible = nodes.length - 1;
  if (maxPossible === 0) return 0;
  
  return connections.length / maxPossible;
}

export function findBridgeNodes(nodes: GraphNode[], edges: GraphEdge[]): string[] {
  // Nodes that connect otherwise disconnected components
  const bridges: string[] = [];
  
  // Build adjacency list
  const graph = new Map<string, string[]>();
  nodes.forEach((node) => graph.set(node.id, []));
  edges.forEach((edge) => {
    if (!graph.has(edge.source)) graph.set(edge.source, []);
    if (!graph.has(edge.target)) graph.set(edge.target, []);
    graph.get(edge.source)!.push(edge.target);
    graph.get(edge.target)!.push(edge.source);
  });

  // For each node, check if removing it increases component count
  nodes.forEach((node) => {
    const withoutNode = new Map(graph);
    withoutNode.delete(node.id);
    
    // Remove node from all adjacency lists
    withoutNode.forEach((neighbors) => {
      const index = neighbors.indexOf(node.id);
      if (index > -1) {
        neighbors.splice(index, 1);
      }
    });

    const componentsBefore = countComponents(graph, nodes);
    const componentsAfter = countComponents(withoutNode, nodes.filter((n) => n.id !== node.id));

    if (componentsAfter > componentsBefore) {
      bridges.push(node.id);
    }
  });

  return bridges;
}

function countComponents(
  graph: Map<string, string[]>,
  nodes: GraphNode[],
): number {
  const visited = new Set<string>();
  let components = 0;

  function dfs(nodeId: string) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    const neighbors = graph.get(nodeId) || [];
    neighbors.forEach((neighbor) => dfs(neighbor));
  }

  nodes.forEach((node) => {
    if (!visited.has(node.id)) {
      components++;
      dfs(node.id);
    }
  });

  return components;
}

export function suggestConnections(
  nodeId: string,
  nodes: GraphNode[],
  edges: GraphEdge[],
): Array<{ targetId: string; reason: string; score: number }> {
  const suggestions: Array<{ targetId: string; reason: string; score: number }> = [];
  
  const node = nodes.find((n) => n.id === nodeId);
  if (!node || node.kind !== "person") return suggestions;

  const existingConnections = new Set(
    getDirectConnections(nodeId, edges).map((c) => c.nodeId),
  );

  // Find manager's other reports (peers)
  const managerEdge = edges.find(
    (e) => e.target === nodeId && e.metadata.type === "manager",
  );
  if (managerEdge) {
    const peerEdges = edges.filter(
      (e) =>
        e.source === managerEdge.source &&
        e.metadata.type === "manager" &&
        e.target !== nodeId &&
        !existingConnections.has(e.target),
    );
    peerEdges.forEach((edge) => {
      suggestions.push({
        targetId: edge.target,
        reason: "Team member under same manager",
        score: 0.8,
      });
    });
  }

  // Find people with shared dimensions
  nodes.forEach((otherNode) => {
    if (
      otherNode.id === nodeId ||
      otherNode.kind !== "person" ||
      existingConnections.has(otherNode.id)
    )
      return;

    const sharedBrands = node.attributes.brands.filter((b) =>
      otherNode.attributes.brands.includes(b),
    );
    const sharedChannels = node.attributes.channels.filter((c) =>
      otherNode.attributes.channels.includes(c),
    );
    const sharedDepts = node.attributes.departments.filter((d) =>
      otherNode.attributes.departments.includes(d),
    );

    if (sharedBrands.length > 0 && sharedChannels.length > 0) {
      suggestions.push({
        targetId: otherNode.id,
        reason: `Shared brand (${sharedBrands[0]}) and channel (${sharedChannels[0]})`,
        score: 0.9,
      });
    } else if (sharedDepts.length > 0 && sharedBrands.length > 0) {
      suggestions.push({
        targetId: otherNode.id,
        reason: `Shared department (${sharedDepts[0]}) and brand (${sharedBrands[0]})`,
        score: 0.7,
      });
    }
  });

  // Sort by score and return top suggestions
  suggestions.sort((a, b) => b.score - a.score);
  return suggestions.slice(0, 5);
}

export function getCollaborationScore(node1: PersonNode, node2: PersonNode): number {
  let score = 0;

  // Shared brands increase score
  const sharedBrands = node1.attributes.brands.filter((b) =>
    node2.attributes.brands.includes(b),
  );
  score += sharedBrands.length * 0.3;

  // Shared channels increase score
  const sharedChannels = node1.attributes.channels.filter((c) =>
    node2.attributes.channels.includes(c),
  );
  score += sharedChannels.length * 0.3;

  // Shared departments increase score
  const sharedDepts = node1.attributes.departments.filter((d) =>
    node2.attributes.departments.includes(d),
  );
  score += sharedDepts.length * 0.2;

  // Same tier increases score slightly
  if (node1.attributes.tier === node2.attributes.tier) {
    score += 0.1;
  }

  // Same location increases score
  if (node1.attributes.location && node1.attributes.location === node2.attributes.location) {
    score += 0.1;
  }

  return Math.min(score, 1.0);
}

