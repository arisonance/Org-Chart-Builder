import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";
import { produce } from "immer";
import cloneDeep from "lodash.clonedeep";
import { nanoid } from "nanoid";
import { DEMO_GRAPH_DOCUMENT } from "@/data/demo-graph";
import { calculateLayout, calculateCleanupLayout } from "@/lib/graph/layout";
import type {
  ClipboardPayload,
  GraphDocument,
  GraphEdge,
  GraphNode,
  GraphSnapshot,
  LayoutState,
  LensState,
  PersonAttributes,
  RelationshipType,
  SelectionState,
  XY,
} from "@/lib/schema/types";
import { createEmptyGraphDocument } from "@/lib/schema/defaults";
import type { LensId } from "@/lib/schema/lenses";
import { parseGraphDocument } from "@/lib/schema/validation";
import type { Scenario } from "@/lib/scenario/types";

const now = () => new Date().toISOString();
const HISTORY_LIMIT = 100;

type HistoryStack = {
  past: GraphSnapshot[];
  future: GraphSnapshot[];
};

type GraphStoreState = {
  document: GraphDocument;
  selection: SelectionState;
  clipboard: ClipboardPayload | null;
  history: HistoryStack;
  scenarios: Record<string, Scenario>;
  activeScenarioId: string | null;
  comparisonScenarioId: string | null;
};

type GraphStoreActions = {
  resetToDemo: () => void;
  clear: () => void;
  loadDocument: (document: GraphDocument) => void;
  importDocument: (document: GraphDocument) => void;
  exportDocument: () => GraphDocument;
  setLens: (lens: LensId) => void;
  setSelection: (selection: Partial<SelectionState>) => void;
  selectNode: (nodeId: string, additive?: boolean) => void;
  selectEdge: (edgeId: string, additive?: boolean) => void;
  clearSelection: () => void;
  addPerson: (payload: AddPersonPayload) => string;
  updatePerson: (nodeId: string, updates: Partial<GraphNode>, options?: UpdatePersonOptions) => void;
  addRelationship: (sourceId: string, targetId: string, type: RelationshipType, meta?: Partial<GraphEdge["metadata"]>) => string | null;
  updateRelationship: (edgeId: string, updates: Partial<GraphEdge["metadata"]>) => void;
  removeRelationship: (edgeId: string) => void;
  removeNode: (nodeId: string) => void;
  duplicateNodes: (nodeIds: string[]) => void;
  setClipboard: (payload: ClipboardPayload | null) => void;
  pasteClipboard: (position?: XY) => void;
  updateNodePosition: (nodeId: string, position: XY) => void;
  updateViewport: (lens: LensId, viewport: LayoutState["viewport"]) => void;
  toggleSnap: (lens: LensId) => void;
  toggleGrid: (lens: LensId) => void;
  setLensFilters: (lens: LensId, filters: Partial<LensState["filters"]>) => void;
  autoLayout: (lens?: LensId) => void;
  cleanupCanvas: (lens?: LensId, mode?: "compact" | "spacious") => void;
  toggleNodeLock: (nodeId: string) => void;
  addTagToNode: (nodeId: string, tag: string) => void;
  copyNodesById: (nodeIds: string[], edgeIds?: string[]) => void;
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
  createScenario: (name: string, description?: string, fromCurrent?: boolean) => string;
  switchScenario: (id: string) => void;
  deleteScenario: (id: string) => void;
  renameScenario: (id: string, name: string, description?: string) => void;
  updateScenarioNotes: (id: string, notes: string) => void;
  setComparisonScenario: (id: string | null) => void;
  clearComparison: () => void;
};

export type GraphStore = GraphStoreState & GraphStoreActions;

type AddPersonPayload = {
  name: string;
  title: string;
  brands: string[];
  channels: string[];
  departments: string[];
  primaryBrand?: string;
  primaryChannel?: string;
  primaryDepartment?: string;
  tags?: string[];
  location?: string;
  costCenter?: string;
  jobDescription?: string;
  tier?: PersonAttributes["tier"];
  position?: XY;
};

