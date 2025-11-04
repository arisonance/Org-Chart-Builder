import { LENSES, type LensId } from "./lenses";
import type { GraphDocument, LensState, LayoutState, Viewport } from "./types";
import { SCHEMA_VERSION } from "./types";

const now = () => new Date().toISOString();

export const DEFAULT_VIEWPORT: Viewport = {
  x: 0,
  y: 0,
  zoom: 1,
};

export const createLayoutState = (id: LensId): LayoutState => ({
  id,
  positions: {},
  viewport: { ...DEFAULT_VIEWPORT },
  snapToGrid: false,
  showGrid: true,
  lastUpdated: now(),
});

export const createLensState = (id: LensId): LensState => ({
  layout: createLayoutState(id),
  filters: {
    activeTokens: [],
    focusIds: [],
    hiddenIds: [],
  },
});

export const buildDefaultLensState = () =>
  LENSES.reduce<Record<LensId, LensState>>((acc, lens) => {
    acc[lens.id] = createLensState(lens.id);
    return acc;
  }, {} as Record<LensId, LensState>);

export const createEmptyGraphDocument = (): GraphDocument => ({
  schema_version: SCHEMA_VERSION,
  metadata: {
    name: "Untitled Organization",
    createdAt: now(),
    updatedAt: now(),
  },
  nodes: [],
  edges: [],
  lens: "hierarchy",
  lens_state: buildDefaultLensState(),
});
