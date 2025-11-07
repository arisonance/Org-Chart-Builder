import type { LensId } from "./lenses";

export const SCHEMA_VERSION = "2024.10.01";

export type RelationshipType = "manager" | "sponsor" | "dotted" | "group";

export type NodeKind = "person" | "group";

export type NodeRoleTier = "ic" | "manager" | "director" | "vp" | "c-suite";

export type XY = {
  x: number;
  y: number;
};

export type Viewport = {
  x: number;
  y: number;
  zoom: number;
};

export type PersonAttributes = {
  title: string;
  departments: string[];
  primaryDepartment?: string;
  brands: string[];
  primaryBrand?: string;
  channels: string[];
  primaryChannel?: string;
  tags: string[];
  location?: string;
  costCenter?: string;
  notes?: string;
  tier?: NodeRoleTier;
};

export type BaseNode = {
  id: string;
  kind: NodeKind;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type PersonNode = BaseNode & {
  kind: "person";
  attributes: PersonAttributes;
  locked?: boolean;
};

export type GroupNode = BaseNode & {
  kind: "group";
  color?: string;
  collapsed?: boolean;
  memberIds: string[];
};

export type GraphNode = PersonNode | GroupNode;

export type RelationshipMetadata = {
  type: RelationshipType;
  weight?: number;
  label?: string;
  lenses?: LensId[];
  colorToken?: string;
  ghost?: boolean;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  metadata: RelationshipMetadata;
  createdAt: string;
  updatedAt: string;
};

export type LayoutState = {
  id: LensId;
  positions: Record<string, XY>;
  viewport: Viewport;
  snapToGrid: boolean;
  showGrid: boolean;
  lastUpdated: string;
};

export type LensFilterState = {
  activeTokens: string[];
  focusIds: string[];
  hiddenIds: string[];
};

export type LensState = {
  layout: LayoutState;
  filters: LensFilterState;
};

export type GraphDocumentMetadata = {
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  author?: string;
};

export type GraphDocument = {
  schema_version: string;
  metadata: GraphDocumentMetadata;
  nodes: GraphNode[];
  edges: GraphEdge[];
  lens: LensId;
  lens_state: Record<LensId, LensState>;
};

export type SelectionState = {
  nodeIds: string[];
  edgeIds: string[];
};

export type ClipboardPayload = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export type GraphSnapshot = {
  document: GraphDocument;
  selection: SelectionState;
};

export type PinView = {
  id: string;
  name: string;
  lens: LensId;
  positions: Record<string, XY>;
  viewport: Viewport;
  createdAt: string;
};

export type ImportResult =
  | { ok: true; document: GraphDocument }
  | { ok: false; errors: string[] };
