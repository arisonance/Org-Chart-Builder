import { describe, expect, it } from "vitest";
import { normalizeRelationshipType } from "@/lib/schema/types";
import { parseGraphDocument } from "@/lib/schema/validation";
import { getRelationshipDefinition } from "@/lib/schema/relationships";
import { createEmptyGraphDocument } from "@/lib/schema/defaults";
import { useGraphStore } from "@/store/graph-store";

describe("two-type relationship model", () => {
  it("normalizes every legacy support flavor to 'support'", () => {
    expect(normalizeRelationshipType("manager")).toBe("manager");
    expect(normalizeRelationshipType("group")).toBe("group");
    expect(normalizeRelationshipType("support")).toBe("support");
    expect(normalizeRelationshipType("dedicated")).toBe("support");
    expect(normalizeRelationshipType("shared-service")).toBe("support");
    expect(normalizeRelationshipType("dotted")).toBe("support");
    expect(normalizeRelationshipType("sponsor")).toBe("support");
  });

  it("migrates legacy edge types when parsing a document", () => {
    const doc = createEmptyGraphDocument();
    doc.nodes.push(
      {
        id: "a",
        kind: "person",
        name: "A",
        attributes: { title: "T", brands: [], channels: [], departments: [], tags: [] },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "b",
        kind: "person",
        name: "B",
        attributes: { title: "T", brands: [], channels: [], departments: [], tags: [] },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    );
    doc.edges.push(
      {
        id: "e1",
        source: "a",
        target: "b",
        metadata: { type: "dotted" },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "e2",
        source: "b",
        target: "a",
        metadata: { type: "dedicated" },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    );
    const parsed = parseGraphDocument(JSON.parse(JSON.stringify(doc)));
    expect(parsed.edges.map((edge) => edge.metadata.type)).toEqual(["support", "support"]);
  });

  it("writes canonical types even when callers pass legacy ones", () => {
    const store = useGraphStore.getState();
    const nodes = useGraphStore.getState().document.nodes.filter((n) => n.kind === "person");
    const [a, b] = nodes;
    const edgeId = store.addRelationship(a.id, b.id, "dotted");
    expect(edgeId).toBeTruthy();
    const edge = useGraphStore.getState().document.edges.find((item) => item.id === edgeId);
    expect(edge?.metadata.type).toBe("support");
    if (edgeId) store.removeRelationship(edgeId);
  });

  it("presents every support flavor with the same language", () => {
    for (const type of ["support", "dedicated", "shared-service", "dotted", "sponsor"] as const) {
      const def = getRelationshipDefinition(type);
      expect(def.label).toBe("Supports");
      expect(def.layer).toBe("support");
    }
  });
});
