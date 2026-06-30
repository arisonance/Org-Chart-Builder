import { describe, it, expect, beforeEach } from "vitest";
import {
  useGraphStore,
  buildSettingsPatch,
  migrateGraphState,
  SETTINGS_FIELD_KEYS,
  type PersonSettingsClipboard,
} from "@/store/graph-store";
import { createEmptyGraphDocument } from "@/lib/schema/defaults";
import { DEMO_GRAPH_DOCUMENT } from "@/data/demo-graph";

const reset = () => {
  // Start every test from an empty document with clean history/selection.
  useGraphStore.getState().clear();
};

const addAlice = () =>
  useGraphStore.getState().addPerson({
    name: "Alice",
    title: "CEO",
    brands: [],
    channels: [],
    departments: [],
    tier: "c-suite",
  });

beforeEach(reset);

describe("addPerson", () => {
  it("appends a person, selects it, and returns its id", () => {
    const id = addAlice();
    const state = useGraphStore.getState();
    const node = state.document.nodes.find((n) => n.id === id);
    expect(node?.kind).toBe("person");
    expect(node?.name).toBe("Alice");
    expect(state.selection.nodeIds).toEqual([id]);
    expect(id.startsWith("person-")).toBe(true);
  });

  it("records a history entry that undo can revert", () => {
    addAlice();
    expect(useGraphStore.getState().document.nodes).toHaveLength(1);
    useGraphStore.getState().undo();
    expect(useGraphStore.getState().document.nodes).toHaveLength(0);
  });
});

describe("removeNode", () => {
  it("removes the node and any edges touching it, and deselects it", () => {
    const a = addAlice();
    const b = useGraphStore.getState().addPerson({
      name: "Bob",
      title: "VP",
      brands: [],
      channels: [],
      departments: [],
    });
    useGraphStore.getState().addRelationship(a, b, "manager");
    expect(useGraphStore.getState().document.edges).toHaveLength(1);

    useGraphStore.getState().removeNode(b);
    const state = useGraphStore.getState();
    expect(state.document.nodes.map((n) => n.id)).toEqual([a]);
    expect(state.document.edges).toHaveLength(0);
    expect(state.selection.nodeIds).not.toContain(b);
  });
});

