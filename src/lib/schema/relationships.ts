import type { RelationshipType } from "@/lib/schema/types";

export type RelationshipTruthLayer = "reporting" | "support" | "container";

export type RelationshipDefinition = {
  label: string;
  shortLabel: string;
  description: string;
  layer: RelationshipTruthLayer;
  edgeStyle: "manager" | "support" | "dotted";
  defaultLabel: (sourceName: string, targetName: string) => string;
};

// Two people-relationship concepts only: reporting, and supports. Legacy
// type values (dedicated / shared-service / dotted / sponsor) all read as
// "Supports" — they're normalized to "support" on load, but any stragglers
// still render with the same language and style.
const SUPPORT_DEFINITION: RelationshipDefinition = {
  label: "Supports",
  shortLabel: "Supports",
  description:
    "Works with an area or team without reporting to it. Add a label for specifics.",
  layer: "support",
  edgeStyle: "support",
  defaultLabel: (sourceName, targetName) => `${sourceName} supports ${targetName}`,
};

export const RELATIONSHIP_DEFINITIONS: Record<RelationshipType, RelationshipDefinition> = {
  manager: {
    label: "Reports to",
    shortLabel: "Reports",
    description: "Formal manager relationship. This is the only relationship that changes the org chart hierarchy.",
    layer: "reporting",
    edgeStyle: "manager",
    defaultLabel: (sourceName, targetName) => `${targetName} reports to ${sourceName}`,
  },
  support: SUPPORT_DEFINITION,
  dedicated: SUPPORT_DEFINITION,
  "shared-service": SUPPORT_DEFINITION,
  dotted: SUPPORT_DEFINITION,
  sponsor: SUPPORT_DEFINITION,
  group: {
    label: "Group membership",
    shortLabel: "Group",
    description: "Container membership used for grouping, not a people relationship.",
    layer: "container",
    edgeStyle: "support",
    defaultLabel: (sourceName, targetName) => `${targetName} belongs to ${sourceName}`,
  },
};

export const getRelationshipDefinition = (type: RelationshipType): RelationshipDefinition =>
  RELATIONSHIP_DEFINITIONS[type] ?? RELATIONSHIP_DEFINITIONS.support;

export const isReportingRelationship = (type: RelationshipType) =>
  getRelationshipDefinition(type).layer === "reporting";

export const isSupportRelationship = (type: RelationshipType) =>
  getRelationshipDefinition(type).layer === "support";

export const relationshipLabel = (
  type: RelationshipType,
  sourceName: string,
  targetName: string,
  explicitLabel?: string,
) => explicitLabel ?? getRelationshipDefinition(type).defaultLabel(sourceName, targetName);
