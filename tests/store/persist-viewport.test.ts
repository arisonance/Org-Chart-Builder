import { describe, it, expect, beforeEach } from "vitest";
import {
  useGraphStore,
  migrateGraphState,
  stripPersistedViewports,
} from "@/store/graph-store";
import { createEmptyGraphDocument } from "@/lib/schema/defaults";

const reset = () => {
  useGraphStore.getState().clear();
};

beforeEach(reset);

describe("stripPersistedViewports", () => {
  it("resets every lens viewport to the default without touching positions", () => {
    const doc = createEmptyGraphDocument();
    doc.lens_state.hierarchy.layout.viewport = { x: 120, y: -80, zoom: 1.7 };
    doc.lens_state.hierarchy.layout.positions = {
      "person-a": { x: 5, y: 9 },
    };
    doc.lens_state.brand.layout.viewport = { x: 9, y: 9, zoom: 0.5 };

    const stripped = stripPersistedViewports(doc);

    expect(stripped.lens_state.hierarchy.layout.viewport).toEqual({
      x: 0,
      y: 0,
      zoom: 1,
    });
    expect(stripped.lens_state.brand.layout.viewport).toEqual({
      x: 0,
      y: 0,
      zoom: 1,
    });
    // Positions (the part worth persisting) are preserved.
    expect(stripped.lens_state.hierarchy.layout.positions).toEqual({
      "person-a": { x: 5, y: 9 },
    });
  });

  it("does not mutate the source document (so live state keeps its viewport)", () => {
    const doc = createEmptyGraphDocument();
    doc.lens_state.hierarchy.layout.viewport = { x: 42, y: 42, zoom: 2 };

    stripPersistedViewports(doc);

    // The original is untouched — only the persisted copy is zeroed.
    expect(doc.lens_state.hierarchy.layout.viewport).toEqual({
      x: 42,
      y: 42,
      zoom: 2,
    });
  });

  it("makes the persisted blob identical regardless of viewport, so a pan does not dirty it", () => {
    const a = createEmptyGraphDocument();
    const b = createEmptyGraphDocument();
    // Same document, different viewport (as if the user just panned).
    b.lens_state.hierarchy.layout.viewport = { x: 999, y: -999, zoom: 0.33 };

    expect(JSON.stringify(stripPersistedViewports(a))).toEqual(
      JSON.stringify(stripPersistedViewports(b)),
    );
  });
});

describe("migrate restores the separately-persisted viewport", () => {
  it("rehydrates currentViewport from the persisted key", () => {
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

    const result = migrateGraphState({
      document: doc,
      currentViewport: { x: 250, y: -130, zoom: 1.4 },
    }) as { currentViewport: { x: number; y: number; zoom: number } };

    expect(result.currentViewport).toEqual({ x: 250, y: -130, zoom: 1.4 });
  });

  it("falls back to the default viewport when none was persisted", () => {
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

    const result = migrateGraphState({ document: doc }) as {
      currentViewport: { x: number; y: number; zoom: number };
    };

    expect(result.currentViewport).toEqual({ x: 0, y: 0, zoom: 1 });
  });

  it("ignores a malformed persisted viewport", () => {
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

    const result = migrateGraphState({
      document: doc,
      currentViewport: { x: "nope", y: null, zoom: 0 },
    }) as { currentViewport: { x: number; y: number; zoom: number } };

    expect(result.currentViewport).toEqual({ x: 0, y: 0, zoom: 1 });
  });
});

describe("viewport store actions (no regression)", () => {
  it("setCurrentViewport updates the lightweight viewport without touching the document", () => {
    const before = JSON.stringify(useGraphStore.getState().document);
    useGraphStore.getState().setCurrentViewport({ x: 10, y: 20, zoom: 1.25 });
    const state = useGraphStore.getState();
    expect(state.currentViewport).toEqual({ x: 10, y: 20, zoom: 1.25 });
    // The document blob is unchanged by a viewport-only update.
    expect(JSON.stringify(state.document)).toEqual(before);
  });

  it("updateViewport still writes the document lens viewport when explicitly called", () => {
    useGraphStore.getState().updateViewport("hierarchy", {
      x: 7,
      y: 8,
      zoom: 0.9,
    });
    expect(
      useGraphStore.getState().document.lens_state.hierarchy.layout.viewport,
    ).toEqual({ x: 7, y: 8, zoom: 0.9 });
  });
});
