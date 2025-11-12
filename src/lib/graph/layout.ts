import { graphlib, layout as dagreLayout } from "@dagrejs/dagre";
import type { GraphDocument, GraphEdge, GraphNode, PersonNode } from "@/lib/schema/types";
import type { LensId } from "@/lib/schema/lenses";

export type ChildMap = Record<string, string[]>;

const NODE_WIDTH = 260;
const NODE_HEIGHT = 150;
const NODE_SEPARATION = 240;
const RANK_SEPARATION = 300;
const MARGIN_X = 150;
const MARGIN_Y = 150;

const isManagerEdge = (edge: GraphEdge) => edge.metadata.type === "manager";

export const buildChildMap = (edges: GraphEdge[]): ChildMap => {
  const map: ChildMap = {};
  edges
    .filter(isManagerEdge)
    .forEach((edge) => {
      if (!map[edge.source]) {
        map[edge.source] = [];
      }
      map[edge.source].push(edge.target);
    });
  return map;
};

export const isDescendant = (
  childMap: ChildMap,
  rootId: string,
  searchId: string,
): boolean => {
  const queue = [...(childMap[rootId] ?? [])];
  const visited = new Set<string>();
  while (queue.length) {
    const current = queue.shift()!;
    if (current === searchId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    const children = childMap[current];
    if (children) queue.push(...children);
  }
  return false;
};

export const calculateLayout = (
  nodes: GraphNode[],
  edges: GraphEdge[],
): Record<string, { x: number; y: number }> => {
  const g = new graphlib.Graph({ directed: true, compound: false, multigraph: false });
  g.setGraph({
    rankdir: "TB",
    nodesep: NODE_SEPARATION,
    ranksep: RANK_SEPARATION,
    marginx: MARGIN_X,
    marginy: MARGIN_Y,
  });
  g.setDefaultEdgeLabel(() => ({}));

  nodes
    .filter((node) => node.kind === "person")
    .forEach((node) => {
      g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    });

  edges
    .filter(isManagerEdge)
    .forEach((edge) => {
      if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
        g.setEdge(edge.source, edge.target);
      }
    });

  dagreLayout(g);

  const positions: Record<string, { x: number; y: number }> = {};
  g.nodes().forEach((id) => {
    const node = g.node(id);
    positions[id] = {
      x: (node?.x ?? 0) - NODE_WIDTH / 2,
      y: (node?.y ?? 0) - NODE_HEIGHT / 2,
    };
  });

  return positions;
};

export const autoLayoutDocument = (document: GraphDocument) => {
  const positions = calculateLayout(document.nodes, document.edges);
  const layout = document.lens_state[document.lens]?.layout;
  if (!layout) {
    return positions;
  }
  Object.keys(positions).forEach((nodeId) => {
    layout.positions[nodeId] = positions[nodeId];
  });
  layout.lastUpdated = new Date().toISOString();
  return layout.positions;
};

// Matrix-aware layout functions
export const calculateMatrixLayout = (
  nodes: GraphNode[],
  edges: GraphEdge[],
  lens: LensId,
  dimension: 'brand' | 'channel' | 'department',
): Record<string, { x: number; y: number }> => {
  const personNodes = nodes.filter((n): n is PersonNode => n.kind === 'person');
  
  // Group nodes by primary dimension
  const groups = new Map<string, PersonNode[]>();
  
  personNodes.forEach((node) => {
    const key = dimension === 'brand' 
      ? (node.attributes.primaryBrand || node.attributes.brands[0] || 'unassigned')
      : dimension === 'channel'
        ? (node.attributes.primaryChannel || node.attributes.channels[0] || 'unassigned')
        : (node.attributes.primaryDepartment || node.attributes.departments[0] || 'unassigned');
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(node);
  });
  
  // Layout within each group using hierarchy
  const positions: Record<string, { x: number; y: number }> = {};
  const groupKeys = Array.from(groups.keys());
  const COLUMN_WIDTH = 800;
  
  groupKeys.forEach((groupKey, groupIndex) => {
    const groupNodes = groups.get(groupKey)!;
    const groupEdges = edges.filter((edge) => {
      const sourceInGroup = groupNodes.some((n) => n.id === edge.source);
      const targetInGroup = groupNodes.some((n) => n.id === edge.target);
      return sourceInGroup && targetInGroup;
    });
    
    const groupPositions = calculateLayout(groupNodes, groupEdges);
    
    // Offset positions for this column
    Object.keys(groupPositions).forEach((nodeId) => {
      positions[nodeId] = {
        x: groupPositions[nodeId].x + groupIndex * COLUMN_WIDTH,
        y: groupPositions[nodeId].y,
      };
    });
  });
  
  return positions;
};