describe("addRelationship", () => {
  it("rejects self-edges", () => {
    const a = addAlice();
    expect(useGraphStore.getState().addRelationship(a, a, "manager")).toBeNull();
    expect(useGraphStore.getState().document.edges).toHaveLength(0);
  });

  it("rejects relationships whose endpoints are missing", () => {
    const a = addAlice();
    expect(useGraphStore.getState().addRelationship(a, "person-missing", "manager")).toBeNull();
    expect(useGraphStore.getState().addRelationship("person-missing", a, "manager")).toBeNull();
    expect(useGraphStore.getState().document.edges).toHaveLength(0);
  });

  it("creates a typed edge and selects it", () => {
    const a = addAlice();
    const b = useGraphStore.getState().addPerson({
      name: "Bob",
      title: "VP",
      brands: [],
      channels: [],
      departments: [],
    });
    const edgeId = useGraphStore.getState().addRelationship(a, b, "manager");
    const state = useGraphStore.getState();
    expect(edgeId).not.toBeNull();
    expect(state.document.edges[0].metadata.type).toBe("manager");
    expect(state.selection.edgeIds).toEqual([edgeId]);
  });

  it("does not duplicate an existing relationship", () => {
    const a = addAlice();
    const b = useGraphStore.getState().addPerson({
      name: "Bob",
      title: "VP",
      brands: [],
      channels: [],
      departments: [],
    });
    const first = useGraphStore.getState().addRelationship(a, b, "manager");
    const second = useGraphStore.getState().addRelationship(a, b, "manager");

    expect(second).toBe(first);
    expect(useGraphStore.getState().document.edges).toHaveLength(1);
    expect(useGraphStore.getState().selection.edgeIds).toEqual([first]);
  });

  it("replaces a person's existing manager instead of giving them two solid bosses", () => {
    const alice = addAlice();
    const bob = useGraphStore.getState().addPerson({
      name: "Bob",
      title: "VP",
      brands: [],
      channels: [],
      departments: [],
    });
    const carol = useGraphStore.getState().addPerson({
      name: "Carol",
      title: "Director",
      brands: [],
      channels: [],
      departments: [],
    });

    useGraphStore.getState().addRelationship(alice, carol, "manager");
    const newEdgeId = useGraphStore.getState().addRelationship(bob, carol, "manager");
    const managerEdges = useGraphStore
      .getState()
      .document.edges.filter((edge) => edge.metadata.type === "manager" && edge.target === carol);

    expect(managerEdges).toHaveLength(1);
    expect(managerEdges[0].id).toBe(newEdgeId);
    expect(managerEdges[0].source).toBe(bob);
  });

  it("allows support truth to coexist with one formal manager", () => {
    const alice = addAlice();
    const bob = useGraphStore.getState().addPerson({
      name: "Bob",
      title: "VP",
      brands: [],
      channels: [],
      departments: [],
    });
    const carol = useGraphStore.getState().addPerson({
      name: "Carol",
      title: "Director",
      brands: [],
      channels: [],
      departments: [],
    });

    useGraphStore.getState().addRelationship(alice, carol, "manager");
    useGraphStore.getState().addRelationship(bob, carol, "support");

    const edges = useGraphStore.getState().document.edges;
    expect(edges.filter((edge) => edge.metadata.type === "manager" && edge.target === carol)).toHaveLength(1);
    expect(edges.filter((edge) => edge.metadata.type === "support" && edge.target === carol)).toHaveLength(1);
  });

  it("keeps converted reports-to relationships singular", () => {
    const alice = addAlice();
    const bob = useGraphStore.getState().addPerson({
      name: "Bob",
      title: "VP",
      brands: [],
      channels: [],
      departments: [],
    });
    const carol = useGraphStore.getState().addPerson({
      name: "Carol",
      title: "Director",
      brands: [],
      channels: [],
      departments: [],
    });

    useGraphStore.getState().addRelationship(alice, carol, "manager");
    const supportEdgeId = useGraphStore.getState().addRelationship(bob, carol, "support");
    expect(supportEdgeId).not.toBeNull();

    useGraphStore.getState().updateRelationship(supportEdgeId!, { type: "manager" });

    const managerEdges = useGraphStore
      .getState()
      .document.edges.filter((edge) => edge.metadata.type === "manager" && edge.target === carol);
    expect(managerEdges).toHaveLength(1);
    expect(managerEdges[0].source).toBe(bob);
  });

  it("undoes a manager replacement back to the previous manager in one step", () => {
    const alice = addAlice();
    const bob = useGraphStore.getState().addPerson({
      name: "Bob",
      title: "VP",
      brands: [],
      channels: [],
      departments: [],
    });
    const carol = useGraphStore.getState().addPerson({
      name: "Carol",
      title: "Director",
      brands: [],
      channels: [],
      departments: [],
    });

    useGraphStore.getState().addRelationship(alice, carol, "manager");
    useGraphStore.getState().addRelationship(bob, carol, "manager");
    useGraphStore.getState().undo();

    const managerEdges = useGraphStore
      .getState()
      .document.edges.filter((edge) => edge.metadata.type === "manager" && edge.target === carol);

    expect(managerEdges).toHaveLength(1);
    expect(managerEdges[0].source).toBe(alice);
  });

  it("rejects reporting cycles", () => {
    const alice = addAlice();
    const bob = useGraphStore.getState().addPerson({
      name: "Bob",
      title: "VP",
      brands: [],
      channels: [],
      departments: [],
    });
    const carol = useGraphStore.getState().addPerson({
      name: "Carol",
      title: "Director",
      brands: [],
      channels: [],
      departments: [],
    });

    useGraphStore.getState().addRelationship(alice, bob, "manager");
    useGraphStore.getState().addRelationship(bob, carol, "manager");

    expect(useGraphStore.getState().addRelationship(carol, alice, "manager")).toBeNull();
    expect(useGraphStore.getState().document.edges).toHaveLength(2);
  });
});

describe("undo / redo", () => {
  it("are no-ops on empty history stacks", () => {
    expect(() => useGraphStore.getState().undo()).not.toThrow();
    expect(() => useGraphStore.getState().redo()).not.toThrow();
    expect(useGraphStore.getState().document.nodes).toHaveLength(0);
  });

  it("round-trips an edit through undo then redo", () => {
    const id = addAlice();
    useGraphStore.getState().undo();
    expect(useGraphStore.getState().document.nodes).toHaveLength(0);
    useGraphStore.getState().redo();
    const state = useGraphStore.getState();
    expect(state.document.nodes).toHaveLength(1);
    expect(state.document.nodes[0].id).toBe(id);
  });

  it("clears the redo stack after a fresh edit", () => {
    addAlice();
    useGraphStore.getState().undo();
    expect(useGraphStore.getState().history.future).toHaveLength(1);
    addAlice();
    expect(useGraphStore.getState().history.future).toHaveLength(0);
  });
});

describe("reassignToLane", () => {
  it("sets the primary value and prepends to the assignment list", () => {
    const a = addAlice();
    useGraphStore.getState().reassignToLane(a, "brand", "Acme");
    const node = useGraphStore
      .getState()
      .document.nodes.find((n) => n.id === a);
    expect(node?.kind === "person" && node.attributes.primaryBrand).toBe("Acme");
    expect(node?.kind === "person" && node.attributes.brands[0]).toBe("Acme");
  });

  it("does not duplicate an already-present lane key", () => {
    const a = useGraphStore.getState().addPerson({
      name: "Alice",
      title: "CEO",
      brands: ["Acme"],
      channels: [],
      departments: [],
    });
    useGraphStore.getState().reassignToLane(a, "brand", "Acme");
    const node = useGraphStore
      .getState()
      .document.nodes.find((n) => n.id === a);
    expect(node?.kind === "person" && node.attributes.brands).toEqual(["Acme"]);
  });
});

