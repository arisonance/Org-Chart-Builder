import { describe, it, expect } from "vitest";
import {
  computeScenarioDiff,
  getAffectedNodes,
  getAffectedEdges,
  categorizeChanges,
  getChangeDescription,
} from "@/lib/scenario/diff";
import type { GraphDocument } from "@/lib/schema/types";
import { createEmptyGraphDocument } from "@/lib/schema/defaults";
import { makePerson, makeEdge } from "../../fixtures";

const docWith = (
  nodes: GraphDocument["nodes"],
  edges: GraphDocument["edges"] = [],
): GraphDocument => ({
  ...createEmptyGraphDocument(),
  nodes,
  edges,
});

describe("computeScenarioDiff - nodes", () => {
  it("detects added, removed, modified and unchanged nodes", () => {
    const base = docWith([
      makePerson("keep", { name: "Keep", title: "Eng" }),
      makePerson("gone", { name: "Gone" }),
      makePerson("edit", { name: "Edit", title: "Old" }),
    ]);
    const target = docWith([
      makePerson("keep", { name: "Keep", title: "Eng" }),
      makePerson("edit", { name: "Edit", title: "New" }),
      makePerson("fresh", { name: "Fresh" }),
    ]);

    const diff = computeScenarioDiff(base, target);
    expect(diff.summary).toMatchObject({
      nodesAdded: 1,
      nodesRemoved: 1,
      nodesModified: 1,
    });

    const byType = Object.fromEntries(
      diff.nodes.map((d) => [d.node.id, d.type]),
    );
    expect(byType).toMatchObject({
      keep: "unchanged",
      fresh: "added",
      gone: "removed",
      edit: "modified",
    });

    const modified = diff.nodes.find((d) => d.node.id === "edit");
    expect(modified?.changes).toEqual([
      { field: "title", oldValue: "Old", newValue: "New" },
    ]);
  });

  it("detects array attribute changes via deep comparison", () => {
    const base = docWith([makePerson("p", { brands: ["A"] })]);
    const target = docWith([makePerson("p", { brands: ["A", "B"] })]);
    const diff = computeScenarioDiff(base, target);
    const fields = diff.nodes[0].changes?.map((c) => c.field);
    expect(fields).toEqual(["brands"]);
  });

  it("reports no changes when documents are identical", () => {
    const doc = docWith([makePerson("p", { title: "Same" })]);
    const diff = computeScenarioDiff(doc, doc);
    expect(diff.nodes.every((d) => d.type === "unchanged")).toBe(true);
    expect(diff.summary.nodesModified).toBe(0);
  });
});

describe("computeScenarioDiff - edges", () => {
  it("detects added, removed and modified edges", () => {
    const base = docWith(
      [makePerson("a"), makePerson("b"), makePerson("c")],
      [makeEdge("e1", "a", "b"), makeEdge("e2", "a", "c")],
    );
    const target = docWith(
      [makePerson("a"), makePerson("b"), makePerson("c")],
      [makeEdge("e1", "a", "c"), makeEdge("e3", "b", "c")],
    );
    const diff = computeScenarioDiff(base, target);
    expect(diff.summary).toMatchObject({
      edgesAdded: 1,
      edgesRemoved: 1,
      edgesModified: 1,
    });
    const modified = diff.edges.find((d) => d.edge.id === "e1");
    expect(modified?.changes?.map((c) => c.field)).toEqual(["target"]);
  });
});

describe("getAffectedNodes / getAffectedEdges", () => {
  it("collects changed nodes plus endpoints of changed edges", () => {
    const base = docWith(
      [makePerson("a"), makePerson("b")],
      [makeEdge("e1", "a", "b")],
    );
    const target = docWith(
      [makePerson("a"), makePerson("b"), makePerson("c")],
      [makeEdge("e1", "a", "b"), makeEdge("e2", "b", "c")],
    );
    const diff = computeScenarioDiff(base, target);

    const affectedNodes = getAffectedNodes(diff, target.edges);
    expect(affectedNodes.has("c")).toBe(true); // added node
    expect(affectedNodes.has("b")).toBe(true); // endpoint of added edge e2
    expect(affectedNodes.has("a")).toBe(false); // unchanged, e1 unchanged

    const affectedEdges = getAffectedEdges(diff, new Set(["c"]));
    expect(affectedEdges.has("e2")).toBe(true);
  });
});

describe("categorizeChanges", () => {
  it("groups changes into people, relationships and attributes", () => {
    const base = docWith(
      [makePerson("a", { title: "Old" }), makePerson("b")],
      [makeEdge("e1", "a", "b")],
    );
    const target = docWith(
      [makePerson("a", { title: "New" }), makePerson("c")],
      [makeEdge("e2", "a", "c")],
    );
    const diff = computeScenarioDiff(base, target);
    const categories = categorizeChanges(diff);
    const types = categories.map((c) => c.type);
    expect(types).toContain("people");
    expect(types).toContain("relationships");
    expect(types).toContain("attributes");

    const relationships = categories.find((c) => c.type === "relationships");
    // Manager relationships are high severity.
    expect(relationships?.changes.every((c) => c.severity === "high")).toBe(true);
  });
});

describe("getChangeDescription", () => {
  it("describes added, removed and modified nodes", () => {
    expect(
      getChangeDescription({ type: "added", node: makePerson("a") }),
    ).toBe("Added to organization");
    expect(
      getChangeDescription({ type: "removed", node: makePerson("a") }),
    ).toBe("Removed from organization");
    expect(
      getChangeDescription({
        type: "modified",
        node: makePerson("a"),
        changes: [{ field: "title", oldValue: "X", newValue: "Y" }],
      }),
    ).toBe("title: X → Y");
  });
});
