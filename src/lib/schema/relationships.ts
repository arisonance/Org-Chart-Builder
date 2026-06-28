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

export const RELATIONSHIP_DEFINITIONS: Record<RelationshipType, RelationshipDefinition> = {
  manager: {
    label: "Reports to",
    shortLabel: "Reports",
    description: "Formal manager relationship. This is the only relationship that changes the org chart hierarchy.",
    layer: "reporting",
    edgeStyle: "manager",
    defaultLabel: (sourceName, targetName) => `${targetName} reports to ${sourceName}`,
  },
  dedicated: {
    label: "Dedicated to",
    shortLabel: "Dedicated",
    description: "Support truth: this person or team is dedicated to an area, without changing their manager.",
    layer: "support",
    edgeStyle: "support",
    defaultLabel: (sourceName, targetName) => `${targetName} is dedicated to ${sourceName}`,
  },
  support: {
    label: "Supports",
    shortLabel: "Supports",
    description: "Support truth: this person or team supports an area, without changing their manager.",
    layer: "support",
    edgeStyle: "support",
    defaultLabel: (sourceName, targetName) => `${sourceName} supports ${targetName}`,
  },
  "shared-service": {
    label: "Shared service",
    shortLabel: "Shared svc",
    description: "Support truth: a shared-service pod supports this area, without implying reporting.",
    layer: "support",
    edgeStyle: "support",
    defaultLabel: (sourceName, targetName) => `${sourceName} is a shared service for ${targetName}`,
  },
  dotted: {
    label: "Dotted line",
    shortLabel: "Dotted",
    description: "Matrix relationship or advisory line. It is not a formal manager line.",
    layer: "support",
    edgeStyle: "dotted",
    defaultLabel: (sourceName, targetName) => `${sourceName} has a dotted-line relationship with ${targetName}`,
  },
  sponsor: {
    label: "Supports",
    shortLabel: "Supports",
    description: "Legacy support relationship. Treat this as support truth, not reporting truth.",
    layer: "support",
    edgeStyle: "support",
    defaultLabel: (sourceName, targetName) => `${sourceName} supports ${targetName}`,
  },
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
