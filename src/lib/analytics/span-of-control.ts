import type { GraphEdge, GraphNode, PersonNode } from "../schema/types";

export type SpanMetrics = {
  nodeId: string;
  directReports: number;
  totalTeamSize: number;
  depth: number;
  status: "healthy" | "high" | "critical" | "none";
};

export type SpanThresholds = {
  healthy: number; // e.g., 6-8 direct reports
  high: number; // e.g., 9-10
  critical: number; // e.g., 11+
};

export const DEFAULT_THRESHOLDS: SpanThresholds = {
  healthy: 8,
  high: 10,
  critical: 12,
};

/**
 * Calculate direct reports for a given manager
 */
export function getDirectReports(managerId: string, edges: GraphEdge[]): string[] {
  return edges
    .filter((edge) => edge.metadata.type === "manager" && edge.source === managerId)
    .map((edge) => edge.target);
}

/**
 * Calculate total team size recursively (all reports down the chain)
 */
export function getTotalTeamSize(
  managerId: string,
  edges: GraphEdge[],
  visited = new Set<string>(),
): number {
  if (visited.has(managerId)) return 0;
  visited.add(managerId);

  const directReports = getDirectReports(managerId, edges);
  let total = directReports.length;

  for (const reportId of directReports) {
    total += getTotalTeamSize(reportId, edges, visited);
  }

  return total;
}

/**
 * Calculate organizational depth (max levels to ICs)
 */
export function getOrganizationalDepth(
  managerId: string,
  edges: GraphEdge[],
  currentDepth = 0,
): number {
  const directReports = getDirectReports(managerId, edges);

  if (directReports.length === 0) {
    return currentDepth;
  }

  const depths = directReports.map((reportId) =>
    getOrganizationalDepth(reportId, edges, currentDepth + 1),
  );

  return Math.max(...depths);
}

/**
 * Calculate span of control status based on thresholds
 */
export function getSpanStatus(
  directReports: number,
  thresholds: SpanThresholds = DEFAULT_THRESHOLDS,
): SpanMetrics["status"] {
  if (directReports === 0) return "none";
  if (directReports <= thresholds.healthy) return "healthy";
  if (directReports <= thresholds.high) return "high";
  return "critical";
}

/**
 * Calculate span metrics for specific nodes (optimized version)
 */
export function calculateSpanMetricsForNodes(
  nodeIds: string[],
  edges: GraphEdge[],
  thresholds: SpanThresholds = DEFAULT_THRESHOLDS,
): SpanMetrics[] {
  const nodeIdSet = new Set(nodeIds);
  
  return nodeIds.map((nodeId) => {
    const directReports = getDirectReports(nodeId, edges);
    const totalTeamSize = getTotalTeamSize(nodeId, edges);
    const depth = getOrganizationalDepth(nodeId, edges);
    const status = getSpanStatus(directReports.length, thresholds);

    return {
      nodeId,
      directReports: directReports.length,
      totalTeamSize,
      depth,
      status,
    };
  });
}

/**
 * Calculate span metrics for all managers
 */
export function calculateSpanMetrics(
  nodes: GraphNode[],
  edges: GraphEdge[],
  thresholds: SpanThresholds = DEFAULT_THRESHOLDS,
): SpanMetrics[] {
  const personNodes = nodes.filter((n): n is PersonNode => n.kind === "person");

  return personNodes.map((node) => {
    const directReports = getDirectReports(node.id, edges);
    const totalTeamSize = getTotalTeamSize(node.id, edges);
    const depth = getOrganizationalDepth(node.id, edges);
    const status = getSpanStatus(directReports.length, thresholds);

    return {
      nodeId: node.id,
      directReports: directReports.length,
      totalTeamSize,
      depth,
      status,
    };
  });
}

/**
 * Get leaders exceeding span thresholds
 */
export function getLeadersOverThreshold(
  metrics: SpanMetrics[],
  threshold: "high" | "critical",
): SpanMetrics[] {
  const filtered = metrics.filter((m) => {
    if (threshold === "critical") {
      return m.status === "critical";
    }
    return m.status === "critical" || m.status === "high";
  });

  return filtered.sort((a, b) => b.directReports - a.directReports);
}

/**
 * Calculate average span of control across all managers
 */
export function getAverageSpan(metrics: SpanMetrics[]): number {
  const managersWithReports = metrics.filter((m) => m.directReports > 0);

  if (managersWithReports.length === 0) return 0;

  const sum = managersWithReports.reduce((acc, m) => acc + m.directReports, 0);
  return sum / managersWithReports.length;
}

/**
 * Get distribution of span sizes
 */
export function getSpanDistribution(metrics: SpanMetrics[]): Record<string, number> {
  const distribution: Record<string, number> = {
    "0": 0,
    "1-3": 0,
    "4-6": 0,
    "7-9": 0,
    "10-12": 0,
    "13+": 0,
  };

  metrics.forEach((m) => {
    const span = m.directReports;
    if (span === 0) distribution["0"]++;
    else if (span <= 3) distribution["1-3"]++;
    else if (span <= 6) distribution["4-6"]++;
    else if (span <= 9) distribution["7-9"]++;
    else if (span <= 12) distribution["10-12"]++;
    else distribution["13+"]++;
  });

  return distribution;
}

