import type { GraphEdge, GraphNode, PersonNode } from "../schema/types";

export type PathNode = {
  nodeId: string;
  edgeId?: string;
  relationshipType?: string;
};

export type Path = {
  nodes: PathNode[];
  distance: number;
  description: string;
};

export function findShortestPath(
  sourceId: string,
  targetId: string,
  edges: GraphEdge[],
): Path | null {
  if (sourceId === targetId) {
    return {
      nodes: [{ nodeId: sourceId }],
      distance: 0,
      description: "Same person",
    };
  }

  // Build adjacency list (bidirectional)
  const graph = new Map<string, Array<{ nodeId: string; edge: GraphEdge }>>();
  
  edges.forEach((edge) => {
    if (!graph.has(edge.source)) {
      graph.set(edge.source, []);
    }
    if (!graph.has(edge.target)) {
      graph.set(edge.target, []);
    }
    
    graph.get(edge.source)!.push({ nodeId: edge.target, edge });
    graph.get(edge.target)!.push({ nodeId: edge.source, edge });
  });

  // BFS to find shortest path
  const queue: Array<{ nodeId: string; path: PathNode[] }> = [
    { nodeId: sourceId, path: [{ nodeId: sourceId }] },
  ];
  const visited = new Set<string>([sourceId]);

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.nodeId === targetId) {
      return {
        nodes: current.path,
        distance: current.path.length - 1,
        description: `${current.path.length - 1} hop${
          current.path.length - 1 === 1 ? "" : "s"
        }`,
      };
    }

    const neighbors = graph.get(current.nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor.nodeId)) {
        visited.add(neighbor.nodeId);
        queue.push({
          nodeId: neighbor.nodeId,
          path: [
            ...current.path,
            {
              nodeId: neighbor.nodeId,
              edgeId: neighbor.edge.id,
              relationshipType: neighbor.edge.metadata.type,
            },
          ],
        });
      }
    }
  }

  return null;
}

export function findAllPaths(
  sourceId: string,
  targetId: string,
  edges: GraphEdge[],
  maxDepth: number = 4,
): Path[] {
  if (sourceId === targetId) {
    return [
      {
        nodes: [{ nodeId: sourceId }],
        distance: 0,
        description: "Same person",
      },
    ];
  }

  const paths: Path[] = [];
  
  // Build adjacency list (bidirectional)
  const graph = new Map<string, Array<{ nodeId: string; edge: GraphEdge }>>();
  
  edges.forEach((edge) => {
    if (!graph.has(edge.source)) {
      graph.set(edge.source, []);
    }
    if (!graph.has(edge.target)) {
      graph.set(edge.target, []);
    }
    
    graph.get(edge.source)!.push({ nodeId: edge.target, edge });
    graph.get(edge.target)!.push({ nodeId: edge.source, edge });
  });

  // DFS with depth limit
  function dfs(nodeId: string, path: PathNode[], visited: Set<string>) {
    if (path.length > maxDepth) return;

    if (nodeId === targetId) {
      paths.push({
        nodes: [...path],
        distance: path.length - 1,
        description: `${path.length - 1} hop${path.length - 1 === 1 ? "" : "s"}`,
      });
      return;
    }

    const neighbors = graph.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor.nodeId)) {
        visited.add(neighbor.nodeId);
        dfs(
          neighbor.nodeId,
          [
            ...path,
            {
              nodeId: neighbor.nodeId,
              edgeId: neighbor.edge.id,
              relationshipType: neighbor.edge.metadata.type,
            },
          ],
          visited,
        );
        visited.delete(neighbor.nodeId);
      }
    }
  }

  const visited = new Set<string>([sourceId]);
  dfs(sourceId, [{ nodeId: sourceId }], visited);

  // Sort by distance
  paths.sort((a, b) => a.distance - b.distance);

  return paths.slice(0, 5); // Return top 5 paths
}

export function calculateDistance(
  nodeId1: string,
  nodeId2: string,
  edges: GraphEdge[],
): number {
  const path = findShortestPath(nodeId1, nodeId2, edges);
  return path ? path.distance : Infinity;
}

export function getPathDescription(
  path: Path,
  nodes: GraphNode[],
  edges: GraphEdge[],
): string {
  if (path.nodes.length <= 1) {
    return "Same person";
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const edgeMap = new Map(edges.map((e) => [e.id, e]));

  const segments: string[] = [];

  for (let i = 1; i < path.nodes.length; i++) {
    const prevNode = nodeMap.get(path.nodes[i - 1].nodeId);
    const currNode = nodeMap.get(path.nodes[i].nodeId);
    const edge = path.nodes[i].edgeId ? edgeMap.get(path.nodes[i].edgeId) : null;

    if (prevNode && currNode && edge) {
      const relType = edge.metadata.type;
      segments.push(`${prevNode.name} → ${currNode.name} (${relType})`);
    }
  }

  return segments.join(" → ");
}

export function getSharedDimensions(
  node1: PersonNode,
  node2: PersonNode,
): {
  brands: string[];
  channels: string[];
  departments: string[];
} {
  const sharedBrands = node1.attributes.brands.filter((b) =>
    node2.attributes.brands.includes(b),
  );
  const sharedChannels = node1.attributes.channels.filter((c) =>
    node2.attributes.channels.includes(c),
  );
  const sharedDepartments = node1.attributes.departments.filter((d) =>
    node2.attributes.departments.includes(d),
  );

  return {
    brands: sharedBrands,
    channels: sharedChannels,
    departments: sharedDepartments,
  };
}

