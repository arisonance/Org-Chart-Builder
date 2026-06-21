import { describe, it, expect } from "vitest";
import {
  NODE_WIDTH,
  NODE_HEIGHT,
  buildChildMap,
  collectDescendants,
  isDescendant,
  calculateLayout,
  calculateTeamTreeLayout,
  lensToDimension,
  getGroupKey,
  getAssignments,
  groupNodesByDimension,
  calculateMatrixLayout,
  calculateGridLayout,
  getGridGeometry,
  isGridLens,
  UNASSIGNED_GROUP_KEY,
  GRID_ROW_LABEL_WIDTH,
  GRID_COL_HEADER_HEIGHT,
} from "@/lib/graph/layout";
import { makePerson, makeManagerEdge, makeEdge } from "../../fixtures";

describe("constants", () => {
  it("exposes stable card dimensions", () => {
    expect(NODE_WIDTH).toBe(260);
    expect(NODE_HEIGHT).toBe(150);
  });
});

describe("buildChildMap", () => {
  it("maps managers to their direct reports, manager edges only", () => {
    const edges = [
      makeManagerEdge("a", "b"),
      makeManagerEdge("a", "c"),
      makeManagerEdge("b", "d"),
      makeEdge("dotted-1", "a", "z", "dotted"),
    ];
    expect(buildChildMap(edges)).toEqual({
      a: ["b", "c"],
      b: ["d"],
    });
  });

  it("returns an empty map when there are no manager edges", () => {
    expect(buildChildMap([makeEdge("s", "a", "b", "sponsor")])).toEqual({});
  });
});

describe("collectDescendants", () => {
  const childMap = buildChildMap([
    makeManagerEdge("a", "b"),
    makeManagerEdge("a", "c"),
    makeManagerEdge("b", "d"),
    makeManagerEdge("d", "e"),
  ]);

  it("collects the full subtree of a root, excluding the root itself", () => {
    const result = collectDescendants(childMap, ["a"]);
    expect([...result].sort()).toEqual(["b", "c", "d", "e"]);
    expect(result.has("a")).toBe(false);
  });

  it("collects from multiple roots and from leaves returns empty", () => {
    expect([...collectDescendants(childMap, ["b"]).values()].sort()).toEqual([
      "d",
      "e",
    ]);
    expect(collectDescendants(childMap, ["e"]).size).toBe(0);
  });

  it("does not loop forever on a cycle", () => {
    const cyclic = buildChildMap([
      makeManagerEdge("x", "y"),
      makeManagerEdge("y", "x"),
    ]);
    const result = collectDescendants(cyclic, ["x"]);
    expect([...result].sort()).toEqual(["x", "y"]);
  });
});

describe("isDescendant", () => {
  const childMap = buildChildMap([
    makeManagerEdge("a", "b"),
    makeManagerEdge("b", "c"),
  ]);

  it("detects transitive descendants", () => {
    expect(isDescendant(childMap, "a", "c")).toBe(true);
    expect(isDescendant(childMap, "a", "b")).toBe(true);
  });

  it("returns false for non-descendants and self", () => {
    expect(isDescendant(childMap, "b", "a")).toBe(false);
    expect(isDescendant(childMap, "a", "a")).toBe(false);
    expect(isDescendant(childMap, "c", "a")).toBe(false);
  });
});

describe("calculateLayout (dagre)", () => {
  it("positions only person nodes and centers cards on their top-left corner", () => {
    const nodes = [makePerson("root"), makePerson("child")];
    const edges = [makeManagerEdge("root", "child")];
    const positions = calculateLayout(nodes, edges);

    expect(Object.keys(positions).sort()).toEqual(["child", "root"]);
    // Child ranks below the root in a top-down layout.
    expect(positions.child.y).toBeGreaterThan(positions.root.y);
  });

  it("is deterministic for the same input", () => {
    const nodes = [makePerson("a"), makePerson("b"), makePerson("c")];
    const edges = [makeManagerEdge("a", "b"), makeManagerEdge("a", "c")];
    expect(calculateLayout(nodes, edges)).toEqual(calculateLayout(nodes, edges));
  });

  it("ignores group nodes", () => {
    const group = {
      id: "g1",
      kind: "group" as const,
      name: "Group",
      createdAt: "",
      updatedAt: "",
      memberIds: [],
    };
    const positions = calculateLayout([makePerson("p1"), group], []);
    expect(Object.keys(positions)).toEqual(["p1"]);
  });
});