export const calculateSwimLaneLayout = (
  nodes: GraphNode[],
  edges: GraphEdge[],
  rowDimension: 'department' | 'brand',
  colDimension: 'brand' | 'channel',
): Record<string, { x: number; y: number }> => {
  const personNodes = nodes.filter((n): n is PersonNode => n.kind === 'person');
  
  // Group by row dimension
  const rows = new Map<string, PersonNode[]>();
  personNodes.forEach((node) => {
    const rowKey = rowDimension === 'department'
      ? (node.attributes.primaryDepartment || node.attributes.departments[0] || 'unassigned')
      : (node.attributes.primaryBrand || node.attributes.brands[0] || 'unassigned');
    
    if (!rows.has(rowKey)) {
      rows.set(rowKey, []);
    }
    rows.get(rowKey)!.push(node);
  });
  
  // Group each row by column dimension
  const positions: Record<string, { x: number; y: number }> = {};
  const rowKeys = Array.from(rows.keys());
  const ROW_HEIGHT = 500;
  const COLUMN_WIDTH = 650;
  
  rowKeys.forEach((rowKey, rowIndex) => {
    const rowNodes = rows.get(rowKey)!;
    const columns = new Map<string, PersonNode[]>();
    
    rowNodes.forEach((node) => {
      const colKey = colDimension === 'brand'
        ? (node.attributes.primaryBrand || node.attributes.brands[0] || 'unassigned')
        : (node.attributes.primaryChannel || node.attributes.channels[0] || 'unassigned');
      
      if (!columns.has(colKey)) {
        columns.set(colKey, []);
      }
      columns.get(colKey)!.push(node);
    });
    
    const colKeys = Array.from(columns.keys());
    colKeys.forEach((colKey, colIndex) => {
      const colNodes = columns.get(colKey)!;
      colNodes.forEach((node, nodeIndex) => {
        positions[node.id] = {
          x: colIndex * COLUMN_WIDTH + 250,
          y: rowIndex * ROW_HEIGHT + nodeIndex * 220 + 150,
        };
      });
    });
  });
  
  return positions;
};

export const calculateClusterLayout = (
  nodes: GraphNode[],
  edges: GraphEdge[],
): Record<string, { x: number; y: number }> => {
  const personNodes = nodes.filter((n): n is PersonNode => n.kind === 'person');
  
  // Create clusters based on dimension combinations
  const clusters = new Map<string, PersonNode[]>();
  
  personNodes.forEach((node) => {
    // Create cluster key from all assignments
    const brandKey = node.attributes.brands.length > 0 
      ? node.attributes.brands.sort().join('+') 
      : 'no-brand';
    const channelKey = node.attributes.channels.length > 0 
      ? node.attributes.channels.sort().join('+') 
      : 'no-channel';
    const deptKey = node.attributes.departments.length > 0 
      ? node.attributes.departments.sort().join('+') 
      : 'no-dept';
    
    const clusterKey = `${brandKey}|${channelKey}|${deptKey}`;
    
    if (!clusters.has(clusterKey)) {
      clusters.set(clusterKey, []);
    }
    clusters.get(clusterKey)!.push(node);
  });
  
  // Layout clusters in a grid
  const positions: Record<string, { x: number; y: number }> = {};
  const clusterKeys = Array.from(clusters.keys());
  const CLUSTER_WIDTH = 700;
  const CLUSTER_HEIGHT = 550;
  const clustersPerRow = Math.ceil(Math.sqrt(clusterKeys.length));
  
  clusterKeys.forEach((clusterKey, clusterIndex) => {
    const clusterNodes = clusters.get(clusterKey)!;
    const row = Math.floor(clusterIndex / clustersPerRow);
    const col = clusterIndex % clustersPerRow;
    
    // Layout nodes within cluster using hierarchy
    const clusterEdges = edges.filter((edge) => {
      const sourceInCluster = clusterNodes.some((n) => n.id === edge.source);
      const targetInCluster = clusterNodes.some((n) => n.id === edge.target);
      return sourceInCluster && targetInCluster;
    });
    
    const clusterPositions = calculateLayout(clusterNodes, clusterEdges);
    
    // Offset positions for this cluster
    Object.keys(clusterPositions).forEach((nodeId) => {
      positions[nodeId] = {
        x: clusterPositions[nodeId].x + col * CLUSTER_WIDTH + 300,
        y: clusterPositions[nodeId].y + row * CLUSTER_HEIGHT + 300,
      };
    });
  });
  
  return positions;
};

