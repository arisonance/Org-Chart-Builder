import { graphlib, layout as dagreLayout } from "@dagrejs/dagre";
import type { GraphDocument, GraphEdge, GraphNode, PersonNode } from "@/lib/schema/types";
import type { LensId } from "@/lib/schema/lenses";

export type ChildMap = Record<string, string[]>;

export const NODE_WIDTH = 260;
export const NODE_HEIGHT = 150;
// Edge-to-edge gaps between cards (dagre semantics), not center pitches
const NODE_SEPARATION = 120;
const RANK_SEPARATION = 220;
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
export type LensDimension = "brand" | "channel" | "department";

export const lensToDimension = (lens: LensId): LensDimension | null =>
  lens === "brand" || lens === "channel" || lens === "department" ? lens : null;

export const UNASSIGNED_GROUP_KEY = "Unassigned";

export const getGroupKey = (node: PersonNode, dimension: LensDimension): string => {
  if (dimension === "brand") {
    return node.attributes.primaryBrand || node.attributes.brands[0] || UNASSIGNED_GROUP_KEY;
  }
  if (dimension === "channel") {
    return node.attributes.primaryChannel || node.attributes.channels[0] || UNASSIGNED_GROUP_KEY;
  }
  return node.attributes.primaryDepartment || node.attributes.departments[0] || UNASSIGNED_GROUP_KEY;
};

export const getAssignments = (node: PersonNode, dimension: LensDimension): string[] => {
  if (dimension === "brand") return node.attributes.brands;
  if (dimension === "channel") return node.attributes.channels;
  return node.attributes.departments;
};

export const groupNodesByDimension = (
  nodes: PersonNode[],
  dimension: LensDimension,
): Map<string, PersonNode[]> => {
  const groups = new Map<string, PersonNode[]>();
  nodes.forEach((node) => {
    const key = getGroupKey(node, dimension);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(node);
  });
  return groups;
};

const sortGroupKeys = (groups: Map<string, PersonNode[]>): string[] =>
  Array.from(groups.keys()).sort((a, b) => {
    if (a === UNASSIGNED_GROUP_KEY) return 1;
    if (b === UNASSIGNED_GROUP_KEY) return -1;
    const sizeDiff = groups.get(b)!.length - groups.get(a)!.length;
    return sizeDiff !== 0 ? sizeDiff : a.localeCompare(b);
  });

/**
 * Swim-lane layout for matrix views: people are grouped into vertical lanes by
 * brand/channel/department, and the reporting hierarchy is laid out within each lane.
 * Lane widths adapt to their content so lanes never overlap.
 */