describe("calculateTeamTreeLayout", () => {
  const centerX = (position: { x: number }) => position.x + NODE_WIDTH / 2;

  it("keeps each direct report's subtree in its own branch span", () => {
    const nodes = [
      makePerson("aron"),
      makePerson("chuck"),
      makePerson("ashley"),
      makePerson("courtney"),
      makePerson("kris"),
      makePerson("brit"),
      makePerson("gandolfi"),
      makePerson("meghan"),
    ];
    const edges = [
      makeManagerEdge("aron", "chuck"),
      makeManagerEdge("aron", "ashley"),
      makeManagerEdge("aron", "courtney"),
      makeManagerEdge("chuck", "kris"),
      makeManagerEdge("courtney", "brit"),
      makeManagerEdge("courtney", "gandolfi"),
      makeManagerEdge("courtney", "meghan"),
    ];

    const positions = calculateTeamTreeLayout(nodes, edges, "aron");

    expect(positions.ashley.y).toBe(positions.courtney.y);
    expect(positions.brit.y).toBeGreaterThan(positions.ashley.y);
    expect(centerX(positions.brit)).toBeGreaterThanOrEqual(
      (centerX(positions.ashley) + centerX(positions.courtney)) / 2,
    );
  });

  it("uses a compact classic org shape for a leader with two direct reports", () => {
    const nodes = [
      makePerson("nathan"),
      makePerson("brian"),
      makePerson("ryan"),
      makePerson("bryan"),
      makePerson("brandon"),
      makePerson("christian"),
      makePerson("brooks"),
      makePerson("brad"),
      makePerson("matt"),
      makePerson("justin"),
    ];
    const edges = [
      makeManagerEdge("nathan", "brian"),
      makeManagerEdge("nathan", "ryan"),
      makeManagerEdge("brian", "bryan"),
      makeManagerEdge("brian", "brandon"),
      makeManagerEdge("brian", "christian"),
      makeManagerEdge("brian", "brooks"),
      makeManagerEdge("brian", "brad"),
      makeManagerEdge("brian", "matt"),
      makeManagerEdge("ryan", "justin"),
    ];

    const positions = calculateTeamTreeLayout(nodes, edges, "nathan");

    expect(positions.brian.y).toBe(positions.ryan.y);
    expect(centerX(positions.nathan)).toBeCloseTo(
      (centerX(positions.brian) + centerX(positions.ryan)) / 2,
      0,
    );
    expect(centerX(positions.ryan) - centerX(positions.brian)).toBeLessThan(1100);
    expect(positions.bryan.y).toBeGreaterThan(positions.brian.y);
    expect(positions.justin.y).toBeGreaterThan(positions.ryan.y);
    expect(centerX(positions.justin)).toBeCloseTo(centerX(positions.ryan), 0);
  });
});

describe("lensToDimension", () => {
  it("maps dimension lenses to themselves and others to null", () => {
    expect(lensToDimension("brand")).toBe("brand");
    expect(lensToDimension("channel")).toBe("channel");
    expect(lensToDimension("department")).toBe("department");
    expect(lensToDimension("hierarchy")).toBeNull();
    expect(lensToDimension("matrix")).toBeNull();
  });
});

describe("getGroupKey / getAssignments", () => {
  it("prefers the primary value, falls back to first, then Unassigned", () => {
    const withPrimary = makePerson("p", {
      brands: ["B", "A"],
      primaryBrand: "A",
    });
    expect(getGroupKey(withPrimary, "brand")).toBe("A");

    const fallbackToFirst = makePerson("p", { channels: ["X", "Y"] });
    expect(getGroupKey(fallbackToFirst, "channel")).toBe("X");

    const unassigned = makePerson("p");
    expect(getGroupKey(unassigned, "department")).toBe(UNASSIGNED_GROUP_KEY);
  });

  it("returns the raw assignment arrays per dimension", () => {
    const person = makePerson("p", {
      brands: ["b1"],
      channels: ["c1", "c2"],
      departments: ["d1"],
    });
    expect(getAssignments(person, "brand")).toEqual(["b1"]);
    expect(getAssignments(person, "channel")).toEqual(["c1", "c2"]);
    expect(getAssignments(person, "department")).toEqual(["d1"]);
  });
});

describe("groupNodesByDimension", () => {
  it("buckets people by their group key", () => {
    const people = [
      makePerson("p1", { primaryBrand: "A", brands: ["A"] }),
      makePerson("p2", { primaryBrand: "A", brands: ["A"] }),
      makePerson("p3", { primaryBrand: "B", brands: ["B"] }),
      makePerson("p4"),
    ];
    const groups = groupNodesByDimension(people, "brand");
    expect(groups.get("A")?.map((n) => n.id)).toEqual(["p1", "p2"]);
    expect(groups.get("B")?.map((n) => n.id)).toEqual(["p3"]);
    expect(groups.get(UNASSIGNED_GROUP_KEY)?.map((n) => n.id)).toEqual(["p4"]);
  });
});

