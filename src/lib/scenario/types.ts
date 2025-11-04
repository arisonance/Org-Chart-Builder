import type { GraphDocument, GraphEdge, GraphNode } from "../schema/types";

export type DiffType = "added" | "removed" | "modified" | "unchanged";

export type Scenario = {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  baseScenarioId?: string;
  notes?: string;
  tags?: string[];
  document: GraphDocument;
};

export type ScenarioMetadata = {
  comparisonNotes?: string;
  impactAnalysis?: string[];
  checklist?: Array<{ item: string; completed: boolean }>;
  author?: string;
};

export type NodeDiff = {
  type: DiffType;
  node: GraphNode;
  originalNode?: GraphNode;
  changes?: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
};

export type EdgeDiff = {
  type: DiffType;
  edge: GraphEdge;
  originalEdge?: GraphEdge;
  changes?: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
};

export type ScenarioDiff = {
  nodes: NodeDiff[];
  edges: EdgeDiff[];
  summary: {
    nodesAdded: number;
    nodesRemoved: number;
    nodesModified: number;
    edgesAdded: number;
    edgesRemoved: number;
    edgesModified: number;
  };
};

export type ScenarioComparison = {
  baseScenario: Scenario;
  targetScenario: Scenario;
  diff: ScenarioDiff;
  affectedNodeIds: string[];
  affectedEdgeIds: string[];
};

export type ChangeCategory = {
  type: "people" | "relationships" | "attributes";
  changes: Array<{
    description: string;
    nodeIds: string[];
    edgeIds: string[];
    severity: "low" | "medium" | "high";
  }>;
};

