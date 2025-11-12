import cloneDeep from "lodash.clonedeep";
import { z } from "zod";
import { createLensState, createLayoutState } from "./defaults";
import type {
  GraphDocument,
  GraphDocumentMetadata,
  GraphEdge,
  GraphNode,
  LensFilterState,
  LensState,
  LayoutState,
  NodeRoleTier,
  PersonAttributes,
  RelationshipMetadata,
  RelationshipType,
  Viewport,
  XY,
} from "./types";
import { LENSES, type LensId } from "./lenses";
import { SCHEMA_VERSION } from "./types";

const now = () => new Date().toISOString();

const lensIdValues = LENSES.map((lens) => lens.id);

const lensIdSchema = z.enum(lensIdValues as [LensId, ...LensId[]]);

const viewportSchema: z.ZodType<Viewport> = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number(),
});

const xySchema: z.ZodType<XY> = z.object({
  x: z.number(),
  y: z.number(),
});

const nodeRoleTierSchema: z.ZodType<NodeRoleTier> = z.enum([
  "ic",
  "manager",
  "director",
  "vp",
  "c-suite",
]);

const personAttributesSchema: z.ZodType<PersonAttributes> = z.object({
  title: z.string(),
  departments: z.array(z.string()),
  primaryDepartment: z.string().optional(),
  brands: z.array(z.string()),
  primaryBrand: z.string().optional(),
  channels: z.array(z.string()),
  primaryChannel: z.string().optional(),
  tags: z.array(z.string()),
  location: z.string().optional(),
  costCenter: z.string().optional(),
  notes: z.string().optional(),
  jobDescription: z.string().optional(),
  tier: nodeRoleTierSchema.optional(),
});

const baseNodeSchema = z.object({
  id: z.string(),
  kind: z.literal("person").or(z.literal("group")),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const personNodeSchema = baseNodeSchema.extend({
  kind: z.literal("person"),
  attributes: personAttributesSchema,
  locked: z.boolean().optional(),
});

const groupNodeSchema = baseNodeSchema.extend({
  kind: z.literal("group"),
  color: z.string().optional(),
  collapsed: z.boolean().optional(),
  memberIds: z.array(z.string()),
});

const graphNodeSchema: z.ZodType<GraphNode> = z.union([personNodeSchema, groupNodeSchema]);

const relationshipTypeSchema: z.ZodType<RelationshipType> = z.enum([
  "manager",
  "sponsor",
  "dotted",
  "group",
]);

const relationshipMetadataSchema: z.ZodType<RelationshipMetadata> = z.object({
  type: relationshipTypeSchema,
  weight: z.number().optional(),
  label: z.string().optional(),
  lenses: z.array(lensIdSchema).optional(),
  colorToken: z.string().optional(),
  ghost: z.boolean().optional(),
});

const graphEdgeSchema: z.ZodType<GraphEdge> = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  metadata: relationshipMetadataSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

const layoutStateSchema: z.ZodType<LayoutState> = z.object({
  id: lensIdSchema,
  positions: z.record(z.string(), xySchema),
  viewport: viewportSchema,
  snapToGrid: z.boolean(),
  showGrid: z.boolean(),
  lastUpdated: z.string(),
});

const lensFilterStateSchema: z.ZodType<LensFilterState> = z.object({
  activeTokens: z.array(z.string()),
  focusIds: z.array(z.string()),
  hiddenIds: z.array(z.string()),
});

const lensStateSchema: z.ZodType<LensState> = z.object({
  layout: layoutStateSchema,
  filters: lensFilterStateSchema,
});

const graphDocumentMetadataSchema: z.ZodType<GraphDocumentMetadata> = z.object({
  name: z.string().min(1, "Organization name cannot be empty"),
  description: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  author: z.string().optional(),
});

const graphDocumentSchemaInternal = z.object({
  schema_version: z.literal(SCHEMA_VERSION),
  metadata: graphDocumentMetadataSchema,
  nodes: z.array(graphNodeSchema),
  edges: z.array(graphEdgeSchema),
  lens: lensIdSchema,
  lens_state: z.record(z.string(), lensStateSchema),
});

export const graphDocumentSchema = graphDocumentSchemaInternal.superRefine((doc, ctx) => {
  const nodeIds = new Set<string>();
  doc.nodes.forEach((node) => {
    if (nodeIds.has(node.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["nodes"],
        message: `Duplicate node id detected: ${node.id}`,
      });
    }
    nodeIds.add(node.id);
  });

  const edgeIds = new Set<string>();
  doc.edges.forEach((edge) => {
    if (edgeIds.has(edge.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["edges"],
        message: `Duplicate edge id detected: ${edge.id}`,
      });
    }
    edgeIds.add(edge.id);

    if (!nodeIds.has(edge.source)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["edges"],
        message: `Edge ${edge.id} references missing source node ${edge.source}`,
      });
    }
    if (!nodeIds.has(edge.target)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["edges"],
        message: `Edge ${edge.id} references missing target node ${edge.target}`,
      });
    }
  });
});

type ParsedGraphDocument = z.infer<typeof graphDocumentSchemaInternal>;

const ensureLensStateDefaults = (doc: ParsedGraphDocument) => {
  const existingLensState = doc.lens_state;

  LENSES.forEach((lens) => {
    const current = existingLensState[lens.id];
    if (!current) {
      existingLensState[lens.id] = createLensState(lens.id);
      return;
    }

    if (!current.layout) {
      current.layout = createLayoutState(lens.id);
    } else {
      current.layout.positions = current.layout.positions ?? {};
      current.layout.viewport = current.layout.viewport ?? createLayoutState(lens.id).viewport;
      current.layout.snapToGrid =
        typeof current.layout.snapToGrid === "boolean" ? current.layout.snapToGrid : false;
      current.layout.showGrid =
        typeof current.layout.showGrid === "boolean" ? current.layout.showGrid : true;
      current.layout.lastUpdated = current.layout.lastUpdated ?? now();
    }

    if (!current.filters) {
      current.filters = createLensState(lens.id).filters;
    } else {
      current.filters.activeTokens = current.filters.activeTokens ?? [];
      current.filters.focusIds = current.filters.focusIds ?? [];
      current.filters.hiddenIds = current.filters.hiddenIds ?? [];
    }
  });

  if (!existingLensState[doc.lens]) {
    existingLensState[doc.lens] = createLensState(doc.lens);
  }
};

const sanitizeGraphDocument = (doc: ParsedGraphDocument): GraphDocument => {
  const sanitized = cloneDeep(doc);

  ensureLensStateDefaults(sanitized);

  sanitized.metadata.name = sanitized.metadata.name.trim() || "Imported Organization";
  sanitized.metadata.updatedAt = now();

  sanitized.nodes.forEach((node) => {
    node.updatedAt = node.updatedAt || now();
    if (node.kind === "person") {
      node.attributes.tags = node.attributes.tags ?? [];
    }
    if (node.kind === "group") {
      node.memberIds = node.memberIds ?? [];
    }
  });

  sanitized.edges.forEach((edge) => {
    edge.updatedAt = edge.updatedAt || now();
    const lenses = edge.metadata.lenses;
    if (lenses) {
      edge.metadata.lenses = lenses.filter((lens) => lensIdValues.includes(lens));
    }
  });

  return sanitized as GraphDocument;
};

export const parseGraphDocument = (input: unknown): GraphDocument => {
  const parsed = graphDocumentSchema.parse(input);
  return sanitizeGraphDocument(parsed);
};