describe("calculateMatrixLayout", () => {
  it("wraps large peer ranks instead of laying a lane out as one unreadable row", () => {
    const people = Array.from({ length: 24 }, (_, index) =>
      makePerson(`p${index}`, {
        primaryDepartment: "James Manufacturing - Direct",
        departments: ["James Manufacturing - Direct"],
      }),
    );
    const positions = calculateMatrixLayout(people, [], "department");
    const values = Object.values(positions);
    const minX = Math.min(...values.map((position) => position.x));
    const maxX = Math.max(...values.map((position) => position.x + NODE_WIDTH));
    const rows = new Set(values.map((position) => position.y));

    expect(Object.keys(positions)).toHaveLength(24);
    expect(rows.size).toBeGreaterThan(1);
    expect(maxX - minX).toBeLessThan(24 * NODE_WIDTH);
  });

  it("wraps department lanes into multiple rows when there are many departments", () => {
    const people = Array.from({ length: 72 }, (_, index) => {
      const department = `Department ${Math.floor(index / 12) + 1}`;
      return makePerson(`p${index}`, {
        primaryDepartment: department,
        departments: [department],
      });
    });
    const positions = calculateMatrixLayout(people, [], "department");
    const firstDepartmentY = positions.p0.y;
    const lastDepartmentY = positions.p60.y;
    const xs = Object.values(positions).map((position) => position.x);

    expect(lastDepartmentY).toBeGreaterThan(firstDepartmentY);
    expect(Math.max(...xs) - Math.min(...xs) + NODE_WIDTH).toBeLessThan(7000);
  });
});

describe("isGridLens", () => {
  it("is true only for the matrix lens", () => {
    expect(isGridLens("matrix")).toBe(true);
    expect(isGridLens("hierarchy")).toBe(false);
    expect(isGridLens("brand")).toBe(false);
  });
});

describe("calculateGridLayout", () => {
  it("places every person and keeps cards inside the row-label / col-header offsets", () => {
    const people = [
      makePerson("p1", { primaryBrand: "Acme", primaryChannel: "Enterprise" }),
      makePerson("p2", { primaryBrand: "Acme", primaryChannel: "Enterprise" }),
      makePerson("p3", { primaryBrand: "Globex", primaryChannel: "Enterprise" }),
    ];
    const positions = calculateGridLayout(people);
    expect(Object.keys(positions).sort()).toEqual(["p1", "p2", "p3"]);
    for (const p of Object.values(positions)) {
      expect(p.x).toBeGreaterThanOrEqual(GRID_ROW_LABEL_WIDTH);
      expect(p.y).toBeGreaterThanOrEqual(GRID_COL_HEADER_HEIGHT);
    }
  });

  it("is deterministic", () => {
    const people = [
      makePerson("a", { primaryBrand: "X", primaryChannel: "Enterprise" }),
      makePerson("b", { primaryBrand: "Y", primaryChannel: "Other" }),
    ];
    expect(calculateGridLayout(people)).toEqual(calculateGridLayout(people));
  });

  it("returns an empty map when there are no people", () => {
    expect(calculateGridLayout([])).toEqual({});
  });
});

describe("getGridGeometry", () => {
  it("derives rows, cols and cells with counts matching the people", () => {
    const people = [
      makePerson("p1", { primaryBrand: "Acme", primaryChannel: "Enterprise" }),
      makePerson("p2", { primaryBrand: "Acme", primaryChannel: "Enterprise" }),
      makePerson("p3", { primaryBrand: "Globex", primaryChannel: "Enterprise" }),
    ];
    const geo = getGridGeometry(people);

    expect(geo.rows.map((r) => r.key).sort()).toEqual(["Acme", "Globex"]);
    expect(geo.cols.map((c) => c.key)).toEqual(["Enterprise"]);
    expect(geo.width).toBeGreaterThan(0);
    expect(geo.height).toBeGreaterThan(0);

    const acmeEnterprise = geo.cells.find(
      (c) => c.rowKey === "Acme" && c.colKey === "Enterprise",
    );
    expect(acmeEnterprise?.count).toBe(2);
    // Non-shared busiest cell drives the heat scale.
    expect(geo.maxCell).toBe(2);
  });

  it("orders rows by descending population then alphabetically", () => {
    const people = [
      makePerson("a", { primaryBrand: "Small", primaryChannel: "Enterprise" }),
      makePerson("b", { primaryBrand: "Big", primaryChannel: "Enterprise" }),
      makePerson("c", { primaryBrand: "Big", primaryChannel: "Enterprise" }),
    ];
    const geo = getGridGeometry(people);
    expect(geo.rows.map((r) => r.key)).toEqual(["Big", "Small"]);
  });
});