export const calculateMatrixLayout = (
  nodes: GraphNode[],
  edges: GraphEdge[],
  dimension: LensDimension,
): Record<string, { x: number; y: number }> => {
  const personNodes = nodes.filter((n): n is PersonNode => n.kind === 'person');
  const groups = groupNodesByDimension(personNodes, dimension);
  const groupKeys = sortGroupKeys(groups);

  const positions: Record<string, { x: number; y: number }> = {};
  const LANE_GAP = 360;
  let offsetX = 0;

  groupKeys.forEach((groupKey) => {
    const groupNodes = groups.get(groupKey)!;
    const groupIds = new Set(groupNodes.map((n) => n.id));
    const groupEdges = edges.filter(
      (edge) => groupIds.has(edge.source) && groupIds.has(edge.target),
    );

    const groupPositions = calculateLayout(groupNodes, groupEdges);
    const xs = Object.values(groupPositions).map((p) => p.x);
    const ys = Object.values(groupPositions).map((p) => p.y);
    if (xs.length === 0) return;
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs) + NODE_WIDTH;
    const minY = Math.min(...ys);

    Object.entries(groupPositions).forEach(([nodeId, p]) => {
      positions[nodeId] = {
        x: p.x - minX + offsetX,
        y: p.y - minY,
      };
    });

    offsetX += maxX - minX + LANE_GAP;
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
// ===== Brand × Channel grid (matrix lens) =====
export const isGridLens = (lens: LensId) => lens === "matrix";

const GRID_CELL_COLS = 4;
const GRID_GAP = 28;
const GRID_CELL_PAD = 30;
const GRID_ROW_LABEL_W = 280;
const GRID_COL_HEADER_H = 140;
const GRID_ROW_GAP = 56;
const GRID_COL_GAP = 48;
const GRID_CARD_W = NODE_WIDTH + GRID_GAP;
const GRID_CARD_H = NODE_HEIGHT + GRID_GAP;
const GRID_CELL_W = GRID_CELL_COLS * GRID_CARD_W + 2 * GRID_CELL_PAD;

export const GRID_ROW_LABEL_WIDTH = GRID_ROW_LABEL_W;
export const GRID_COL_HEADER_HEIGHT = GRID_COL_HEADER_H;

const gridRowKey = (p: PersonNode) =>
  p.attributes.primaryBrand || p.attributes.brands[0] || UNASSIGNED_GROUP_KEY;
const gridColKey = (p: PersonNode) =>
  p.attributes.primaryChannel || p.attributes.channels[0] || UNASSIGNED_GROUP_KEY;
const isSharedGridKey = (k: string) => k.startsWith("All ") || k === UNASSIGNED_GROUP_KEY;

const orderGridKeys = (counts: Map<string, number>) =>
  [...counts.keys()].sort((a, b) => {
    const sa = isSharedGridKey(a);
    const sb = isSharedGridKey(b);
    if (sa !== sb) return sa ? 1 : -1; // shared/unassigned buckets last
    const diff = (counts.get(b) ?? 0) - (counts.get(a) ?? 0);
    return diff !== 0 ? diff : a.localeCompare(b);
  });

export type GridGeometry = {
  rows: Array<{ key: string; y: number; height: number; count: number }>;
  cols: Array<{ key: string; x: number; width: number; count: number }>;
  width: number;
  height: number;
};

const computeGrid = (people: PersonNode[]) => {
  const rowCounts = new Map<string, number>();
  const colCounts = new Map<string, number>();
  const cells = new Map<string, PersonNode[]>();
  people.forEach((p) => {
    const r = gridRowKey(p);
    const c = gridColKey(p);
    rowCounts.set(r, (rowCounts.get(r) ?? 0) + 1);
    colCounts.set(c, (colCounts.get(c) ?? 0) + 1);
    const k = `${r}|||${c}`;
    if (!cells.has(k)) cells.set(k, []);
    cells.get(k)!.push(p);
  });
  const rows = orderGridKeys(rowCounts);
  const cols = orderGridKeys(colCounts);

  const colX: Record<string, number> = {};
  cols.forEach((c, ci) => {
    colX[c] = GRID_ROW_LABEL_W + ci * (GRID_CELL_W + GRID_COL_GAP);
  });
  const totalWidth =
    GRID_ROW_LABEL_W + cols.length * GRID_CELL_W + Math.max(0, cols.length - 1) * GRID_COL_GAP;

  const rowHeight: Record<string, number> = {};
  rows.forEach((r) => {
    let maxH = NODE_HEIGHT + 2 * GRID_CELL_PAD;
    cols.forEach((c) => {
      const list = cells.get(`${r}|||${c}`) ?? [];
      if (list.length) {
        const innerRows = Math.ceil(list.length / GRID_CELL_COLS);
        const h = innerRows * GRID_CARD_H - GRID_GAP + 2 * GRID_CELL_PAD;
        if (h > maxH) maxH = h;
      }
    });
    rowHeight[r] = maxH;
  });
  const rowY: Record<string, number> = {};
  let y = GRID_COL_HEADER_H;
  rows.forEach((r) => {
    rowY[r] = y;
    y += rowHeight[r] + GRID_ROW_GAP;
  });

  return { rows, cols, colX, totalWidth, rowHeight, rowY, totalHeight: y, cells, rowCounts, colCounts };
};

export const calculateGridLayout = (
  nodes: GraphNode[],
): Record<string, { x: number; y: number }> => {
  const people = nodes.filter((n): n is PersonNode => n.kind === "person");
  const g = computeGrid(people);
  const positions: Record<string, { x: number; y: number }> = {};
  g.rows.forEach((r) => {
    g.cols.forEach((c) => {
      const list = g.cells.get(`${r}|||${c}`) ?? [];
      list.forEach((p, idx) => {
        const ix = idx % GRID_CELL_COLS;
        const iy = Math.floor(idx / GRID_CELL_COLS);
        positions[p.id] = {
          x: g.colX[c] + GRID_CELL_PAD + ix * GRID_CARD_W,
          y: g.rowY[r] + GRID_CELL_PAD + iy * GRID_CARD_H,
        };
      });
    });
  });
  return positions;
};

export const getGridGeometry = (nodes: GraphNode[]): GridGeometry => {
  const people = nodes.filter((n): n is PersonNode => n.kind === "person");
  const g = computeGrid(people);
  return {
    rows: g.rows.map((key) => ({
      key,
      y: g.rowY[key],
      height: g.rowHeight[key],
      count: g.rowCounts.get(key) ?? 0,
    })),
    cols: g.cols.map((key) => ({
      key,
      x: g.colX[key],
      width: GRID_CELL_W,
      count: g.colCounts.get(key) ?? 0,
    })),
    width: g.totalWidth,
    height: g.totalHeight,
  };
};

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

  // Spacing constants based on mode. Dagre's nodesep/ranksep are edge-to-edge
  // gaps between cards, so neither mode can produce overlap.
  const CLEANUP_NODE_SEPARATION = mode === "compact" ? 60 : 140;
  const CLEANUP_RANK_SEPARATION = mode === "compact" ? 140 : 240;
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

  // NOTE: deliberately no per-rank "even spacing" pass here. Re-spacing a rank
  // at a uniform pitch narrower than the card width crushed wide ranks into
  // overlapping stacks and broke dagre's parent-over-children centering.

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