type UpdatePersonOptions = {
  recordHistory?: boolean;
};

const cloneDocument = (document: GraphDocument): GraphDocument => cloneDeep(document);

const createSnapshot = (state: GraphStoreState): GraphSnapshot => ({
  document: cloneDocument(state.document),
  selection: {
    nodeIds: [...state.selection.nodeIds],
    edgeIds: [...state.selection.edgeIds],
  },
});

const initialState: GraphStoreState = {
  document: cloneDocument(DEMO_GRAPH_DOCUMENT),
  selection: {
    nodeIds: [],
    edgeIds: [],
  },
  clipboard: null,
  history: {
    past: [],
    future: [],
  },
  scenarios: {},
  activeScenarioId: null,
  comparisonScenarioId: null,
};

const withHistory = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set: any,
  get: () => GraphStoreState,
  recipe: (state: GraphStoreState) => void,
): void => {
  set(
    produce<GraphStoreState>((state) => {
      const snapshot = createSnapshot(state);
      state.history.past.push(snapshot);
      if (state.history.past.length > HISTORY_LIMIT) {
        state.history.past.shift();
      }
      state.history.future = [];
      recipe(state);
      state.document.metadata.updatedAt = now();
    }),
  );
};

const ensureLensState = (document: GraphDocument, lens: LensId) => {
  if (!document.lens_state[lens]) {
    document.lens_state[lens] = {
      layout: {
        id: lens,
        positions: {},
        viewport: {
          x: 0,
          y: 0,
          zoom: 1,
        },
        snapToGrid: false,
        showGrid: true,
        lastUpdated: now(),
      },
      filters: {
        activeTokens: [],
        focusIds: [],
        hiddenIds: [],
      },
    };
  }
};