/**
 * Enhanced cleanup layout that optimizes spacing, alignment, and overall aesthetics.
 * Similar to macOS desktop cleanup - reorganizes nodes for a clean, elegant appearance.
 * 
 * @param mode - "compact" fits as much as possible on screen (may overlap), "spacious" ensures no overlap (requires more space)
 */
export const calculateCleanupLayout = (
  nodes: GraphNode[],
  edges: GraphEdge[],
  existingPositions?: Record<string, { x: number; y: number }>,
  mode: "compact" | "spacious" = "spacious",
): Record<string, { x: number; y: number }> => {
  const personNodes = nodes.filter((n): n is PersonNode => n.kind === 'person');
  
  if (personNodes.length === 0) {
    return {};
  }

  // Spacing constants based on mode
  const CLEANUP_NODE_SEPARATION = mode === "compact" ? 180 : 280; // Compact: tighter spacing (may overlap), Spacious: crisp spacing with no overlap
  const CLEANUP_RANK_SEPARATION = mode === "compact" ? 220 : 350; // Compact: tighter vertical spacing, Spacious: clean vertical space
  const CLEANUP_MARGIN_X = mode === "compact" ? 120 : 180;
  const CLEANUP_MARGIN_Y = mode === "compact" ? 120 : 180;

  // Build hierarchy using dagre with enhanced spacing
  const g = new graphlib.Graph({ directed: true, compound: false, multigraph: false });
  g.setGraph({
    rankdir: "TB",
    nodesep: CLEANUP_NODE_SEPARATION,
    ranksep: CLEANUP_RANK_SEPARATION,
    marginx: CLEANUP_MARGIN_X,
    marginy: CLEANUP_MARGIN_Y,
    // Additional dagre options for better layout
    acyclicer: "greedy",
    ranker: "tight-tree", // Better for hierarchical structures
  });
  g.setDefaultEdgeLabel(() => ({}));

  personNodes.forEach((node) => {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  // Only use manager edges for hierarchy layout
  const managerEdges = edges.filter(isManagerEdge);
  managerEdges.forEach((edge) => {
    if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  });

  // Run dagre layout
  dagreLayout(g);

  // Extract positions
  const positions: Record<string, { x: number; y: number }> = {};
  g.nodes().forEach((id) => {
    const node = g.node(id);
    positions[id] = {
      x: (node?.x ?? 0) - NODE_WIDTH / 2,
      y: (node?.y ?? 0) - NODE_HEIGHT / 2,
    };
  });

  // Post-processing: Align nodes at the same rank level
  const rankMap = new Map<number, string[]>();
  g.nodes().forEach((id) => {
    const node = g.node(id);
    const rank = node?.y ?? 0;
    const roundedRank = Math.round(rank / CLEANUP_RANK_SEPARATION) * CLEANUP_RANK_SEPARATION;
    
    if (!rankMap.has(roundedRank)) {
      rankMap.set(roundedRank, []);
    }
    rankMap.get(roundedRank)!.push(id);
  });

  // Align nodes horizontally within each rank
  rankMap.forEach((nodeIds, rank) => {
    if (nodeIds.length <= 1) return;
    
    // Sort nodes by current x position
    nodeIds.sort((a, b) => positions[a].x - positions[b].x);
    
    // Calculate total width needed
    const totalWidth = (nodeIds.length - 1) * CLEANUP_NODE_SEPARATION;
    const startX = positions[nodeIds[0]].x - totalWidth / 2;
    
    // Reassign positions with even spacing
    nodeIds.forEach((nodeId, index) => {
      positions[nodeId].x = startX + index * CLEANUP_NODE_SEPARATION;
    });
  });

  // Center the entire layout
  if (Object.keys(positions).length > 0) {
    const allX = Object.values(positions).map(p => p.x);
    const allY = Object.values(positions).map(p => p.y);
    const minX = Math.min(...allX);
    const maxX = Math.max(...allX);
    const minY = Math.min(...allY);
    const maxY = Math.max(...allY);
    
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    // Shift to center around origin (0,0) or keep relative positioning
    const offsetX = -centerX;
    const offsetY = -centerY;
    
    Object.keys(positions).forEach((nodeId) => {
      positions[nodeId].x += offsetX;
      positions[nodeId].y += offsetY;
    });
  }

  return positions;
};