describe("reassignManyToLane", () => {
  it("reassigns every supplied node in one history entry", () => {
    const a = addAlice();
    const b = useGraphStore.getState().addPerson({
      name: "Bob",
      title: "VP",
      brands: [],
      channels: [],
      departments: [],
    });
    const before = useGraphStore.getState().history.past.length;
    useGraphStore.getState().reassignManyToLane([a, b], "channel", "Enterprise");
    const nodes = useGraphStore.getState().document.nodes;
    for (const n of nodes) {
      expect(n.kind === "person" && n.attributes.primaryChannel).toBe(
        "Enterprise",
      );
    }
    expect(useGraphStore.getState().history.past.length).toBe(before + 1);
  });

  it("is a no-op for an empty id list", () => {
    addAlice();
    const before = useGraphStore.getState().history.past.length;
    useGraphStore.getState().reassignManyToLane([], "brand", "Acme");
    expect(useGraphStore.getState().history.past.length).toBe(before);
  });
});

describe("buildSettingsPatch", () => {
  const clip: PersonSettingsClipboard = {
    sourceId: "src",
    sourceName: "Source",
    attrs: {
      brands: ["Acme"],
      primaryBrand: "Acme",
      channels: ["Enterprise"],
      primaryChannel: "Enterprise",
      departments: ["Eng"],
      primaryDepartment: "Eng",
      tier: "vp",
      location: "NYC",
    },
  };

  it("only copies the requested fields", () => {
    expect(buildSettingsPatch(clip, ["brand"])).toEqual({
      brands: ["Acme"],
      primaryBrand: "Acme",
    });
    expect(buildSettingsPatch(clip, ["tier", "location"])).toEqual({
      tier: "vp",
      location: "NYC",
    });
  });

  it("maps every settings field to its attribute keys", () => {
    expect(SETTINGS_FIELD_KEYS.channel).toEqual(["channels", "primaryChannel"]);
    expect(SETTINGS_FIELD_KEYS.department).toEqual([
      "departments",
      "primaryDepartment",
    ]);
  });
});

describe("persist migrate", () => {
  const migrate = migrateGraphState;

  it("falls back to initial state for non-object persisted state", () => {
    const result = migrate(null) as { document: { nodes: unknown[] } };
    expect(Array.isArray(result.document.nodes)).toBe(true);
  });

  it("falls back to initial state when the persisted document is missing", () => {
    const result = migrate({ selection: { nodeIds: [], edgeIds: [] } }) as {
      document: { metadata: { name: string } };
    };
    expect(result.document.metadata.name).toBe(
      DEMO_GRAPH_DOCUMENT.metadata.name,
    );
  });

  it("preserves a real org document but drops saved layout positions", () => {
    const doc = createEmptyGraphDocument();
    doc.metadata.name = "My Real Org";
    doc.nodes.push({
      id: "person-stephanie-parra",
      kind: "person",
      name: "Stephanie Parra",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      attributes: {
        title: "VP",
        departments: [],
        brands: [],
        channels: [],
        tags: [],
      },
    });
    doc.lens_state.hierarchy.layout.positions = { "person-stephanie-parra": { x: 5, y: 9 } };

    const result = migrate({ document: doc }) as {
      document: typeof doc;
    };
    expect(result.document.nodes.map((n) => n.id)).toContain(
      "person-stephanie-parra",
    );
    expect(result.document.lens_state.hierarchy.layout.positions).toEqual({});
  });

  it("repairs Gigi's name in persisted documents by person id", () => {
    const doc = createEmptyGraphDocument();
    doc.metadata.name = "My Real Org";
    const oldPersistedName = `Gigi ${["Dr", "eyer"].join("")}`;
    doc.nodes.push(
      {
        id: "person-stephanie-parra",
        kind: "person",
        name: "Stephanie Parra",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
        attributes: {
          title: "VP",
          departments: [],
          brands: [],
          channels: [],
          tags: [],
        },
      },
      {
        id: "person-grace-dryer",
        kind: "person",
        name: oldPersistedName,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
        attributes: {
          title: "Vice President of Human Resources",
          departments: ["Administration"],
          brands: [],
          channels: [],
          tags: [],
        },
      },
    );

    const result = migrate({ document: doc }) as {
      document: typeof doc;
    };

    const gigi = result.document.nodes.find(
      (node) => node.id === "person-grace-dryer",
    );
    expect(gigi?.name).toBe("Gigi Dryer");
  });

  it("refreshes a stale bundled-demo document that predates the CSV org", () => {
    const doc = createEmptyGraphDocument();
    doc.metadata.name = DEMO_GRAPH_DOCUMENT.metadata.name;
    // No person-stephanie-parra → treated as a pre-CSV demo copy.
    const result = migrate({ document: doc }) as {
      document: { nodes: unknown[] };
    };
    expect(result.document.nodes.length).toBe(
      DEMO_GRAPH_DOCUMENT.nodes.length,
    );
  });
});