export const useGraphStore = create<GraphStore>()(
  persist(
    subscribeWithSelector((set, get) => ({
      ...initialState,
      resetToDemo: () => {
        set(
          produce((state: GraphStoreState) => {
            state.document = cloneDocument(DEMO_GRAPH_DOCUMENT);
            state.selection = { nodeIds: [], edgeIds: [] };
            state.history = { past: [], future: [] };
            state.clipboard = null;
          }),
        );
      },
      clear: () => {
        set(
          produce((state: GraphStoreState) => {
            state.document = createEmptyGraphDocument();
            state.selection = { nodeIds: [], edgeIds: [] };
            state.history = { past: [], future: [] };
            state.clipboard = null;
          }),
        );
      },
      loadDocument: (document) => {
        set(
          produce((state: GraphStoreState) => {
            state.document = cloneDocument(document);
            state.selection = { nodeIds: [], edgeIds: [] };
            state.history = { past: [], future: [] };
          }),
        );
      },
      importDocument: (document) => {
        withHistory(set, get, (state) => {
          state.document = cloneDocument(document);
          state.selection = { nodeIds: [], edgeIds: [] };
        });
      },
      exportDocument: () => cloneDocument(get().document),
      setLens: (lens) => {
        set(
          produce((state: GraphStoreState) => {
            state.document.lens = lens;
            ensureLensState(state.document, lens);
          }),
        );
      },
      setSelection: (selection) => {
        set(
          produce((state: GraphStoreState) => {
            state.selection = {
              nodeIds: selection.nodeIds ?? state.selection.nodeIds,
              edgeIds: selection.edgeIds ?? state.selection.edgeIds,
            };
          }),
        );
      },
      selectNode: (nodeId, additive = false) => {
        set(
          produce((state: GraphStoreState) => {
            if (additive) {
              if (!state.selection.nodeIds.includes(nodeId)) {
                state.selection.nodeIds.push(nodeId);
              }
            } else {
              state.selection.nodeIds = [nodeId];
            }
          }),
        );
      },
      selectEdge: (edgeId, additive = false) => {
        set(
          produce((state: GraphStoreState) => {
            if (additive) {
              if (!state.selection.edgeIds.includes(edgeId)) {
                state.selection.edgeIds.push(edgeId);
              }
            } else {
              state.selection.edgeIds = [edgeId];
            }
          }),
        );
      },
      clearSelection: () => {
        set(
          produce((state: GraphStoreState) => {
            state.selection = { nodeIds: [], edgeIds: [] };
          }),
        );
      },
      addPerson: (payload) => {
        const id = `person-${nanoid(10)}`;
        withHistory(set, get, (state) => {
          const timestamp = now();
          const node: GraphNode = {
            id,
            kind: "person",
            name: payload.name,
            createdAt: timestamp,
            updatedAt: timestamp,
            attributes: {
              title: payload.title,
              brands: payload.brands,
              primaryBrand: payload.primaryBrand,
              channels: payload.channels,
              primaryChannel: payload.primaryChannel,
              departments: payload.departments,
              primaryDepartment: payload.primaryDepartment,
              tags: payload.tags ?? [],
              location: payload.location,
              costCenter: payload.costCenter,
              jobDescription: payload.jobDescription,
              tier: payload.tier ?? "manager",
            },
          };
          state.document.nodes.push(node);
          ensureLensState(state.document, state.document.lens);
          if (payload.position) {
            state.document.lens_state[state.document.lens].layout.positions[id] = payload.position;
          }
          state.selection.nodeIds = [id];
          state.selection.edgeIds = [];
        });
        return id;
      },
      updatePerson: (nodeId, updates, options) => {
        const applyUpdates = (state: GraphStoreState) => {
          const node = state.document.nodes.find((item) => item.id === nodeId && item.kind === "person");
          if (!node) return;
          Object.assign(node, updates);
          node.updatedAt = now();
        };

        if (options?.recordHistory === false) {
          set(
            produce((state: GraphStoreState) => {
              applyUpdates(state);
              state.document.metadata.updatedAt = now();
            }),
          );
          return;
        }

        withHistory(set, get, applyUpdates);
      },
      addRelationship: (sourceId, targetId, type, meta) => {
        if (sourceId === targetId) return null;
        const id = `edge-${type}-${nanoid(8)}`;
        withHistory(set, get, (state) => {
          const timestamp = now();
          const edge: GraphEdge = {
            id,
            source: sourceId,
            target: targetId,
            metadata: {
              type,
              weight: meta?.weight,
              label: meta?.label,
              lenses: meta?.lenses,
              colorToken: meta?.colorToken,
              ghost: meta?.ghost,
            },
            createdAt: timestamp,
            updatedAt: timestamp,
          };
          state.document.edges.push(edge);
          state.selection.edgeIds = [id];
        });
        return id;
      },
      updateRelationship: (edgeId, updates) => {
        withHistory(set, get, (state) => {
          const edge = state.document.edges.find((item) => item.id === edgeId);
          if (!edge) return;
          edge.metadata = {
            ...edge.metadata,
            ...updates,
          };
          edge.updatedAt = now();
        });
      },
      removeRelationship: (edgeId) => {
        withHistory(set, get, (state) => {
          state.document.edges = state.document.edges.filter((edge) => edge.id !== edgeId);
          state.selection.edgeIds = state.selection.edgeIds.filter((id) => id !== edgeId);
        });
      },
      removeNode: (nodeId) => {
        withHistory(set, get, (state) => {
          state.document.nodes = state.document.nodes.filter((node) => node.id !== nodeId);
          state.document.edges = state.document.edges.filter(
            (edge) => edge.source !== nodeId && edge.target !== nodeId,
          );
          state.selection.nodeIds = state.selection.nodeIds.filter((id) => id !== nodeId);
        });
      },
      duplicateNodes: (nodeIds) => {
        withHistory(set, get, (state) => {
          const timestamp = now();
          const idMap: Record<string, string> = {};
          nodeIds.forEach((nodeId) => {
            const original = state.document.nodes.find((node) => node.id === nodeId);
            if (!original) return;
            const newId = `${original.kind}-${nanoid(10)}`;
            idMap[nodeId] = newId;
            const duplicate: GraphNode = cloneDeep(original);
            duplicate.id = newId;
            duplicate.name = `${duplicate.name} (copy)`;
            duplicate.createdAt = timestamp;
            duplicate.updatedAt = timestamp;
            state.document.nodes.push(duplicate);
            const position =
              state.document.lens_state[state.document.lens]?.layout.positions[nodeId];
            if (position) {
              state.document.lens_state[state.document.lens].layout.positions[newId] = {
                x: position.x + 60,
                y: position.y + 60,
              };
            }
          });
          const duplicatedEdges = state.document.edges
            .filter((edge) => nodeIds.includes(edge.source) || nodeIds.includes(edge.target))
            .map((edge) => {
              const newSource = idMap[edge.source] ?? edge.source;
              const newTarget = idMap[edge.target] ?? edge.target;
              return {
                ...cloneDeep(edge),
                id: `${edge.metadata.type}-${nanoid(10)}`,
                source: newSource,
                target: newTarget,
                createdAt: timestamp,
                updatedAt: timestamp,
              };
            });
          state.document.edges.push(...duplicatedEdges);
          state.selection.nodeIds = Object.values(idMap);
          state.selection.edgeIds = duplicatedEdges.map((edge) => edge.id);
        });
      },
      setClipboard: (payload) => {
        set(
          produce((state: GraphStoreState) => {
            state.clipboard = payload ? cloneDeep(payload) : null;
          }),
        );
      },
      pasteClipboard: (position) => {
        const clipboard = get().clipboard;
        if (!clipboard) return;
        withHistory(set, get, (state) => {
          const timestamp = now();
          const idMap: Record<string, string> = {};
          clipboard.nodes.forEach((node) => {
            const newId = `${node.kind}-${nanoid(10)}`;
            idMap[node.id] = newId;
            const clone: GraphNode = cloneDeep(node);
            clone.id = newId;
            clone.createdAt = timestamp;
            clone.updatedAt = timestamp;
            clone.name = clone.name.endsWith("(copy)") ? clone.name : `${clone.name} (copy)`;
            state.document.nodes.push(clone);
            if (position) {
              state.document.lens_state[state.document.lens].layout.positions[newId] = {
                x: position.x,
                y: position.y,
              };
            }
          });
          clipboard.edges.forEach((edge) => {
            state.document.edges.push({
              ...cloneDeep(edge),
              id: `${edge.metadata.type}-${nanoid(8)}`,
              source: idMap[edge.source] ?? edge.source,
              target: idMap[edge.target] ?? edge.target,
              createdAt: timestamp,
              updatedAt: timestamp,
            });
          });
          state.selection.nodeIds = Object.values(idMap);
        });
      },
      updateNodePosition: (nodeId, position) => {
        set(
          produce((state: GraphStoreState) => {
            ensureLensState(state.document, state.document.lens);
            state.document.lens_state[state.document.lens].layout.positions[nodeId] = position;
            state.document.lens_state[state.document.lens].layout.lastUpdated = now();
          }),
        );
      },
      updateViewport: (lens, viewport) => {
        set(
          produce((state: GraphStoreState) => {
            ensureLensState(state.document, lens);
            state.document.lens_state[lens].layout.viewport = viewport;
            state.document.lens_state[lens].layout.lastUpdated = now();
          }),
        );
      },
      toggleSnap: (lens) => {
        set(
          produce((state: GraphStoreState) => {
            ensureLensState(state.document, lens);
            const layout = state.document.lens_state[lens].layout;
            layout.snapToGrid = !layout.snapToGrid;
            layout.lastUpdated = now();
          }),
        );
      },
      toggleGrid: (lens) => {
        set(
          produce((state: GraphStoreState) => {
            ensureLensState(state.document, lens);
            const layout = state.document.lens_state[lens].layout;
            layout.showGrid = !layout.showGrid;
            layout.lastUpdated = now();
          }),
        );
      },
      setLensFilters: (lens, filters) => {
        set(
          produce((state: GraphStoreState) => {
            ensureLensState(state.document, lens);
            state.document.lens_state[lens].filters = {
              ...state.document.lens_state[lens].filters,
              ...filters,
            };
          }),
        );
      },
      autoLayout: (lens) => {
        withHistory(set, get, (state) => {
          const targetLens = lens ?? state.document.lens;
          ensureLensState(state.document, targetLens);
          
          // Use basic hierarchical layout for all lenses
          const positions = calculateLayout(state.document.nodes, state.document.edges);
          
          Object.entries(positions).forEach(([nodeId, position]) => {
            state.document.lens_state[targetLens].layout.positions[nodeId] = position;
          });
          state.document.lens_state[targetLens].layout.lastUpdated = now();
        });
      },
      cleanupCanvas: (lens, mode = "spacious") => {
        withHistory(set, get, (state) => {
          const targetLens = lens ?? state.document.lens;
          ensureLensState(state.document, targetLens);
          
          // Get existing positions to preserve locked nodes if needed
          const existingPositions = state.document.lens_state[targetLens].layout.positions;
          
          // Use cleanup layout for elegant spacing and alignment
          const positions = calculateCleanupLayout(
            state.document.nodes,
            state.document.edges,
            existingPositions,
            mode
          );
          
          Object.entries(positions).forEach(([nodeId, position]) => {
            state.document.lens_state[targetLens].layout.positions[nodeId] = position;
          });
          state.document.lens_state[targetLens].layout.lastUpdated = now();
        });
      },
      toggleNodeLock: (nodeId) => {
        withHistory(set, get, (state) => {
          const node = state.document.nodes.find((item) => item.id === nodeId);
          if (!node || node.kind !== "person") return;
          node.locked = !node.locked;
          node.updatedAt = now();
        });
      },
      addTagToNode: (nodeId, tag) => {
        withHistory(set, get, (state) => {
          const node = state.document.nodes.find(
            (item) => item.id === nodeId && item.kind === "person",
          );
          if (!node || node.kind !== "person") return;
          if (!node.attributes.tags.includes(tag)) {
            node.attributes.tags.push(tag);
            node.updatedAt = now();
          }
        });
      },
      copyNodesById: (nodeIds, edgeIds = []) => {
        const state = get();
        const nodes = state.document.nodes.filter((node) => nodeIds.includes(node.id));
        const edges = state.document.edges.filter(
          (edge) =>
            edgeIds.includes(edge.id) ||
            (nodeIds.includes(edge.source) && nodeIds.includes(edge.target)),
        );
        state.setClipboard({
          nodes: cloneDeep(nodes),
          edges: cloneDeep(edges),
        });
      },
      undo: () => {
        const { history } = get();
        if (history.past.length === 0) return;
        set(
          produce((state: GraphStoreState) => {
            const snapshot = state.history.past.pop()!;
            state.history.future.unshift(createSnapshot(state));
            if (state.history.future.length > HISTORY_LIMIT) {
              state.history.future.pop();
            }
            state.document = snapshot.document;
            state.selection = snapshot.selection;
          }),
        );
      },
      redo: () => {
        const { history } = get();
        if (history.future.length === 0) return;
        set(
          produce((state: GraphStoreState) => {
            const snapshot = state.history.future.shift()!;
            state.history.past.push(createSnapshot(state));
            if (state.history.past.length > HISTORY_LIMIT) {
              state.history.past.shift();
            }
            state.document = snapshot.document;
            state.selection = snapshot.selection;
          }),
        );
      },
      pushHistory: () => {
        set(
          produce((state: GraphStoreState) => {
            state.history.past.push(createSnapshot(state));
            if (state.history.past.length > HISTORY_LIMIT) {
              state.history.past.shift();
            }
            state.history.future = [];
          }),
        );
      },
      createScenario: (name, description, fromCurrent = true) => {
        const id = `scenario-${nanoid(10)}`;
        set(
          produce((state: GraphStoreState) => {
            const scenario: Scenario = {
              id,
              name,
              description,
              createdAt: now(),
              document: fromCurrent
                ? cloneDocument(state.document)
                : createEmptyGraphDocument(),
            };
            state.scenarios[id] = scenario;
            if (!state.activeScenarioId) {
              state.activeScenarioId = id;
            }
          }),
        );
        return id;
      },
      switchScenario: (id) => {
        set(
          produce((state: GraphStoreState) => {
            if (state.scenarios[id]) {
              state.document = cloneDocument(state.scenarios[id].document);
              state.activeScenarioId = id;
              state.selection = { nodeIds: [], edgeIds: [] };
              state.history = { past: [], future: [] };
            }
          }),
        );
      },
      deleteScenario: (id) => {
        set(
          produce((state: GraphStoreState) => {
            delete state.scenarios[id];
            if (state.activeScenarioId === id) {
              const remainingIds = Object.keys(state.scenarios);
              state.activeScenarioId = remainingIds.length > 0 ? remainingIds[0] : null;
              if (state.activeScenarioId) {
                state.document = cloneDocument(state.scenarios[state.activeScenarioId].document);
              }
            }
            if (state.comparisonScenarioId === id) {
              state.comparisonScenarioId = null;
            }
          }),
        );
      },
      renameScenario: (id, name, description) => {
        set(
          produce((state: GraphStoreState) => {
            if (state.scenarios[id]) {
              state.scenarios[id].name = name;
              if (description !== undefined) {
                state.scenarios[id].description = description;
              }
            }
          }),
        );
      },
      updateScenarioNotes: (id, notes) => {
        set(
          produce((state: GraphStoreState) => {
            if (state.scenarios[id]) {
              state.scenarios[id].notes = notes;
            }
          }),
        );
      },
      setComparisonScenario: (id) => {
        set(
          produce((state: GraphStoreState) => {
            state.comparisonScenarioId = id;
          }),
        );
      },
      clearComparison: () => {
        set(
          produce((state: GraphStoreState) => {
            state.comparisonScenarioId = null;
          }),
        );
      },
    })),
    {
      name: "org-chart-graph-state",
      version: 3,
      partialize: (state) => ({
        document: state.document,
        selection: state.selection,
        clipboard: state.clipboard,
        scenarios: state.scenarios,
        activeScenarioId: state.activeScenarioId,
      }),
      migrate: (persistedState: unknown) => {
        if (!persistedState || typeof persistedState !== "object") {
          return { ...initialState };
        }

        const maybeState = persistedState as Partial<GraphStoreState>;
        if (!maybeState.document) {
          return { ...initialState };
        }

        try {
          const sanitizedDocument = parseGraphDocument(maybeState.document);
          const nodeIds = new Set(sanitizedDocument.nodes.map((node) => node.id));
          const edgeIds = new Set(sanitizedDocument.edges.map((edge) => edge.id));
          const documentClone = cloneDocument(sanitizedDocument);

          const sanitizedSelection: SelectionState = {
            nodeIds: Array.isArray(maybeState.selection?.nodeIds)
              ? maybeState.selection.nodeIds.filter(
                  (id): id is string => typeof id === "string" && nodeIds.has(id),
                )
              : [],
            edgeIds: Array.isArray(maybeState.selection?.edgeIds)
              ? maybeState.selection.edgeIds.filter(
                  (id): id is string => typeof id === "string" && edgeIds.has(id),
                )
              : [],
          };

          return {
            ...initialState,
            document: documentClone,
            selection: sanitizedSelection,
            clipboard: null,
          };
        } catch (error) {
          console.warn("Failed to restore persisted org chart state; falling back to demo.", error);
          return {
            ...initialState,
            document: cloneDocument(DEMO_GRAPH_DOCUMENT),
          };
        }
      },
    },
  ),
);
