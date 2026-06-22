'use client';

import "@xyflow/react/dist/style.css";

import {
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Connection,
  ConnectionMode,
  Edge,
  MarkerType,
  MiniMap,
  Node,
  ReactFlow,
  type NodeChange,
  type OnSelectionChangeParams,
  type ReactFlowInstance,
} from "@xyflow/react";
import * as ContextMenu from "@radix-ui/react-context-menu";
import * as Popover from "@radix-ui/react-popover";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { MixerHorizontalIcon, QuestionMarkCircledIcon } from "@radix-ui/react-icons";
import { HierarchyNode, type HierarchyNodeData } from "@/components/hierarchy-node";
import { LaneNode, type LaneNodeData } from "@/components/lane-node";
import { MirrorNode } from "@/components/mirror-node";
import {
  SharedServiceGroupNode,
  type SharedServiceGroupNodeData,
} from "@/components/shared-service-group-node";
import { OnboardingOverlay } from "@/components/onboarding-overlay";
import { RelationshipLegend } from "@/components/relationship-legend";
import { CanvasContextBar } from "@/components/canvas-context-bar";
import { HelpDialog } from "@/components/help-dialog";
import { customEdgeTypes } from "@/components/custom-edges";
import { QuickAddPersonDialog, type QuickAddPersonData } from "@/components/quick-add-person-dialog";
import { useGraphStore, buildSettingsPatch } from "@/store/graph-store";
import { LENS_BY_ID, type LensId } from "@/lib/schema/lenses";
import type { GraphEdge, PersonNode } from "@/lib/schema/types";
import {
  buildChildMap,
  isDescendant,
  getAssignments,
  getGroupKey,
  groupNodesByDimension,
  lensToDimension,
  isGridLens,
  getGridGeometry,
  calculateLayout,
  calculateMatrixLayout,
  calculateGridLayout,
  calculateTeamTreeLayout,
  collectDescendants,
  UNASSIGNED_GROUP_KEY,
  NODE_WIDTH,
  NODE_HEIGHT,
  type LensDimension,
} from "@/lib/graph/layout";
import { GridColNode, GridRowNode, GridCellNode, GridGroupNode } from "@/components/grid-frame-node";
import { CHANNEL_GROUP_COLORS } from "@/lib/theme/palette";
import { channelTopGroup } from "@/lib/org/channels";
import { CommandPalette, type PaletteAction } from "@/components/command-palette";
import { OrgHealthPanel } from "@/components/org-health-panel";
import { UnitRail } from "@/components/unit-rail";
import { UnitFoundation } from "@/components/unit-foundation";
import { computeOrgUnits, unitMemberIdSet, computeUnitAnchors, type ComputedUnit } from "@/lib/graph/org-units";
import { groupSharedServiceMirrors } from "@/lib/graph/shared-service-groups";
import {
  BRAND_COLORS,
  CHANNEL_COLORS,
  DEPARTMENT_COLORS,
  RELATIONSHIP_COLORS,
  UNASSIGNED_LANE_COLOR,
} from "@/lib/theme/palette";
import { ROLE_TEMPLATES, type RoleTemplate } from "@/lib/schema/templates";
import { DEMO_LENS_LABELS } from "@/data/demo-graph";

type CanvasMenuState = {
  open: boolean;
  clientX: number;
  clientY: number;
};

type ViewContext = {
  kind: "support-pod" | "shared-services" | "unit";
  label: string;
  count: number;
};

type ViewportState = {
  x: number;
  y: number;
  zoom: number;
};

type FitPeopleOptions = {
  padding?: number;
  duration?: number;
  minZoom?: number;
  maxZoom?: number;
};

const nodeTypes = {
  hierarchyNode: HierarchyNode,
  laneNode: LaneNode,
  mirrorNode: MirrorNode,
  sharedServiceGroupNode: SharedServiceGroupNode,
  gridColNode: GridColNode,
  gridRowNode: GridRowNode,
  gridCellNode: GridCellNode,
  gridGroupNode: GridGroupNode,
} as const;

const edgeTypes = {
  ...customEdgeTypes,
  smoothstep: customEdgeTypes.manager, // default to manager style for generic edges
} as const;

const markerByType: Record<string, { width: number; height: number; color: string }> = {
  manager: { width: 16, height: 16, color: RELATIONSHIP_COLORS.manager },
  sponsor: { width: 18, height: 18, color: RELATIONSHIP_COLORS.sponsor },
  dotted: { width: 16, height: 16, color: RELATIONSHIP_COLORS.dotted },
};

const baseEdgeStyle = {
  strokeWidth: 2.5,
  strokeLinecap: "round" as const,
};

const MATRIX_WRAP_LAYOUT_STORAGE_KEY = "org-chart-matrix-wrap-layout-v1";
const TEAM_TREE_FULL_DESCENDANT_LIMIT = 80;

const isPersonFlowNodeId = (id: string) =>
  !id.startsWith("lane:") &&
  !id.startsWith("mirror:") &&
  !id.startsWith("mirror-group:") &&
  !id.startsWith("grid");

type HierarchyCanvasProps = {
  className?: string;
  style?: CSSProperties;
};

export function HierarchyCanvas({ className, style }: HierarchyCanvasProps = {}) {
  const lens = useGraphStore((state) => state.document.lens);
  const nodesData = useGraphStore((state) => state.document.nodes);
  const edgesData = useGraphStore((state) => state.document.edges);
  const lensState = useGraphStore(
    (state) => state.document.lens_state[state.document.lens]
  );
  const selection = useGraphStore((state) => state.selection);
  const addPerson = useGraphStore((state) => state.addPerson);
  const updateNodePosition = useGraphStore((state) => state.updateNodePosition);
  const addRelationship = useGraphStore((state) => state.addRelationship);
  const updateRelationship = useGraphStore((state) => state.updateRelationship);
  const removeRelationship = useGraphStore((state) => state.removeRelationship);
  const removeNode = useGraphStore((state) => state.removeNode);
  const duplicateNodes = useGraphStore((state) => state.duplicateNodes);
  const toggleNodeLock = useGraphStore((state) => state.toggleNodeLock);
  const reassignToLane = useGraphStore((state) => state.reassignToLane);
  const reassignManyToLane = useGraphStore((state) => state.reassignManyToLane);
  const addTagToNode = useGraphStore((state) => state.addTagToNode);
  const copyNodesById = useGraphStore((state) => state.copyNodesById);
  const pasteClipboard = useGraphStore((state) => state.pasteClipboard);
  const setSelection = useGraphStore((state) => state.setSelection);
  const selectNode = useGraphStore((state) => state.selectNode);
  const selectEdge = useGraphStore((state) => state.selectEdge);
  const clearSelection = useGraphStore((state) => state.clearSelection);
  const toggleGrid = useGraphStore((state) => state.toggleGrid);
  const toggleSnap = useGraphStore((state) => state.toggleSnap);
  const autoLayout = useGraphStore((state) => state.autoLayout);
  const cleanupCanvas = useGraphStore((state) => state.cleanupCanvas);
  const setCurrentViewport = useGraphStore((state) => state.setCurrentViewport);
  const currentViewportState = useGraphStore((state) => state.currentViewport);
  const mirrorLanes = useGraphStore((state) => state.mirrorLanes);
  const toggleMirrorLanes = useGraphStore((state) => state.toggleMirrorLanes);
  const collapsedIds = useGraphStore((state) => state.collapsedIds);
  const toggleCollapse = useGraphStore((state) => state.toggleCollapse);
  const addCollapsed = useGraphStore((state) => state.addCollapsed);
  const expandAll = useGraphStore((state) => state.expandAll);
  const applyToPeople = useGraphStore((state) => state.applyToPeople);
  const copyPersonSettings = useGraphStore((state) => state.copyPersonSettings);
  const setLensStore = useGraphStore((state) => state.setLens);
  const setLensFilters = useGraphStore((state) => state.setLensFilters);
  const undo = useGraphStore((state) => state.undo);
  const redo = useGraphStore((state) => state.redo);

  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [canvasMenu, setCanvasMenu] = useState<CanvasMenuState | null>(null);
  const [edgeMenu, setEdgeMenu] = useState<{ edge: Edge | null; position: { x: number; y: number } } | null>(
    null,
  );
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [healthOpen, setHealthOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [viewportRescueVisible, setViewportRescueVisible] = useState(false);
  const focusRequest = useGraphStore((state) => state.focusRequest);
  const [expandedUnitIds, setExpandedUnitIds] = useState<Set<string>>(new Set());
  const [collapsedChannelGroups, setCollapsedChannelGroups] = useState<Set<string>>(new Set());
  const [viewContext, setViewContext] = useState<ViewContext | null>(null);
  const toggleChannelGroup = useCallback((label: string) => {
    setCollapsedChannelGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  }, []);

  const toggleUnitExpand = useCallback((unitId: string) => {
    setExpandedUnitIds((prev) => {
      const next = new Set(prev);
      if (next.has(unitId)) {
        next.delete(unitId);
      } else {
        next.add(unitId);
      }
      return next;
    });
  }, []);

  // "Open in chart": jump to a focused home view of just this unit's people.
  // Facilities land in their Department home; shared services in the reporting tree.
  const jumpToUnit = useCallback(
    (unit: ComputedUnit) => {
      const memberIds = unit.members.map((m) => m.id);
      const targetLens = unit.def.type === "facility" ? "department" : "hierarchy";
      setLensStore(targetLens);
      // Apply the focus after the lens-change settles: the search bar resets focusIds
      // on lens change when its box is empty, so set ours once that effect has run.
      setTimeout(() => {
        setViewContext({
          kind: "unit",
          label: unit.def.label,
          count: memberIds.length,
        });
        setLensFilters(targetLens, { focusIds: memberIds });
        fitVisiblePeopleRef.current({ padding: 0.2, duration: 500, maxZoom: 1 });
      }, 160);
    },
    [setLensStore, setLensFilters],
  );
  const [currentZoom, setCurrentZoom] = useState(1);
  const lodBucketRef = useRef<"full" | "medium" | "compact">("full");
  const [teamRootId, setTeamRootId] = useState<string | null>(null);
  const [teamReturnLens, setTeamReturnLens] = useState<LensId | null>(null);
  // The floating Edit panel overlays the right of the canvas; this lets us
  // measure the canvas and pan a freshly selected card out from under it.
  const wrapperRef = useRef<HTMLDivElement>(null);
  // True while jumpToPerson is animating the camera, so the reveal effect
  // doesn't fight it with a second pan.
  const cameraBusyRef = useRef(false);
  // Zoom quantized to 0.05 steps for node data: LOD/label scaling only needs
  // coarse zoom, and feeding the raw value rebuilt every node per wheel frame
  const lodZoom = useMemo(() => Math.round(currentZoom * 20) / 20, [currentZoom]);
  const [lensTransition, setLensTransition] = useState(false);
  const isRestoringViewport = useRef(false);
  const matrixWrapRefreshRef = useRef<Set<LensId>>(new Set());
  const previousLens = useRef(lens);
  const fitVisiblePeopleRef = useRef<(options?: FitPeopleOptions) => void>(() => {});
  const viewportSettleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Briefly enable the glide transition when the lens changes so cards
  // animate from their old positions to the new grouping
  useEffect(() => {
    if (previousLens.current === lens) return;
    previousLens.current = lens;
    setLensTransition(true);
    const timer = setTimeout(() => setLensTransition(false), 850);
    return () => clearTimeout(timer);
  }, [lens]);
  const [quickAddDialog, setQuickAddDialog] = useState<{
    open: boolean;
    mode: 'direct-report' | 'new-person';
    managerId?: string;
    managerName?: string;
    position?: { x: number; y: number };
  }>({ open: false, mode: 'new-person' });

  // Mouse-wheel behavior: zoom (default, mouse-friendly) or pan (trackpad-friendly)
  const [scrollZoom, setScrollZoom] = useState<boolean>(true);
  const [showAllReportingLines, setShowAllReportingLines] = useState(false);
  useEffect(() => {
    setScrollZoom(localStorage.getItem("org-chart-scroll-mode") !== "pan");
  }, []);
  const toggleScrollZoom = useCallback(() => {
    setScrollZoom((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("org-chart-scroll-mode", next ? "zoom" : "pan");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const zoomOut = useCallback(
    () => rfInstance?.zoomOut({ duration: 200 }),
    [rfInstance],
  );
  const zoomIn = useCallback(
    () => rfInstance?.zoomIn({ duration: 200 }),
    [rfInstance],
  );
  const fitToView = useCallback(
    () => fitVisiblePeopleRef.current({ padding: 0.18, duration: 300, minZoom: 0.35, maxZoom: 1.2 }),
    [],
  );

  const paletteActions = useMemo<PaletteAction[]>(
    () => [
      { id: "lens-1", label: "Switch to Classic Hierarchy", hint: "1", run: () => setLensStore("hierarchy") },
      { id: "lens-2", label: "Switch to Brand Lens", hint: "2", run: () => setLensStore("brand") },
      { id: "lens-3", label: "Switch to Channel Lens", hint: "3", run: () => setLensStore("channel") },
      { id: "lens-4", label: "Switch to Department Lens", hint: "4", run: () => setLensStore("department") },
      { id: "lens-5", label: "Switch to Brand × Channel Grid", hint: "5", run: () => setLensStore("matrix") },
      { id: "fit", label: "Fit people", hint: "0", run: fitToView },
      { id: "cleanup", label: "Clean up layout", run: () => cleanupCanvas(lens, "spacious") },
      { id: "health", label: "Open Org Health X-ray", run: () => setHealthOpen(true) },
      { id: "help", label: "Show keyboard shortcuts & guide", hint: "?", run: () => setHelpOpen(true) },
      {
        id: "add-person",
        label: "Add person",
        hint: "N",
        run: () =>
          setQuickAddDialog({
            open: true,
            mode: "new-person",
            position: rfInstance
              ? rfInstance.screenToFlowPosition({
                  x: window.innerWidth / 2,
                  y: window.innerHeight / 2,
                })
              : { x: 400, y: 300 },
          }),
      },
    ],
    [setLensStore, rfInstance, cleanupCanvas, lens, fitToView],
  );

  const lensLayout = lensState?.layout;
  const filters = lensState?.filters;

  useEffect(() => {
    if (!viewContext) return;
    if ((filters?.focusIds?.length ?? 0) > 0) return;
    setViewContext(null);
  }, [viewContext, filters?.focusIds]);

  const personNodes = useMemo(
    () => nodesData.filter((node): node is PersonNode => node.kind === "person"),
    [nodesData],
  );
  const personNameById = useMemo(() => {
    const map = new Map<string, string>();
    personNodes.forEach((node) => map.set(node.id, node.name));
    return map;
  }, [personNodes]);

  // Cross-cutting org units (facilities + shared services) roll up in Brand/Channel/Grid
  // views so dozens of warehouse/production/HR/finance people don't clutter every lane.
  const isCrossCutting = lens === "brand" || lens === "channel" || isGridLens(lens);
  const orgUnits = useMemo(() => computeOrgUnits(personNodes), [personNodes]);
  const unitMemberIds = useMemo(() => unitMemberIdSet(personNodes), [personNodes]);

  const noFocus = (filters?.focusIds?.length ?? 0) === 0;
  // Brand/Channel get the left rail; the Grid gets a full-width foundation band instead
  const showUnitRail =
    (lens === "brand" || lens === "channel") && noFocus && orgUnits.length > 0;
  const showUnitFoundation = isGridLens(lens) && noFocus && orgUnits.length > 0;

  // Dedicated Shared Services view: focus the reporting tree on everyone in the
  // shared-service units (Finance + Admin/HR + IT) at once.
  const openSharedServices = useCallback(() => {
    const ids = orgUnits
      .filter((u) => u.def.type === "shared-service")
      .flatMap((u) => u.members.map((m) => m.id));
    if (ids.length === 0) return;
    setLensStore("hierarchy");
    setTimeout(() => {
      setViewContext({ kind: "shared-services", label: "All shared services", count: ids.length });
      setLensFilters("hierarchy", { focusIds: ids });
      fitVisiblePeopleRef.current({ padding: 0.2, duration: 500, maxZoom: 1 });
    }, 160);
  }, [orgUnits, setLensStore, setLensFilters]);

  // Last rendered position per node, across lenses — used as the glide start
  // point when a lens hasn't been laid out yet
  const lastRenderedPositions = useRef<Record<string, { x: number; y: number }>>({});

  const childMap = useMemo(() => buildChildMap(edgesData), [edgesData]);

  // Direct manager of each person (global reporting chain)
  const parentMap = useMemo(() => {
    const map: Record<string, string> = {};
    edgesData.forEach((edge) => {
      if (edge.metadata.type === "manager" && !(edge.target in map)) {
        map[edge.target] = edge.source;
      }
    });
    return map;
  }, [edgesData]);

  // Hierarchy view: roll each facility / shared service into one container card at the
  // point it enters the reporting tree. Collapsed by default; expandable per anchor.
  const unitAnchors = useMemo(
    () => computeUnitAnchors(personNodes, parentMap, childMap),
    [personNodes, parentMap, childMap],
  );
  const unitAnchorMap = useMemo(
    () => new Map(unitAnchors.map((a) => [a.id, a.def])),
    [unitAnchors],
  );
  // Default facilities/shared services to collapsed containers, once per load, then
  // reflow the hierarchy tight. Routed through the real collapse set so the layout folds.
  const seededAnchorsRef = useRef(false);
  useEffect(() => {
    if (seededAnchorsRef.current) return;
    // Wait until the reporting tree is loaded, or anchors compute wrong
    if (personNodes.length === 0 || Object.keys(parentMap).length === 0) return;
    if (unitAnchors.length === 0) return;
    seededAnchorsRef.current = true;
    const current = useGraphStore.getState().collapsedIds;
    const toAdd = unitAnchors.map((a) => a.id).filter((id) => !current.includes(id));
    if (toAdd.length > 0) addCollapsed(toAdd);
  }, [personNodes.length, parentMap, unitAnchors, addCollapsed]);

  // Hierarchy view: people folded away under collapsed managers (incl. facility anchors)
  const hiddenByCollapse = useMemo(
    () =>
      lens === "hierarchy" &&
      collapsedIds.length > 0 &&
      (filters?.focusIds?.length ?? 0) === 0
        ? collectDescendants(childMap, collapsedIds)
        : null,
    [lens, collapsedIds, childMap, filters?.focusIds],
  );

  // Total subtree size per person, for the "+N" chip on collapsed cards
  const descendantCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const count = (id: string): number => {
      if (counts[id] !== undefined) return counts[id];
      counts[id] = 0; // cycle guard
      counts[id] = (childMap[id] ?? []).reduce((sum, child) => sum + 1 + count(child), 0);
      return counts[id];
    };
    personNodes.forEach((node) => count(node.id));
    return counts;
  }, [childMap, personNodes]);

  const teamTree = useMemo(() => {
    if (!teamRootId) return null;
    const descendantIds = [...collectDescendants(childMap, [teamRootId])];
    const directReportIds = childMap[teamRootId] ?? [];
    const allIds = new Set([teamRootId, ...descendantIds]);
    const visibleIds =
      descendantIds.length > TEAM_TREE_FULL_DESCENDANT_LIMIT
        ? new Set([teamRootId, ...directReportIds])
        : allIds;
    const scopedNodes = nodesData.filter((node) => visibleIds.has(node.id));
    const scopedEdges = edgesData.filter(
      (edge) =>
        edge.metadata.type === "manager" &&
        visibleIds.has(edge.source) &&
        visibleIds.has(edge.target),
    );
    return {
      rootId: teamRootId,
      ids: visibleIds,
      directReportIds,
      descendantIds,
      positions: calculateTeamTreeLayout(scopedNodes, scopedEdges, teamRootId),
    };
  }, [teamRootId, childMap, nodesData, edgesData]);

  // People with reports below the top tier (depth >= 1), used both for the
  // "land collapsed" default and the global Collapse-all control. Folding these
  // leaves the CEO + their direct execs — a narrow skeleton that frames cleanly.
  const collapseTargets = useMemo(() => {
    const depthOf = (id: string) => {
      let depth = 0;
      let cur = parentMap[id];
      const seen = new Set<string>([id]);
      while (cur && !seen.has(cur)) {
        depth += 1;
        seen.add(cur);
        cur = parentMap[cur];
      }
      return depth;
    };
    const top: string[] = [];
    personNodes.forEach((person) => {
      if ((childMap[person.id]?.length ?? 0) === 0) return;
      if (depthOf(person.id) >= 1) top.push(person.id);
    });
    return { top };
  }, [personNodes, parentMap, childMap]);

  // Land on a digestible top-down view the very first time: fold every subtree
  // below the top tier so the canvas opens as a clean, well-framed skeleton
  // (CEO + execs) instead of 250 cards. Gated to once per browser so it never
  // stomps a user's own expand/collapse choices. Re-fits once the collapse
  // reflow settles so the first frame shows the folded view, not a stale crop.
  const seededDepthRef = useRef(false);
  useEffect(() => {
    if (seededDepthRef.current) return;
    if (!rfInstance) return;
    if (personNodes.length === 0 || Object.keys(parentMap).length === 0) return;
    if (collapseTargets.top.length === 0) return;
    seededDepthRef.current = true;
    let alreadySeeded = false;
    try {
      alreadySeeded = !!localStorage.getItem("org-chart-default-collapse-v2");
      if (!alreadySeeded) localStorage.setItem("org-chart-default-collapse-v2", "1");
    } catch {
      alreadySeeded = true; // no storage access → don't surprise-collapse
    }
    if (!alreadySeeded) {
      addCollapsed(collapseTargets.top);
      window.setTimeout(() => {
        fitVisiblePeopleRef.current({ padding: 0.2, duration: 400, maxZoom: 1.2 });
      }, 450);
    }
  }, [rfInstance, personNodes.length, parentMap, collapseTargets.top, addCollapsed]);

  // "Reset view": clear the active subset (search/filter/focus), drop any
  // single-person focus, unfold everything, and reframe the whole org.
  const resetView = useCallback(() => {
    setTeamRootId(null);
    setTeamReturnLens(null);
    setViewContext(null);
    setLensFilters(lens, { focusIds: [], hiddenIds: [], activeTokens: [] });
    clearSelection();
    expandAll();
    setTimeout(() => {
      fitVisiblePeopleRef.current({ padding: 0.15, duration: 400, minZoom: 0.42, maxZoom: 1.2 });
    }, 80);
  }, [lens, setLensFilters, clearSelection, expandAll]);

  useEffect(() => {
    if (teamRootId && lens !== "hierarchy") {
      setTeamRootId(null);
      setTeamReturnLens(null);
      setViewContext(null);
    }
  }, [teamRootId, lens]);

  // Action confirmation toast with one-click Undo
  const [toast, setToast] = useState<{ message: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((message: string) => {
    setToast({ message });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 6000);
  }, []);

  const openSharedServiceGroup = useCallback(
    (memberIds: string[], label: string) => {
      if (memberIds.length === 0) return;
      const focusIds = new Set(memberIds);
      memberIds.forEach((memberId) => {
        collectDescendants(childMap, [memberId]).forEach((descendantId) => focusIds.add(descendantId));
      });
      const focusedMembers = [...focusIds];
      setTeamRootId(null);
      setTeamReturnLens(null);
      clearSelection();
      setLensStore("hierarchy");
      window.setTimeout(() => {
        setViewContext({ kind: "support-pod", label, count: focusedMembers.length });
        setLensFilters("hierarchy", { focusIds: focusedMembers, hiddenIds: [], activeTokens: [] });
        showToast(`Opened ${label} support pod`);
        window.setTimeout(() => {
          fitVisiblePeopleRef.current({ padding: 0.22, duration: 450, maxZoom: 1 });
        }, 180);
      }, 120);
    },
    [childMap, setLensStore, setLensFilters, clearSelection, showToast],
  );

  const closeTeamTree = useCallback(() => {
    const returnLens = teamReturnLens;
    setTeamRootId(null);
    setTeamReturnLens(null);
    setViewContext(null);
    setLensFilters("hierarchy", { focusIds: [], hiddenIds: [], activeTokens: [] });
    if (returnLens && returnLens !== "hierarchy") {
      setLensStore(returnLens);
    }
  }, [teamReturnLens, setLensFilters, setLensStore]);

  const openTeamTree = useCallback(
    (nodeId: string) => {
      setTeamReturnLens((current) => current ?? lens);
      setViewContext(null);
      setLensStore("hierarchy");
      setLensFilters("hierarchy", { focusIds: [], hiddenIds: [], activeTokens: [] });
      expandAll();
      setTeamRootId(nodeId);
      selectNode(nodeId);
      const name = personNameById.get(nodeId) ?? "Selected person";
      showToast(`Opened ${name}'s org view`);
    },
    [lens, setLensStore, setLensFilters, expandAll, selectNode, personNameById, showToast],
  );

  const selectPersonFromCard = useCallback(
    (id: string, additive?: boolean) => {
      if (additive || teamRootId === id || (childMap[id]?.length ?? 0) === 0) {
        selectNode(id, additive);
        return;
      }
      openTeamTree(id);
    },
    [childMap, openTeamTree, selectNode, teamRootId],
  );

  const framePersonContext = useCallback(
    (id: string) => {
      if (!rfInstance || !wrapperRef.current) return;
      const fresh = useGraphStore.getState();
      const positions = teamTree?.positions ?? fresh.document.lens_state[fresh.document.lens]?.layout.positions ?? {};
      const directReports = teamTree?.rootId === id ? teamTree.directReportIds : childMap[id] ?? [];
      const teamTreeFrameIds =
        teamTree?.rootId === id && teamTree.descendantIds.length <= 18
          ? [id, ...teamTree.descendantIds]
          : null;
      const frameIds =
        teamTreeFrameIds ??
        (directReports.length > 0
          ? [id, ...directReports]
          : [parentMap[id], id].filter((value): value is string => Boolean(value)));
      const frames = frameIds
        .map((nodeId) => ({ id: nodeId, position: positions[nodeId] }))
        .filter((item): item is { id: string; position: { x: number; y: number } } => Boolean(item.position));
      if (frames.length === 0) return;

      const rect = wrapperRef.current.getBoundingClientRect();
      const panelWidth = selection.nodeIds.length === 1 ? Math.min(400, rect.width - 32) : 0;
      const availableLeft = rect.left + 48;
      const availableRight = panelWidth > 0 ? rect.right - panelWidth - 48 : rect.right - 48;
      const availableWidth = Math.max(360, availableRight - availableLeft);
      const availableHeight = Math.max(280, rect.height - 160);

      const minX = Math.min(...frames.map((item) => item.position.x));
      const maxX = Math.max(...frames.map((item) => item.position.x + NODE_WIDTH));
      const minY = Math.min(...frames.map((item) => item.position.y));
      const maxY = Math.max(...frames.map((item) => item.position.y + NODE_HEIGHT));
      const boundsWidth = Math.max(NODE_WIDTH, maxX - minX);
      const boundsHeight = Math.max(NODE_HEIGHT, maxY - minY);
      const zoom = Math.min(
        0.95,
        Math.max(
          0.22,
          Math.min((availableWidth * 0.82) / boundsWidth, (availableHeight * 0.72) / boundsHeight),
        ),
      );
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const targetX = availableLeft + availableWidth / 2;
      const targetY = rect.top + rect.height * 0.46;

      cameraBusyRef.current = true;
      rfInstance.setViewport(
        {
          x: targetX - rect.left - centerX * zoom,
          y: targetY - rect.top - centerY * zoom,
          zoom,
        },
        { duration: 420 },
      );
      setTimeout(() => {
        cameraBusyRef.current = false;
      }, 520);
    },
    [rfInstance, childMap, parentMap, selection.nodeIds.length, teamTree],
  );

  // ⌘K palette: fly to a person in the current lens, expanding any collapsed
  // ancestors so they're actually visible when the camera arrives
  const jumpToPerson = useCallback(
    (id: string) => {
      let ancestor = parentMap[id];
      const seen = new Set<string>([id]);
      while (ancestor && !seen.has(ancestor)) {
        if (useGraphStore.getState().collapsedIds.includes(ancestor)) {
          useGraphStore.getState().toggleCollapse(ancestor);
        }
        seen.add(ancestor);
        ancestor = parentMap[ancestor];
      }
      selectNode(id);
      setTimeout(() => framePersonContext(id), 80);
    },
    [parentMap, selectNode, framePersonContext],
  );

  // Selecting a person should make their organization legible, not just keep the
  // selected card visible. Frame the manager plus direct reports in the clear
  // canvas area to the left of the edit panel.
  useEffect(() => {
    if (!rfInstance || cameraBusyRef.current) return;
    if (selection.nodeIds.length !== 1) return;
    framePersonContext(selection.nodeIds[0]);
  }, [selection.nodeIds, rfInstance, framePersonContext]);

  // Header "Find anyone" search asks the canvas to fly to a person; the nonce
  // changes on every request so re-picking the same person still flies there.
  useEffect(() => {
    if (!focusRequest) return;
    if ((childMap[focusRequest.id]?.length ?? 0) > 0) {
      openTeamTree(focusRequest.id);
      return;
    }
    jumpToPerson(focusRequest.id);
  }, [childMap, focusRequest, jumpToPerson, openTeamTree]);

  useEffect(() => {
    if (!teamTree || !rfInstance) return;
    const timers = [80, 420].map((delay) =>
      setTimeout(() => framePersonContext(teamTree.rootId), delay),
    );
    return () => timers.forEach((timer) => clearTimeout(timer));
  }, [teamTree, rfInstance, framePersonContext]);

  // Person focus mode: selecting a single person spotlights their matrix web
  // (manager line, reports, dotted team, sponsor) and dims everyone else.
  const focusedNodeId =
    selection.nodeIds.length === 1 ? selection.nodeIds[0] : null;
  const focusSet = useMemo(() => {
    if (!focusedNodeId) return null;
    const set = new Set<string>([focusedNodeId]);
    collectDescendants(childMap, [focusedNodeId]).forEach((id) => set.add(id));
    edgesData.forEach((edge) => {
      if (edge.source === focusedNodeId) set.add(edge.target);
      if (edge.target === focusedNodeId) set.add(edge.source);
    });
    // Light up the whole manager chain to the top, not just the direct manager,
    // so a focused person's place in the hierarchy reads at a glance.
    let ancestor = parentMap[focusedNodeId];
    const seen = new Set<string>([focusedNodeId]);
    while (ancestor && !seen.has(ancestor)) {
      set.add(ancestor);
      seen.add(ancestor);
      ancestor = parentMap[ancestor];
    }
    return set;
  }, [focusedNodeId, edgesData, parentMap, childMap]);

  // Extent of each lane in the active matrix view, used to detect which lane a
  // card was dropped into for drag-to-reassign. Department lanes can wrap into
  // multiple rows, so hit-testing must account for both axes.
  const laneXRanges = useMemo(() => {
    const dimension = lensToDimension(lens);
    if (!dimension) return null;
    const positions = lensLayout?.positions ?? {};
    const groups = groupNodesByDimension(personNodes, dimension);
    const ranges: Array<{
      key: string;
      minX: number;
      maxX: number;
      minY: number;
      maxY: number;
      centerX: number;
      centerY: number;
    }> = [];
    groups.forEach((members, key) => {
      const xs = members
        .map((m) => positions[m.id]?.x)
        .filter((x): x is number => typeof x === "number");
      const ys = members
        .map((m) => positions[m.id]?.y)
        .filter((y): y is number => typeof y === "number");
      if (xs.length === 0 || ys.length === 0) return;
      const minX = Math.min(...xs) - 80;
      const maxX = Math.max(...xs) + NODE_WIDTH + 80;
      const minY = Math.min(...ys) - 80;
      const maxY = Math.max(...ys) + NODE_HEIGHT + 80;
      ranges.push({
        key,
        minX,
        maxX,
        minY,
        maxY,
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2,
      });
    });
    return { dimension, ranges };
  }, [lens, lensLayout?.positions, personNodes]);

  // Show onboarding for empty canvas
  useEffect(() => {
    if (personNodes.length === 0) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }
  }, [personNodes.length]);

  const visibleViewportPersonIds = useMemo(() => {
    const focusIds = filters?.focusIds ?? [];
    const hiddenIds = new Set(filters?.hiddenIds ?? []);
    return personNodes
      .filter((node) => {
        if (teamTree && !teamTree.ids.has(node.id)) return false;
        if (focusIds.length > 0 && !focusIds.includes(node.id)) return false;
        if (hiddenIds.has(node.id)) return false;
        if (hiddenByCollapse?.has(node.id)) return false;
        return true;
      })
      .map((node) => node.id);
  }, [filters?.focusIds, filters?.hiddenIds, hiddenByCollapse, personNodes, teamTree]);

  const visiblePositionCount = useMemo(() => {
    const positions = lensLayout?.positions ?? {};
    return visibleViewportPersonIds.filter((id) => Boolean(positions[id])).length;
  }, [lensLayout?.positions, visibleViewportPersonIds]);

  const viewportShowsAnyPerson = useCallback(
    (viewport: ViewportState, positions: Record<string, { x: number; y: number }>) => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return true;
      const width = wrapper.clientWidth;
      const height = wrapper.clientHeight;
      if (width <= 0 || height <= 0) return true;
      const inset = 48;
      return visibleViewportPersonIds.some((id) => {
        const position = positions[id];
        if (!position) return false;
        const left = position.x * viewport.zoom + viewport.x;
        const top = position.y * viewport.zoom + viewport.y;
        const right = (position.x + NODE_WIDTH) * viewport.zoom + viewport.x;
        const bottom = (position.y + NODE_HEIGHT) * viewport.zoom + viewport.y;
        return right >= inset && left <= width - inset && bottom >= inset && top <= height - inset;
      });
    },
    [visibleViewportPersonIds],
  );
  const viewportShowsRenderedPerson = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return true;
    const wrapperRect = wrapper.getBoundingClientRect();
    if (wrapperRect.width <= 0 || wrapperRect.height <= 0) return true;
    const inset = 48;
    const personElements = Array.from(wrapper.querySelectorAll<HTMLElement>(".react-flow__node")).filter((element) => {
      const id = element.dataset.id;
      return id ? isPersonFlowNodeId(id) : false;
    });
    if (personElements.length === 0) return false;
    return personElements.some((element) => {
      const rect = element.getBoundingClientRect();
      return (
        rect.right >= wrapperRect.left + inset &&
        rect.left <= wrapperRect.right - inset &&
        rect.bottom >= wrapperRect.top + inset &&
        rect.top <= wrapperRect.bottom - inset
      );
    });
  }, []);
  const viewportRestoreRef = useRef({
    lensLayout,
    currentViewportState,
    viewportShowsAnyPerson,
  });
  useEffect(() => {
    viewportRestoreRef.current = {
      lensLayout,
      currentViewportState,
      viewportShowsAnyPerson,
    };
  });
  const viewportRestoreReadyKey = `${personNodes.length}:${lensLayout ? "ready" : "missing"}:${visiblePositionCount}`;

  const fitVisiblePeople = useCallback(
    (options: FitPeopleOptions = {}) => {
      if (!rfInstance) return;
      const positions = lensLayout?.positions ?? {};
      const nodesToFit = visibleViewportPersonIds
        .filter((id) => Boolean(positions[id]))
        .map((id) => ({ id }));
      const fitOptions = {
        padding: options.padding ?? 0.18,
        duration: options.duration ?? 350,
        minZoom: options.minZoom ?? 0.35,
        maxZoom: options.maxZoom ?? 1.2,
      };

      setViewportRescueVisible(false);
      if (nodesToFit.length > 0) {
        void rfInstance.fitView({
          nodes: nodesToFit,
          includeHiddenNodes: false,
          ...fitOptions,
        });
        return;
      }

      void rfInstance.fitView(fitOptions);
    },
    [rfInstance, lensLayout?.positions, visibleViewportPersonIds],
  );
  fitVisiblePeopleRef.current = fitVisiblePeople;

  const updateViewportRescue = useCallback(
    (viewport: ViewportState) => {
      if (cameraBusyRef.current || isRestoringViewport.current) {
        setViewportRescueVisible(false);
        return false;
      }
      if (visiblePositionCount === 0) {
        setViewportRescueVisible(false);
        return false;
      }
      const latest = viewportRestoreRef.current;
      const positions = latest.lensLayout?.positions ?? {};
      const isBlank =
        !latest.viewportShowsAnyPerson(viewport, positions) ||
        !viewportShowsRenderedPerson();
      setViewportRescueVisible(isBlank);
      return isBlank;
    },
    [visiblePositionCount, viewportShowsRenderedPerson],
  );

  // Auto-layout on first load with spacious preset
  useEffect(() => {
    if (!personNodes.length) return;
    if (teamTree) return;
    if ((filters?.focusIds?.length ?? 0) > 0) return;
    if (!lensLayout) {
      cleanupCanvas(lens, 'spacious');
      return;
    }
    // People folded under a collapsed manager never get positions; only
    // visible people count as "missing" or this would relayout forever
    const missing = personNodes.some(
      (node) => !hiddenByCollapse?.has(node.id) && !lensLayout.positions[node.id],
    );
    if (missing) {
      cleanupCanvas(lens, 'spacious');
    }
  }, [personNodes, lensLayout, cleanupCanvas, lens, hiddenByCollapse, teamTree, filters?.focusIds]);

  // Position the viewport once per lens visit (initial load or lens switch).
  // Deliberately NOT keyed on the whole lensLayout: that object changes every
  // time the viewport is persisted, which previously re-fired fitView ~once a
  // second and yanked the canvas back while the user was panning ("snapping").
  const positionedLensRef = useRef<string | null>(null);
  useEffect(() => {
    if (!rfInstance || personNodes.length === 0) return;
    if (teamTree) return;
    const latest = viewportRestoreRef.current;
    const currentLensLayout = latest.lensLayout;
    if (!currentLensLayout || visiblePositionCount === 0) return;
    if (positionedLensRef.current === lens) return;
    positionedLensRef.current = lens;
    let didPosition = false;

    // Viewport is persisted in the small `currentViewport` key (not the document
    // blob), so prefer it on restore; fall back to any lens-layout viewport.
    const persisted = latest.currentViewportState;
    const persistedIsDefault =
      !persisted ||
      (persisted.x === 0 && persisted.y === 0 && persisted.zoom === 1);
    const target = persistedIsDefault ? currentLensLayout.viewport : persisted;
    const isDefault =
      !target || (target.x === 0 && target.y === 0 && target.zoom === 1);
    const positions = currentLensLayout.positions ?? {};
    const restoreWouldBeBlank = target ? !latest.viewportShowsAnyPerson(target, positions) : false;

    isRestoringViewport.current = true;
    const timer = setTimeout(() => {
      didPosition = true;
      if (isDefault || restoreWouldBeBlank) {
        // Land at a readable zoom rather than crushing a wide org into a 1px ribbon.
        // The explicit "Fit" control uses this same people-first framing.
        // Also refuse stale saved pan/zoom values that would open to empty canvas.
        fitVisiblePeopleRef.current({ padding: 0.15, duration: 350, minZoom: 0.42, maxZoom: 1.2 });
      } else {
        setViewportRescueVisible(false);
        rfInstance.setViewport(
          { x: target.x, y: target.y, zoom: target.zoom },
          { duration: 300 },
        );
      }
      setTimeout(() => {
        isRestoringViewport.current = false;
      }, 400);
    }, 200);

    return () => {
      clearTimeout(timer);
      if (!didPosition && positionedLensRef.current === lens) {
        positionedLensRef.current = null;
      }
      isRestoringViewport.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfInstance, lens, viewportRestoreReadyKey, teamTree]);

  useEffect(() => {
    const dimension = lensToDimension(lens);
    if (!dimension || !personNodes.length || teamTree) return;
    if (matrixWrapRefreshRef.current.has(lens)) return;
    matrixWrapRefreshRef.current.add(lens);

    let shouldRefresh = true;
    try {
      const key = `${MATRIX_WRAP_LAYOUT_STORAGE_KEY}:${lens}`;
      shouldRefresh = localStorage.getItem(key) !== "1";
      if (shouldRefresh) localStorage.setItem(key, "1");
    } catch {
      shouldRefresh = true;
    }
    if (!shouldRefresh) return;

    cleanupCanvas(lens, "spacious");
    positionedLensRef.current = null;
    const timer = window.setTimeout(() => {
      if (dimension === "department") {
        const positions =
          useGraphStore.getState().document.lens_state[lens]?.layout.positions ?? {};
        const points = Object.values(positions);
        if (points.length > 0) {
          const minX = Math.min(...points.map((point) => point.x));
          const minY = Math.min(...points.map((point) => point.y));
          const zoom = wrapperRef.current && wrapperRef.current.clientWidth < 900 ? 0.34 : 0.5;
          rfInstance?.setViewport(
            {
              x: 120 - minX * zoom,
              y: 168 - minY * zoom,
              zoom,
            },
            { duration: 350 },
          );
          return;
        }
      }
      fitVisiblePeopleRef.current({ padding: 0.18, duration: 350, minZoom: 0.35, maxZoom: 1.15 });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [lens, personNodes.length, cleanupCanvas, rfInstance, teamTree]);

  const highlightTokens = useMemo(() => {
    if (!filters?.activeTokens?.length) return new Map<string, string[]>();
    const tokensByNode = new Map<string, string[]>();
    personNodes.forEach((node) => {
      const matched = filters.activeTokens.filter((token) =>
        isTokenMatchForLens(node, token, lens),
      );
      if (matched.length) {
        tokensByNode.set(node.id, matched);
      }
    });
    return tokensByNode;
  }, [filters?.activeTokens, personNodes, lens]);

  const computedNodes = useMemo<Node[]>(() => {
    // Grid lens recomputes positions fresh when a channel group is collapsed so the
    // cards land in the merged group column (matching the recomputed geometry).
    const basePositions =
      teamTree?.positions ??
      (isGridLens(lens) && collapsedChannelGroups.size > 0
        ? calculateGridLayout(nodesData, collapsedChannelGroups)
        : lensLayout?.positions ?? {});
    const focusIds = filters?.focusIds ?? [];
    const hiddenIds = filters?.hiddenIds ?? [];
    const dimension = lensToDimension(lens);
    
    // Filter nodes based on focusIds or hiddenIds
    let filteredNodes = personNodes;
    if (teamTree) {
      filteredNodes = filteredNodes.filter((node) => teamTree.ids.has(node.id));
    }
    if (focusIds.length > 0) {
      filteredNodes = filteredNodes.filter((node) => focusIds.includes(node.id));
    }
    if (hiddenIds.length > 0) {
      filteredNodes = filteredNodes.filter((node) => !hiddenIds.includes(node.id));
    }
    if (hiddenByCollapse) {
      filteredNodes = filteredNodes.filter((node) => !hiddenByCollapse.has(node.id));
    }

    const positions =
      focusIds.length > 0 && !teamTree
        ? dimension
          ? calculateMatrixLayout(filteredNodes, edgesData, dimension)
          : (() => {
              const scopedEdges = edgesData.filter(
                (edge) =>
                  edge.metadata.type === "manager" &&
                  focusIds.includes(edge.source) &&
                  focusIds.includes(edge.target),
              );
              const childIds = new Set(scopedEdges.map((edge) => edge.target));
              const roots = filteredNodes.filter((node) => !childIds.has(node.id));
              return roots.length === 1
                ? calculateTeamTreeLayout(filteredNodes, scopedEdges, roots[0].id)
                : calculateLayout(filteredNodes, scopedEdges);
            })()
        : basePositions;

    // Roll up facilities / shared services into single cards in cross-cutting views,
    // removing their members from the brand/channel lanes. Skipped while focusing.
    const rollUp = isCrossCutting && focusIds.length === 0 && orgUnits.length > 0;
    if (rollUp) {
      filteredNodes = filteredNodes.filter((node) => !unitMemberIds.has(node.id));
    }

    const personFlowNodes: Node[] = filteredNodes.map((node) => {
      const position =
        positions[node.id] ?? lastRenderedPositions.current[node.id] ?? { x: 0, y: 0 };
      lastRenderedPositions.current[node.id] = position;
      const accent = getAccentColor(node, lens);
      
      const data: HierarchyNodeData = {
        node,
        lens,
        accentColor: accent,
        emphasisLabel: getPrimaryLabel(node, lens),
        isSelected: selection.nodeIds.includes(node.id),
        highlightTokens: highlightTokens.get(node.id) ?? [],
        zoom: lodZoom, // Pass zoom for LOD rendering
        reportCount: lens === "hierarchy" ? childMap[node.id]?.length ?? 0 : 0,
        hiddenCount: descendantCounts[node.id] ?? 0,
        isCollapsed: collapsedIds.includes(node.id),
        onToggleCollapse: lens === "hierarchy" ? toggleCollapse : undefined,
        // When this node is a facility / shared-service anchor, render it as a container
        unit: lens === "hierarchy" ? unitAnchorMap.get(node.id) : undefined,
        actions: {
          addDirectReport: (managerId) => {
            const manager = personNodes.find((n) => n.id === managerId);
            setQuickAddDialog({
              open: true,
              mode: 'direct-report',
              managerId,
              managerName: manager?.name,
              position: offsetPosition(position, { x: 120, y: 160 }),
            });
          },
          addManager: (targetId) => {
            const newId = addPerson({
              name: "New manager",
              title: "Role",
              brands: [],
              channels: [],
              departments: [],
              position: offsetPosition(position, { x: -160, y: -160 }),
            });
            addRelationship(newId, targetId, "manager");
            setSelection({ nodeIds: [newId], edgeIds: [] });
          },
          addDotted: (targetId) => {
            const newId = addPerson({
              name: "New dotted-line",
              title: "Advisor",
              brands: [],
              channels: [],
              departments: [],
              position: offsetPosition(position, { x: -180, y: 140 }),
            });
            addRelationship(newId, targetId, "dotted");
            setSelection({ nodeIds: [newId], edgeIds: [] });
          },
          convertToGroup: () => {
            // placeholder: converting to group requires dedicated flow
            addTagToNode(node.id, "Group candidate");
          },
          duplicate: (nodeId) => duplicateNodes([nodeId]),
          copy: (nodeId) => copyNodesById([nodeId]),
          delete: removeNode,
          lockToggle: toggleNodeLock,
          colorTag: addTagToNode,
          openEditor: (nodeId) => selectNode(nodeId),
          copySettings: (nodeId) => {
            copyPersonSettings(nodeId);
            showToast("Settings copied — right-click another person to paste");
          },
          pasteSettings: (nodeId) => {
            const clip = useGraphStore.getState().settingsClipboard;
            if (!clip) {
              showToast("Copy a person's settings first");
              return;
            }
            // Paste onto the multi-selection if this node is part of it, else just this one
            const sel = useGraphStore.getState().selection.nodeIds;
            const targets = sel.includes(nodeId) && sel.length > 1 ? sel : [nodeId];
            applyToPeople(targets, () => buildSettingsPatch(clip, ["brand", "channel", "department", "tier", "location"]));
            showToast(`Pasted ${clip.sourceName}'s settings onto ${targets.length} ${targets.length === 1 ? "person" : "people"}`);
          },
        },
        onSelect: (id, additive) => {
          selectPersonFromCard(id, additive);
        },
      };
      
      const dimmed = focusSet ? !focusSet.has(node.id) : false;

      return {
        id: node.id,
        type: "hierarchyNode",
        position,
        data,
        draggable: !node.locked,
        selected: selection.nodeIds.includes(node.id),
        // Only carry an opacity/transition when focus mode is actually dimming
        // cards. Leaving a transition on all 250 nodes promotes each to its own
        // GPU layer, which the compositor evicts (cards/text blank) while the
        // viewport transforms during pan/zoom.
        style: focusSet
          ? { opacity: dimmed ? 0.12 : 1, transition: "opacity 0.3s ease-in-out" }
          : undefined,
      };
    });

    // Brand × Channel grid: draw row bands (brands) and column bands (channels)
    if (isGridLens(lens)) {
      const frame = buildGridFrameNodes(personNodes, lodZoom, collapsedChannelGroups, toggleChannelGroup);
      return [...frame, ...personFlowNodes];
    }

    // Matrix views: draw a labeled swim lane behind each brand/channel/department group
    if (!dimension) {
      return personFlowNodes;
    }
    const laneNodes = buildLaneNodes(
      filteredNodes,
      positions,
      dimension,
      mirrorLanes && focusIds.length === 0,
      openSharedServiceGroup,
      focusSet,
      lodZoom,
    );
    return [...laneNodes, ...personFlowNodes];
  }, [
    mirrorLanes,
    focusSet,
    personNodes,
    teamTree,
    selection.nodeIds,
    lensLayout?.positions,
    lens,
    highlightTokens,
    lodZoom,
    addPerson,
    addRelationship,
    duplicateNodes,
    openSharedServiceGroup,
    copyNodesById,
    removeNode,
    toggleNodeLock,
    addTagToNode,
    selectNode,
    selectPersonFromCard,
    setSelection,
    isCrossCutting,
    orgUnits,
    unitMemberIds,
    unitAnchorMap,
    collapsedChannelGroups,
    toggleChannelGroup,
    nodesData,
    filters?.focusIds,
    filters?.hiddenIds,
    edgesData,
    hiddenByCollapse,
    childMap,
    descendantCounts,
    collapsedIds,
    toggleCollapse,
  ]);

  // Local node state so React Flow position changes (dragging) render per
  // frame; re-synced from the store-derived nodes whenever those change
  const [rfNodes, setRfNodes] = useState<Node[]>(computedNodes);
  useEffect(() => {
    setRfNodes(computedNodes);
  }, [computedNodes]);

  const edges = useMemo<Edge[]>(() => {
    const activeTokens = filters?.activeTokens ?? [];
    const focusIds = filters?.focusIds ?? [];

    const rollUp = isCrossCutting && (filters?.focusIds?.length ?? 0) === 0 && orgUnits.length > 0;
    let visibleEdges = hiddenByCollapse
      ? edgesData.filter(
          (edge) => !hiddenByCollapse.has(edge.source) && !hiddenByCollapse.has(edge.target),
        )
      : edgesData;
    if (rollUp) {
      // Drop edges that touch rolled-up unit members so no lines dangle to the rail
      visibleEdges = visibleEdges.filter(
        (edge) => !unitMemberIds.has(edge.source) && !unitMemberIds.has(edge.target),
      );
    }
    if (teamTree) {
      visibleEdges = visibleEdges.filter(
        (edge) =>
          edge.metadata.type === "manager" &&
          teamTree.ids.has(edge.source) &&
          teamTree.ids.has(edge.target),
      );
    }
    if (!teamTree && focusIds.length > 0) {
      visibleEdges = visibleEdges.filter(
        (edge) => focusIds.includes(edge.source) && focusIds.includes(edge.target),
      );
    }
    return visibleEdges.flatMap((edge) => {
      const marker = markerByType[edge.metadata.type] ?? markerByType.manager;
      const color = RELATIONSHIP_COLORS[edge.metadata.type] ?? "#94a3b8";
      const isGhost =
        activeTokens.length > 0 &&
        !doesEdgeMatchTokens(edge, personNodes, activeTokens, lens);
      
      // Use custom edge type based on relationship
      const edgeType = edge.metadata.type === 'sponsor' ? 'sponsor' : 
                       edge.metadata.type === 'dotted' ? 'dotted' : 
                       'manager';
      
      // In matrix views the dotted/sponsor relationships are the story, so fade
      // the within-lane reporting lines and let cross-lane links stand out
      const isMatrixView = lens !== "hierarchy";
      const isManager = edge.metadata.type === "manager";

      // Focus mode: spotlight the selected person's relationships and the manager
      // chain they sit in (both endpoints in the focus set), fade everything else.
      const isIncidentToFocus =
        !!focusSet && focusSet.has(edge.source) && focusSet.has(edge.target);
      const isDirectFocusedManagerEdge =
        isManager &&
        !!focusedNodeId &&
        (edge.source === focusedNodeId || edge.target === focusedNodeId);
      if (isMatrixView && !showAllReportingLines && (!focusSet || !isIncidentToFocus)) {
        return [];
      }

      const dimmedManager = isMatrixView && isManager && !isIncidentToFocus;
      let opacity = isGhost || edge.metadata.ghost ? 0.3 : dimmedManager ? 0.14 : 0.9;
      if (focusedNodeId) {
        opacity = isIncidentToFocus ? 0.95 : 0.05;
      }

      const sourceName = personNameById.get(edge.source) ?? "Manager";
      const targetName = personNameById.get(edge.target) ?? "Report";

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edgeType,
        data: {
          ...edge,
          relationshipLabel:
            edge.metadata.type === "manager"
              ? `${targetName} reports to ${sourceName}`
              : edge.metadata.label,
          showLabel: !teamTree && isDirectFocusedManagerEdge,
        },
        animated: edge.metadata.type === "dotted" && lodZoom > 0.5,
        markerEnd: edge.metadata.type === 'sponsor' ? undefined : { // sponsor uses custom diamond marker
          type: MarkerType.ArrowClosed,
          width: marker.width,
          height: marker.height,
          color,
        },
        style: {
          ...baseEdgeStyle,
          stroke: color,
          opacity,
          strokeWidth: isIncidentToFocus ? 3.5 : baseEdgeStyle.strokeWidth,
        },
        selectable: true,
        selected: selection.edgeIds.includes(edge.id),
        zIndex: isIncidentToFocus ? 10 : 0,
      };
    });
  }, [
    edgesData,
    filters?.activeTokens,
    personNodes,
    personNameById,
    teamTree,
    lens,
    selection.edgeIds,
    lodZoom,
    focusedNodeId,
    focusSet,
    showAllReportingLines,
    hiddenByCollapse,
    isCrossCutting,
    orgUnits,
    unitMemberIds,
    filters?.focusIds,
  ]);

  // Handle node drag stop - persist positions (the whole dragged selection),
  // and in matrix views reassign each person to the lane they were dropped into
  const handleNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node, draggedNodes: Node[]) => {
      const moved = draggedNodes?.length ? draggedNodes : [node];
      moved.forEach((item) => updateNodePosition(item.id, item.position));

      if (!laneXRanges || laneXRanges.ranges.length === 0) return;
      const reassigned: Array<{ name: string; lane: string }> = [];
      moved.forEach((item) => {
        const person = personNodes.find((n) => n.id === item.id);
        if (!person) return;

        const dropX = item.position.x + NODE_WIDTH / 2;
        const dropY = item.position.y + NODE_HEIGHT / 2;
        let target = laneXRanges.ranges.find(
          (r) => dropX >= r.minX && dropX <= r.maxX && dropY >= r.minY && dropY <= r.maxY,
        );
        if (!target) {
          // Dropped in the gap between lanes — snap to the nearest one
          target = laneXRanges.ranges.reduce((best, r) => {
            const distance = Math.hypot(dropX - r.centerX, dropY - r.centerY);
            const bestDistance = Math.hypot(dropX - best.centerX, dropY - best.centerY);
            return distance < bestDistance ? r : best;
          });
        }
        if (!target || target.key === UNASSIGNED_GROUP_KEY) return;
        if (getGroupKey(person, laneXRanges.dimension) === target.key) return;

        reassignToLane(item.id, laneXRanges.dimension, target.key);
        reassigned.push({ name: person.name, lane: target.key });
      });
      if (reassigned.length === 1) {
        showToast(`Moved ${reassigned[0].name} → ${reassigned[0].lane}`);
      } else if (reassigned.length > 1) {
        showToast(`Moved ${reassigned.length} people → ${reassigned[0].lane}`);
      }
    },
    [updateNodePosition, laneXRanges, personNodes, reassignToLane, showToast],
  );

  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    // Apply changes to the local copy so cards follow the cursor while
    // dragging; the store is only written on drag stop
    setRfNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  // Keep the store's selection in sync with React Flow's (shift+drag box
  // selection, shift-click), ignoring lane backgrounds and mirror cards
  const handleSelectionChange = useCallback(
    ({ nodes: selectedNodes }: OnSelectionChangeParams) => {
      const ids = selectedNodes
        .map((n) => n.id)
        .filter(isPersonFlowNodeId)
        .sort();
      const current = [...selection.nodeIds].sort();
      if (ids.length === current.length && ids.every((id, i) => id === current[i])) {
        return;
      }
      // Only push multi-selections (or shrinking ones) from React Flow; single
      // clicks are handled by the cards' own onSelect
      if (ids.length > 1 || (ids.length === 0 && current.length > 1)) {
        setSelection({ nodeIds: ids, edgeIds: [] });
      }
    },
    [selection.nodeIds, setSelection],
  );

  const handleEdgesChange = useCallback(() => {
    // Relationships managed via dedicated handlers.
  }, []);

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      const type = deduceRelationshipType(connection);
      if (!type) return;
      if (type === "manager") {
        if (connection.source === connection.target) return;
        if (isDescendant(childMap, connection.target, connection.source)) {
          showToast("Cannot create a reporting loop. Choose a different manager.");
          return;
        }
      }
      addRelationship(connection.source, connection.target, type);
      setSelection({ edgeIds: [], nodeIds: [connection.target] });
    },
    [addRelationship, childMap, setSelection, showToast],
  );

  const handleEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      deleted.forEach((edge) => removeRelationship(edge.id));
    },
    [removeRelationship],
  );

  const handleNodesDelete = useCallback(
    (deleted: Node[]) => {
      const people = deleted.filter((node) => node.id.startsWith("person-"));
      deleted.forEach((node) => removeNode(node.id));
      if (people.length === 1) {
        const person = personNodes.find((n) => n.id === people[0].id);
        showToast(`Deleted ${person?.name ?? "1 person"}`);
      } else if (people.length > 1) {
        showToast(`Deleted ${people.length} people`);
      }
    },
    [removeNode, personNodes, showToast],
  );

  const handlePaneClick = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      selectNode(node.id);
    },
    [selectNode],
  );

  const handleNodeDoubleClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      if (!isPersonFlowNodeId(node.id)) return;
      selectPersonFromCard(node.id);
    },
    [selectPersonFromCard],
  );

  const handleEdgeContextMenu = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.preventDefault();
    selectEdge(edge.id);
    setEdgeMenu({ edge, position: { x: event.clientX, y: event.clientY } });
  }, [selectEdge]);

  const handleEdgeMenuAction = useCallback(
    (action: "manager" | "sponsor" | "dotted" | "delete") => {
      if (!edgeMenu?.edge) return;
      if (action === "delete") {
        removeRelationship(edgeMenu.edge.id);
      } else {
        updateRelationship(edgeMenu.edge.id, { type: action });
      }
      setEdgeMenu(null);
    },
    [edgeMenu, removeRelationship, updateRelationship],
  );

  const handlePaneContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setCanvasMenu({
      open: true,
      clientX: event.clientX,
      clientY: event.clientY,
    });
  }, []);

  const flowPositionFromClient = useCallback(
    (point: { x: number; y: number }) => {
      if (!rfInstance) return { x: 0, y: 0 };
      return rfInstance.screenToFlowPosition(point);
    },
    [rfInstance],
  );

  // Track viewport changes (lightweight, no document updates)
  useEffect(() => {
    if (!rfInstance || isRestoringViewport.current) return;
    
    const viewport = rfInstance.getViewport();
    setCurrentZoom(viewport.zoom);
    // Use lightweight viewport update to avoid document re-renders
    setCurrentViewport(viewport);
  }, [rfInstance, setCurrentViewport]);
  
  // Viewport persistence happens on settle (onMoveEnd → setCurrentViewport),
  // which writes the small `currentViewport` key rather than re-serializing the
  // whole document every second mid-pan. The old 1s interval that rewrote the
  // document blob during the pan gesture was removed for that reason.
  useEffect(
    () => () => {
      if (viewportSettleTimerRef.current) clearTimeout(viewportSettleTimerRef.current);
    },
    [],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      // "?" opens the shortcuts & guide
      if (event.key === "?") {
        event.preventDefault();
        setHelpOpen(true);
        return;
      }

      // Cmd/Ctrl + Z undo, Cmd/Ctrl + Shift + Z (or Cmd/Ctrl + Y) redo
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
        return;
      }

      // Cmd/Ctrl + D to duplicate
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "d") {
        event.preventDefault();
        if (selection.nodeIds.length) {
          duplicateNodes(selection.nodeIds);
        }
        return;
      }

      // Zoom shortcuts: "-" out, "+"/"=" in, "0" fit to view
      if (!event.metaKey && !event.ctrlKey && !event.altKey) {
        if (event.key === "-" || event.key === "_") {
          event.preventDefault();
          rfInstance?.zoomOut({ duration: 200 });
          return;
        }
        if (event.key === "=" || event.key === "+") {
          event.preventDefault();
          rfInstance?.zoomIn({ duration: 200 });
          return;
        }
        if (event.key === "0") {
          event.preventDefault();
          fitToView();
          return;
        }
      }

      // N to add new person at center
      if (event.key.toLowerCase() === "n" && !event.shiftKey && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        const flowPoint = rfInstance
          ? rfInstance.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
          : { x: 400, y: 300 };
        setQuickAddDialog({
          open: true,
          mode: 'new-person',
          position: flowPoint,
        });
        return;
      }

      // R to add direct report to selected node
      if (event.key.toLowerCase() === "r" && selection.nodeIds.length === 1) {
        event.preventDefault();
        const selectedNode = personNodes.find((n) => n.id === selection.nodeIds[0]);
        if (selectedNode) {
          const positions = lensLayout?.positions ?? {};
          const position = positions[selectedNode.id] ?? { x: 0, y: 0 };
          setQuickAddDialog({
            open: true,
            mode: 'direct-report',
            managerId: selectedNode.id,
            managerName: selectedNode.name,
            position: offsetPosition(position, { x: 120, y: 160 }),
          });
        }
        return;
      }

      // M to add manager to selected node
      if (event.key.toLowerCase() === "m" && selection.nodeIds.length === 1) {
        event.preventDefault();
        const selectedNode = personNodes.find((n) => n.id === selection.nodeIds[0]);
        if (selectedNode) {
          const positions = lensLayout?.positions ?? {};
          const position = positions[selectedNode.id] ?? { x: 0, y: 0 };
          const newId = addPerson({
            name: "New manager",
            title: "Role",
            brands: [],
            channels: [],
            departments: [],
            position: offsetPosition(position, { x: -160, y: -160 }),
          });
          addRelationship(newId, selectedNode.id, "manager");
          setSelection({ nodeIds: [newId], edgeIds: [] });
        }
        return;
      }
    },
    [
      selection.nodeIds,
      duplicateNodes,
      rfInstance,
      addPerson,
      personNodes,
      lensLayout,
      addRelationship,
      setSelection,
      undo,
      redo,
      fitToView,
    ],
  );

  // Canvas shortcuts must work without the canvas having DOM focus (clicking the
  // React Flow pane leaves focus on <body>), so listen at the document level
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }
      if (quickAddDialog.open) return;
      handleKeyDown(event as unknown as React.KeyboardEvent);
    };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [handleKeyDown, quickAddDialog.open]);

  const handleQuickAddSave = (data: QuickAddPersonData) => {
    const newId = addPerson({
      name: data.name,
      title: data.title,
      brands: data.brands,
      primaryBrand: data.primaryBrand,
      channels: data.channels,
      primaryChannel: data.primaryChannel,
      departments: data.departments,
      primaryDepartment: data.primaryDepartment,
      tier: data.tier,
      location: data.location,
      position: quickAddDialog.position,
    });

    // If adding a direct report, create the relationship
    if (quickAddDialog.mode === 'direct-report' && quickAddDialog.managerId) {
      addRelationship(quickAddDialog.managerId, newId, 'manager');
    }

    setSelection({ nodeIds: [newId], edgeIds: [] });
    setQuickAddDialog({ open: false, mode: 'new-person' });
  };

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <div
          ref={wrapperRef}
          className={[
            "relative h-full min-h-[720px] w-full overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 shadow-md ring-1 ring-black/5 dark:border-white/10 dark:bg-slate-950/70 dark:ring-white/10",
            lensTransition ? "lens-transition" : "",
            className ?? "",
          ].join(" ")}
          style={style}
          onContextMenu={handlePaneContextMenu}
        >
          <ReactFlow
            nodes={rfNodes}
            edges={edges}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            nodeTypes={nodeTypes as any}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            edgeTypes={edgeTypes as any}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onNodeDragStop={handleNodeDragStop}
            onConnect={handleConnect}
            onEdgesDelete={handleEdgesDelete}
            onNodesDelete={handleNodesDelete}
            onPaneClick={handlePaneClick}
            onSelectionChange={handleSelectionChange}
            onNodeContextMenu={handleNodeContextMenu}
            onNodeDoubleClick={handleNodeDoubleClick}
            onEdgeContextMenu={handleEdgeContextMenu}
            onMove={(_, viewport) => {
              // Per-frame React state writes fight React Flow's CSS transform and cause
              // flicker. During the gesture only re-render when the LOD bucket flips.
              const bucket =
                viewport.zoom > 0.6 ? "full" : viewport.zoom >= 0.45 ? "medium" : "compact";
              if (bucket !== lodBucketRef.current) {
                lodBucketRef.current = bucket;
                setCurrentZoom(viewport.zoom);
              }
            }}
            onMoveEnd={(_, viewport) => {
              // Settle once when movement stops: exact zoom (counter-scaling, %) + persist
              setCurrentZoom(viewport.zoom);
              if (viewportSettleTimerRef.current) clearTimeout(viewportSettleTimerRef.current);
              viewportSettleTimerRef.current = setTimeout(() => {
                const isBlankViewport = updateViewportRescue(viewport);
                if (!isBlankViewport) setCurrentViewport(viewport);
                viewportSettleTimerRef.current = null;
              }, 80);
            }}
            nodesDraggable
            nodesConnectable
            elementsSelectable
            selectNodesOnDrag={false}
            elevateEdgesOnSelect={false}
            onlyRenderVisibleElements
            connectionMode={ConnectionMode.Loose}
            fitView
            fitViewOptions={{ padding: 0.2, maxZoom: 1.5, minZoom: 0.5 }}
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            panOnScroll={!scrollZoom}
            zoomOnScroll={scrollZoom}
            panOnDrag={[0, 1, 2]}
            zoomOnPinch
            deleteKeyCode={["Backspace", "Delete"]}
            proOptions={{ hideAttribution: true }}
            minZoom={0.04}
            maxZoom={2}
            defaultEdgeOptions={{ type: "manager" }}
            onInit={setRfInstance}
            className="bg-transparent"
          >
            <Background
              variant={lensLayout?.showGrid ? BackgroundVariant.Dots : BackgroundVariant.Lines}
              gap={lensLayout?.showGrid ? 22 : 80}
              size={lensLayout?.showGrid ? 1 : 0.5}
              color={lensLayout?.showGrid ? "#cbd5f5" : "#e2e8f0"}
            />
            <MiniMap
              className="!bottom-6 !right-6 rounded-2xl border border-slate-200 bg-white/90 text-slate-600 shadow-sm dark:border-white/10 dark:bg-slate-900/80"
              nodeStrokeColor={(n) => (n.data?.accentColor as string) ?? "#64748b"}
              nodeColor={(n) => (n.data?.accentColor as string) ?? "#cbd5f5"}
              maskColor="rgba(15, 23, 42, 0.08)"
              pannable
              zoomable
            />
            {/* Matrix-lens controls: keep reporting lines intentional instead of
                drawing an ambiguous all-org web across unrelated lanes. */}
            {lens !== "hierarchy" && personNodes.length > 0 && (
              <div className="absolute left-6 top-6 z-30 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAllReportingLines((value) => !value)}
                  aria-pressed={showAllReportingLines}
                  aria-label={`Relationship lines: ${showAllReportingLines ? "all" : "selected context only"}`}
                  className={[
                    "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold shadow-sm ring-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400",
                    showAllReportingLines
                      ? "border-sky-300 bg-sky-50 text-sky-800 ring-sky-200 hover:bg-sky-100 dark:border-sky-400/30 dark:bg-sky-500/20 dark:text-sky-200 dark:ring-sky-400/20"
                      : "border-slate-200 bg-white/90 text-slate-700 ring-slate-200 hover:bg-white dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-200 dark:ring-white/10",
                  ].join(" ")}
                  title={
                    showAllReportingLines
                      ? "Showing every relationship line in this lens"
                      : "Showing relationship lines only for the selected person or team"
                  }
                >
                  <span
                    aria-hidden
                    className={[
                      "inline-block h-2 w-2 rounded-full",
                      showAllReportingLines ? "bg-sky-500" : "bg-slate-400 dark:bg-slate-500",
                    ].join(" ")}
                  />
                  Relationships: {showAllReportingLines ? "All" : "Focus"}
                </button>
                <button
                  type="button"
                  onClick={toggleMirrorLanes}
                  aria-pressed={mirrorLanes}
                  aria-label={`Show people in all assigned lanes: ${mirrorLanes ? "on" : "off"}`}
                  className={[
                    "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold shadow-sm ring-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400",
                    mirrorLanes
                      ? "border-sky-300 bg-sky-50 text-sky-800 ring-sky-200 hover:bg-sky-100 dark:border-sky-400/30 dark:bg-sky-500/20 dark:text-sky-200 dark:ring-sky-400/20"
                      : "border-slate-200 bg-white/90 text-slate-600 ring-slate-200 hover:bg-white dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-300 dark:ring-white/10",
                  ].join(" ")}
                  title="Show ghost cards for people in every lane they're assigned to, not just their primary lane"
                >
                  <span
                    className={[
                      "inline-block h-2 w-2 rounded-full",
                      mirrorLanes ? "bg-sky-500" : "bg-slate-300 dark:bg-slate-600",
                    ].join(" ")}
                  />
                  Show in all lanes: {mirrorLanes ? "On" : "Off"}
                </button>
              </div>
            )}
            {/* Hierarchy view: global fold control so the whole org can collapse to
                its top tiers or expand back out in one click */}
            {lens === "hierarchy" && personNodes.length > 0 && (
              <div className="absolute left-6 top-6 z-30 flex items-center gap-0.5 rounded-full border border-slate-200 bg-white/90 p-1 text-xs font-semibold text-slate-600 shadow-sm ring-1 ring-slate-100 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-300 dark:ring-white/10">
                <button
                  type="button"
                  onClick={() => addCollapsed(collapseTargets.top)}
                  title="Fold every team down to the top levels"
                  aria-label="Collapse all teams to the top levels"
                  className="rounded-full px-3 py-1 transition hover:bg-slate-100 dark:hover:bg-white/10"
                >
                  Collapse all
                </button>
                <span className="h-4 w-px bg-slate-200 dark:bg-white/10" />
                <button
                  type="button"
                  onClick={() => expandAll()}
                  disabled={collapsedIds.length === 0}
                  title="Show every report"
                  aria-label="Expand all teams to show every report"
                  className="rounded-full px-3 py-1 transition hover:bg-slate-100 disabled:cursor-default disabled:opacity-40 dark:hover:bg-white/10"
                >
                  Expand all
                </button>
              </div>
            )}
            {/* Unified top-right tools dock: one labeled home for the canvas
                actions instead of buttons scattered around every corner */}
            {personNodes.length > 0 && (
              <div className="absolute right-6 top-6 z-30 flex items-center gap-0.5 rounded-full border border-slate-200 bg-white/90 p-1 text-xs font-semibold text-slate-600 shadow-sm ring-1 ring-slate-100 backdrop-blur dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-300 dark:ring-white/10">
                <button
                  type="button"
                  onClick={() => setHelpOpen(true)}
                  title="Shortcuts & guide (?)"
                  aria-label="Open keyboard shortcuts and guide"
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition hover:bg-slate-100 dark:hover:bg-white/10"
                >
                  <QuestionMarkCircledIcon className="h-3.5 w-3.5" aria-hidden />
                  Help
                </button>
                <span className="h-4 w-px bg-slate-200 dark:bg-white/10" />
                <button
                  type="button"
                  onClick={() => setHealthOpen((v) => !v)}
                  title="Span outliers, matrix overload, coverage gaps"
                  aria-label="Toggle Org Health panel"
                  aria-pressed={healthOpen}
                  className={[
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition",
                    healthOpen
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200"
                      : "hover:bg-slate-100 dark:hover:bg-white/10",
                  ].join(" ")}
                >
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                  Org Health
                </button>
                <button
                  type="button"
                  onClick={openSharedServices}
                  title="See all shared services (Finance, HR, IT) together"
                  aria-label="Open Shared Services view"
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-violet-700 transition hover:bg-violet-50 dark:text-violet-200 dark:hover:bg-violet-500/10"
                >
                  <span aria-hidden>🔗</span> Shared Services
                </button>
                <span className="h-4 w-px bg-slate-200 dark:bg-white/10" />
                <CleanupButton
                  onCleanup={(mode) => {
                    cleanupCanvas(lens, mode);
                    setTimeout(() => {
                      fitVisiblePeopleRef.current({ padding: 0.2, duration: 400, maxZoom: 1.5 });
                    }, 100);
                  }}
                />
              </div>
            )}
          </ReactFlow>
          <EdgeContextMenu
            edgeMenu={edgeMenu}
            onClose={() => setEdgeMenu(null)}
            onAction={handleEdgeMenuAction}
          />
          
          <OrgHealthPanel open={healthOpen} onClose={() => setHealthOpen(false)} />

          <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />

          {/* Fixed rail of rolled-up facilities & shared services (brand/channel lenses) */}
          {showUnitRail && (
            <UnitRail
              units={orgUnits}
              expanded={expandedUnitIds}
              onToggleExpand={toggleUnitExpand}
              onJump={jumpToUnit}
              onSelectMember={selectPersonFromCard}
              onOpenSharedServices={openSharedServices}
            />
          )}

          {/* Grid lens: shared services & facilities as the foundation beneath the matrix */}
          {showUnitFoundation && (
            <UnitFoundation
              units={orgUnits}
              onJump={jumpToUnit}
              onOpenSharedServices={openSharedServices}
            />
          )}

          {/* Onboarding overlay for empty canvas */}
          <OnboardingOverlay show={showOnboarding} onDismiss={() => setShowOnboarding(false)} />
          
          {/* Zoom controls: explicit buttons, %, fit, and scroll-mode toggle */}
          {personNodes.length > 0 && (
            <div className="pointer-events-none absolute bottom-6 left-1/2 z-30 -translate-x-1/2">
              <div className="pointer-events-auto flex items-center gap-0.5 rounded-full border border-slate-200 bg-white p-1 text-slate-600 shadow-lg ring-1 ring-slate-100 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200 dark:ring-white/10">
                <button
                  type="button"
                  onClick={zoomOut}
                  title="Zoom out (−)"
                  aria-label="Zoom out"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-lg font-medium transition hover:bg-slate-100 dark:hover:bg-white/10"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => rfInstance?.zoomTo(1, { duration: 200 })}
                  title="Reset to 100%"
                  aria-label="Reset zoom to 100%"
                  className="min-w-[3.25rem] rounded-full px-2 py-1 text-center text-xs font-semibold tabular-nums transition hover:bg-slate-100 dark:hover:bg-white/10"
                >
                  {Math.round(currentZoom * 100)}%
                </button>
                <button
                  type="button"
                  onClick={zoomIn}
                  title="Zoom in (+)"
                  aria-label="Zoom in"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-lg font-medium transition hover:bg-slate-100 dark:hover:bg-white/10"
                >
                  +
                </button>
                <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-white/10" />
                <button
                  type="button"
                  onClick={fitToView}
                  title="Fit people (0)"
                  aria-label="Fit visible people"
                  className="rounded-full px-3 py-1.5 text-xs font-semibold transition hover:bg-slate-100 dark:hover:bg-white/10"
                >
                  Fit
                </button>
                <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-white/10" />
                <button
                  type="button"
                  onClick={toggleScrollZoom}
                  aria-pressed={scrollZoom}
                  aria-label={`Scroll wheel mode: ${scrollZoom ? "zoom" : "pan"}`}
                  title={
                    scrollZoom
                      ? "Mouse wheel zooms. Click to switch to scroll-to-pan (trackpad-friendly)."
                      : "Mouse wheel pans. Click to switch to scroll-to-zoom (mouse-friendly)."
                  }
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition hover:bg-slate-100 dark:hover:bg-white/10"
                >
                  <span
                    aria-hidden
                    className={[
                      "inline-block h-1.5 w-1.5 rounded-full",
                      scrollZoom ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600",
                    ].join(" ")}
                  />
                  Scroll: {scrollZoom ? "Zoom" : "Pan"}
                </button>
              </div>
            </div>
          )}

          {/* Relationship legend - compact button in corner */}
          {personNodes.length > 0 && <RelationshipLegend />}

          {viewportRescueVisible && personNodes.length > 0 && (
            <div className="pointer-events-none absolute bottom-24 left-1/2 z-40 -translate-x-1/2">
              <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-amber-200 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700 shadow-lg ring-1 ring-amber-100 backdrop-blur dark:border-amber-400/30 dark:bg-slate-950/90 dark:text-slate-100 dark:ring-amber-400/20">
                <span className="h-2 w-2 rounded-full bg-amber-400" aria-hidden />
                <span>No people in view</span>
                <button
                  type="button"
                  onClick={() =>
                    fitVisiblePeopleRef.current({ padding: 0.18, duration: 350, minZoom: 0.35, maxZoom: 1.2 })
                  }
                  className="rounded-full bg-slate-900 px-3 py-1 text-white shadow-sm transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  Recenter
                </button>
              </div>
            </div>
          )}

          {/* ⌘K command palette: jump to anyone, run common actions */}
          <CommandPalette
            people={personNodes}
            actions={paletteActions}
            onSelectPerson={selectPersonFromCard}
          />

          {/* Action confirmation toast with one-click Undo */}
          {toast && (
            <div className="pointer-events-none absolute bottom-20 left-1/2 z-40 -translate-x-1/2">
              <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-slate-900/95 px-4 py-2 text-xs text-white shadow-xl ring-1 ring-white/10">
                <span>{toast.message}</span>
                <button
                  type="button"
                  onClick={() => {
                    undo();
                    setToast(null);
                  }}
                  className="font-bold text-sky-300 transition hover:text-sky-200"
                >
                  Undo
                </button>
                <button
                  type="button"
                  aria-label="Dismiss"
                  onClick={() => setToast(null)}
                  className="text-slate-400 transition hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Bulk assignment toolbar for multi-selections */}
          {selection.nodeIds.length > 1 && (
            <BulkAssignToolbar
              count={selection.nodeIds.length}
              onAssign={(dimension, laneKey) => {
                reassignManyToLane(selection.nodeIds, dimension, laneKey);
                showToast(`Assigned ${selection.nodeIds.length} people → ${laneKey}`);
              }}
              onClear={() => clearSelection()}
            />
          )}

          {/* Focus breadcrumb + active-view context strip (top-center) */}
          {personNodes.length > 0 && (
            <CanvasContextBar
              onResetView={resetView}
              onOpenTeamTree={openTeamTree}
              teamTreeRootId={teamRootId}
              onExitTeamTree={closeTeamTree}
              viewContext={viewContext}
            />
          )}
        </div>
      </ContextMenu.Trigger>
      
      {/* Quick Add Dialog */}
      <QuickAddPersonDialog
        isOpen={quickAddDialog.open}
        onClose={() => setQuickAddDialog({ open: false, mode: 'new-person' })}
        onSave={handleQuickAddSave}
        mode={quickAddDialog.mode}
        managerName={quickAddDialog.managerName}
      />
      <CanvasContextMenu
        open={canvasMenu}
        lens={lens}
        onAddPerson={(point) => {
          const flowPoint = flowPositionFromClient(point);
          setQuickAddDialog({
            open: true,
            mode: 'new-person',
            position: flowPoint,
          });
        }}
        onAddFromTemplate={(template, point) => {
          const flowPoint = flowPositionFromClient(point);
          const newId = addPerson({
            name: template.defaultName,
            title: template.defaultTitle,
            brands: template.suggestedBrands ?? [],
            channels: template.suggestedChannels ?? [],
            departments: template.suggestedDepartments ?? [],
            tier: template.tier,
            position: flowPoint,
          });
          setSelection({ nodeIds: [newId], edgeIds: [] });
        }}
        onPaste={() => pasteClipboard()}
        onSelectAll={() =>
          setSelection({
            nodeIds: personNodes.map((node) => node.id),
            edgeIds: edgesData.map((edge) => edge.id),
          })
        }
        onDeselect={() => clearSelection()}
        onZoomFit={() => fitVisiblePeopleRef.current({ padding: 0.25, duration: 300 })}
        onToggleGrid={() => toggleGrid(lens)}
        onToggleSnap={() => toggleSnap(lens)}
      />
    </ContextMenu.Root>
  );
}

const CanvasContextMenu = ({
  open,
  lens,
  onAddPerson,
  onAddFromTemplate,
  onPaste,
  onSelectAll,
  onDeselect,
  onZoomFit,
  onToggleGrid,
  onToggleSnap,
}: {
  open: CanvasMenuState | null;
  lens: LensId;
  onAddPerson: (point: { x: number; y: number }) => void;
  onAddFromTemplate: (template: RoleTemplate, point: { x: number; y: number }) => void;
  onPaste: () => void;
  onSelectAll: () => void;
  onDeselect: () => void;
  onZoomFit: () => void;
  onToggleGrid: () => void;
  onToggleSnap: () => void;
}) => {
  return (
    <ContextMenu.Portal>
      <ContextMenu.Content className="z-50 min-w-[240px] rounded-xl border border-slate-200 bg-white/95 p-1 text-sm shadow-xl backdrop-blur dark:border-white/10 dark:bg-slate-900/90">
        <ContextMenu.Label className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {LENS_BY_ID[lens].label}
        </ContextMenu.Label>
        <MenuItem onSelect={() => open && onAddPerson({ x: open.clientX, y: open.clientY })}>
          Add person here
        </MenuItem>
        <ContextMenu.Sub>
          <ContextMenu.SubTrigger className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-slate-600 hover:bg-slate-100 focus:outline-none dark:text-slate-300 dark:hover:bg-white/10">
            <span>Add from template</span>
            <span className="text-xs">▶</span>
          </ContextMenu.SubTrigger>
          <ContextMenu.SubContent className="min-w-[220px] rounded-xl border border-slate-200 bg-white/95 p-1 shadow-xl backdrop-blur dark:border-white/10 dark:bg-slate-900/90">
            {ROLE_TEMPLATES.map((template) => (
              <MenuItem
                key={template.id}
                onSelect={() => open && onAddFromTemplate(template, { x: open.clientX, y: open.clientY })}
              >
                <span className="mr-2">{template.icon}</span>
                {template.label}
              </MenuItem>
            ))}
          </ContextMenu.SubContent>
        </ContextMenu.Sub>
        <MenuSeparator />
        <MenuItem onSelect={onPaste}>Paste person</MenuItem>
        <MenuItem onSelect={onSelectAll}>Select all</MenuItem>
        <MenuItem onSelect={onDeselect}>Deselect</MenuItem>
        <MenuItem onSelect={onZoomFit}>Zoom to fit</MenuItem>
        <MenuSeparator />
        <MenuItem onSelect={onToggleGrid}>Toggle grid</MenuItem>
        <MenuItem onSelect={onToggleSnap}>Toggle snap-to-grid</MenuItem>
        <MenuSeparator />
        <MenuItem onSelect={onZoomFit}>Reset view</MenuItem>
      </ContextMenu.Content>
    </ContextMenu.Portal>
  );
};

const EdgeContextMenu = ({
  edgeMenu,
  onClose,
  onAction,
}: {
  edgeMenu: { edge: Edge | null; position: { x: number; y: number } } | null;
  onClose: () => void;
  onAction: (action: "manager" | "sponsor" | "dotted" | "delete") => void;
}) => {
  if (!edgeMenu?.edge) return null;
  
  // Render as portal directly without ContextMenu.Root
  return (
    <div
      className="fixed z-50 min-w-[200px] rounded-xl border border-slate-200 bg-white/95 p-1 text-sm shadow-xl backdrop-blur dark:border-white/10 dark:bg-slate-900/90"
      style={{
        position: "fixed",
        left: edgeMenu.position.x,
        top: edgeMenu.position.y,
      }}
    >
          <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Relationship
          </div>
          <button
            onClick={() => {
              onAction("manager");
              onClose();
            }}
            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100 focus:outline-none dark:text-slate-200 dark:hover:bg-white/10"
          >
            Convert to manager
          </button>
          <button
            onClick={() => {
              onAction("sponsor");
              onClose();
            }}
            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100 focus:outline-none dark:text-slate-200 dark:hover:bg-white/10"
          >
            Convert to sponsor
          </button>
          <button
            onClick={() => {
              onAction("dotted");
              onClose();
            }}
            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100 focus:outline-none dark:text-slate-200 dark:hover:bg-white/10"
          >
            Convert to dotted-line
          </button>
          <div className="my-1 h-px w-full bg-slate-200 dark:bg-white/10" />
          <button
            onClick={() => {
              onAction("delete");
              onClose();
            }}
            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-100 focus:outline-none dark:hover:bg-rose-500/20"
          >
            Delete relationship
          </button>
    </div>
  );
};

const MenuItem = ({
  children,
  onSelect,
  destructive,
}: {
  children: ReactNode;
  onSelect: () => void;
  destructive?: boolean;
}) => (
  <ContextMenu.Item
    onSelect={onSelect}
    className={[
      "flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:text-slate-200",
      destructive
        ? "text-rose-600 hover:bg-rose-100 focus-visible:ring-rose-200 dark:hover:bg-rose-500/20"
        : "hover:bg-slate-100 focus-visible:ring-slate-200 dark:hover:bg-white/10",
    ].join(" ")}
  >
    <span>{children}</span>
  </ContextMenu.Item>
);

const MenuSeparator = () => (
  <ContextMenu.Separator className="my-1 h-px w-full bg-slate-200 dark:bg-white/10" />
);

const CleanupButton = ({
  onCleanup,
}: {
  onCleanup: (mode: "compact" | "spacious") => void;
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Popover.Root open={menuOpen} onOpenChange={setMenuOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-slate-400 dark:text-slate-300 dark:hover:bg-white/10"
          title="Clean up canvas layout"
          aria-label="Clean up canvas layout"
        >
          <MixerHorizontalIcon className="h-3.5 w-3.5" aria-hidden />
          Clean Up
        </button>
      </Popover.Trigger>
      
      <Popover.Portal>
        <Popover.Content
          className="z-50 w-64 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-2xl backdrop-blur dark:border-white/10 dark:bg-slate-900/95"
          sideOffset={12}
          side="bottom"
          align="end"
        >
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => {
                onCleanup("compact");
                setMenuOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition hover:bg-slate-100 dark:hover:bg-white/10"
            >
              <div aria-hidden className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-purple-600 text-lg">
                📦
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Compact Layout</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Fit as much as possible on screen</p>
              </div>
            </button>
            
            <button
              type="button"
              onClick={() => {
                onCleanup("spacious");
                setMenuOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition hover:bg-slate-100 dark:hover:bg-white/10"
            >
              <div aria-hidden className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-lg">
                📐
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Spacious Layout</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">No overlap, requires more space</p>
              </div>
            </button>
          </div>
          
          <Popover.Arrow className="fill-white dark:fill-slate-900" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

const BulkAssignToolbar = ({
  count,
  onAssign,
  onClear,
}: {
  count: number;
  onAssign: (dimension: LensDimension, laneKey: string) => void;
  onClear: () => void;
}) => {
  const pickers: Array<{ dimension: LensDimension; label: string; options: string[] }> = [
    { dimension: "brand", label: "Brand", options: DEMO_LENS_LABELS.brand },
    { dimension: "channel", label: "Channel", options: DEMO_LENS_LABELS.channel },
    { dimension: "department", label: "Department", options: DEMO_LENS_LABELS.department },
  ];

  return (
    <div className="pointer-events-none absolute left-1/2 top-4 z-30 -translate-x-1/2">
      <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-2xl border border-indigo-200 bg-white px-4 py-2.5 text-xs shadow-lg ring-1 ring-indigo-100 dark:border-indigo-400/20 dark:bg-slate-900 dark:ring-indigo-400/10">
        <span className="font-semibold text-slate-700 dark:text-slate-200">
          {count} people selected
        </span>
        <span className="text-slate-300 dark:text-slate-600">|</span>
        <span className="text-slate-500 dark:text-slate-400">Assign all to:</span>
        {pickers.map(({ dimension, label, options }) => (
          <select
            key={dimension}
            value=""
            aria-label={`Assign selected people to a ${label.toLowerCase()}`}
            onChange={(event) => {
              if (event.target.value) {
                onAssign(dimension, event.target.value);
              }
            }}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 font-medium text-slate-700 focus:border-indigo-400 focus:outline-none dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="" disabled>
              {label}…
            </option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ))}
        <button
          type="button"
          onClick={onClear}
          className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600 transition hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20"
        >
          Clear
        </button>
      </div>
    </div>
  );
};

const LANE_PALETTES: Record<LensDimension, Record<string, string>> = {
  brand: BRAND_COLORS,
  channel: CHANNEL_COLORS,
  department: DEPARTMENT_COLORS,
};

const getLaneColor = (key: string, dimension: LensDimension) =>
  LANE_PALETTES[dimension][key] ?? UNASSIGNED_LANE_COLOR;

const LANE_PAD_X = 70;
const LANE_PAD_TOP = 130;
const LANE_PAD_BOTTOM = 70;
const MIRROR_HEIGHT = 150;
const MIRROR_GAP = 40;
const MIRROR_SECTION_GAP = 90;

// Row bands (brands) span the full grid width; column bands (channels) span the
// full grid height. Rows render first so the translucent channel columns layer
// over them, producing the matrix grid feel; person cards sit on top.
const GRID_GROUP_BAND_H = 96;
const buildGridFrameNodes = (
  people: PersonNode[],
  zoom: number,
  collapsedGroups: Set<string>,
  onToggleGroup: (label: string) => void,
): Node[] => {
  const geo = getGridGeometry(people, collapsedGroups);
  // Channel-group header bands, sitting above the column headers; click to collapse
  const groupNodes: Node[] = geo.colGroups.map((grp) => ({
    id: `gridgroup:${grp.label}`,
    type: "gridGroupNode",
    position: { x: grp.x, y: -(GRID_GROUP_BAND_H + 24) },
    data: {
      label: grp.label,
      count: grp.count,
      width: grp.width,
      color: CHANNEL_GROUP_COLORS[grp.label] ?? UNASSIGNED_LANE_COLOR,
      zoom,
      collapsed: collapsedGroups.has(grp.label),
      onToggle: onToggleGroup,
    },
    style: { width: grp.width, height: GRID_GROUP_BAND_H },
    draggable: false,
    selectable: true,
    focusable: false,
    zIndex: 2,
  }));
  // Heat tiles behind the cards: one per brand×channel intersection
  const cellNodes: Node[] = geo.cells.map((cell) => ({
    id: `gridcell:${cell.rowKey}|||${cell.colKey}`,
    type: "gridCellNode",
    position: { x: cell.x, y: cell.y },
    data: {
      count: cell.count,
      maxCell: geo.maxCell,
      width: cell.width,
      height: cell.height,
      color: BRAND_COLORS[cell.rowKey] ?? UNASSIGNED_LANE_COLOR,
      shared: cell.shared,
      zoom,
    },
    draggable: false,
    selectable: false,
    focusable: false,
    zIndex: 0,
  }));
  const rowNodes: Node[] = geo.rows.map((row) => ({
    id: `gridrow:${row.key}`,
    type: "gridRowNode",
    position: { x: 0, y: row.y },
    data: {
      label: row.key,
      color: BRAND_COLORS[row.key] ?? UNASSIGNED_LANE_COLOR,
      count: row.count,
      width: geo.width,
      zoom,
    },
    draggable: false,
    selectable: false,
    focusable: false,
    zIndex: 0,
  }));
  const colNodes: Node[] = geo.cols.map((col) => ({
    id: `gridcol:${col.key}`,
    type: "gridColNode",
    position: { x: col.x, y: 0 },
    data: {
      label: col.key,
      color: CHANNEL_COLORS[col.key] ?? UNASSIGNED_LANE_COLOR,
      count: col.count,
      width: col.width,
      height: geo.height,
      zoom,
    },
    draggable: false,
    selectable: false,
    focusable: false,
    zIndex: 1,
  }));
  return [...cellNodes, ...rowNodes, ...colNodes, ...groupNodes];
};

const isVacantRole = (person: PersonNode) =>
  person.name.toLowerCase().includes("vacant") ||
  person.attributes.title.toLowerCase().includes("vacant");

const buildLaneNodes = (
  people: PersonNode[],
  positions: Record<string, { x: number; y: number }>,
  dimension: LensDimension,
  showMirrors: boolean,
  onOpenSharedServiceGroup: (ids: string[], label: string) => void,
  focusSet: Set<string> | null,
  zoom: number,
): Node[] => {
  const groups = groupNodesByDimension(people, dimension);
  const laneNodes: Node[] = [];
  const mirrorNodes: Node[] = [];
  const laneRects: Array<{ key: string; minX: number; maxX: number; minY: number; count: number }> = [];

  groups.forEach((members, key) => {
    const points = members
      .map((member) => positions[member.id])
      .filter((point): point is { x: number; y: number } => Boolean(point));
    if (points.length === 0) return;
    const minX = Math.min(...points.map((p) => p.x)) - LANE_PAD_X;
    const maxX = Math.max(...points.map((p) => p.x)) + NODE_WIDTH + LANE_PAD_X;
    const minY = Math.min(...points.map((p) => p.y)) - LANE_PAD_TOP;
    let maxY = Math.max(...points.map((p) => p.y)) + NODE_HEIGHT + LANE_PAD_BOTTOM;

    // Mirror cards: people whose secondary assignments include this lane,
    // stacked in a grid below the lane's primary members
    if (showMirrors) {
      const mirrors = people.filter(
        (person) =>
          person.attributes.tier !== "c-suite" &&
          getGroupKey(person, dimension) !== key &&
          getAssignments(person, dimension).includes(key),
      );
      const mirrorGroups = groupSharedServiceMirrors(mirrors, (person) =>
        getGroupKey(person, dimension),
      );
      if (mirrorGroups.length > 0) {
        const laneInnerWidth = maxX - minX - 2 * LANE_PAD_X;
        const cols = Math.max(1, Math.floor((laneInnerWidth + MIRROR_GAP) / (NODE_WIDTH + MIRROR_GAP)));
        const mirrorTop = maxY - LANE_PAD_BOTTOM + MIRROR_SECTION_GAP;
        mirrorGroups.forEach((group, index) => {
          const row = Math.floor(index / cols);
          const col = index % cols;
          const data: SharedServiceGroupNodeData = {
            service: group.service,
            label: group.label,
            members: group.members,
            lead: group.lead,
            accentColor: getLaneColor(group.homeLane, dimension),
            homeLane: group.homeLane,
            targetLane: key,
            dimensionLabel: dimension,
            onOpen: onOpenSharedServiceGroup,
          };
          const dimmed = focusSet
            ? !group.members.some((member) => focusSet.has(member.id))
            : false;
          mirrorNodes.push({
            id: `mirror-group:${group.id}:${key}`,
            type: "sharedServiceGroupNode",
            position: {
              x: minX + LANE_PAD_X + col * (NODE_WIDTH + MIRROR_GAP),
              y: mirrorTop + row * (MIRROR_HEIGHT + MIRROR_GAP),
            },
            data,
            draggable: false,
            focusable: false,
            selectable: false,
            style: {
              opacity: dimmed ? 0.12 : 1,
              pointerEvents: "all",
              transition: "opacity 0.3s ease-in-out",
            },
            zIndex: 3,
          });
        });
        const rows = Math.ceil(mirrorGroups.length / cols);
        maxY = mirrorTop + rows * (MIRROR_HEIGHT + MIRROR_GAP) - MIRROR_GAP + LANE_PAD_BOTTOM;
      }
    }

    // Tier mix so each lane communicates its shape at a glance
    const tierTally: Record<string, number> = {};
    members.forEach((m) => {
      const t = m.attributes.tier ?? "ic";
      tierTally[t] = (tierTally[t] ?? 0) + 1;
    });
    const TIER_ORDER: Array<[string, string]> = [
      ["c-suite", "Exec"],
      ["vp", "VP"],
      ["director", "Dir"],
      ["manager", "Mgr"],
      ["ic", "IC"],
    ];
    const tiers = TIER_ORDER.filter(([key]) => tierTally[key]).map(([key, label]) => ({
      label,
      count: tierTally[key],
    }));

    const data: LaneNodeData = {
      label: key,
      color: getLaneColor(key, dimension),
      count: members.length,
      crossAssigned: members.filter(
        (member) => getAssignments(member, dimension).length > 1,
      ).length,
      vacancies: members.filter(isVacantRole).length,
      tiers,
      zoom,
    };
    laneNodes.push({
      id: `lane:${key}`,
      type: "laneNode",
      position: { x: minX, y: minY },
      data,
      style: { width: maxX - minX, height: maxY - minY },
      zIndex: -1,
      draggable: false,
      selectable: false,
      focusable: false,
    });
    laneRects.push({ key, minX, maxX, minY, count: members.length });
  });

  // Channel lens: draw a group band above each cluster of same-group channel lanes
  const groupBandNodes: Node[] = [];
  if (dimension === "channel") {
    const topMinY = Math.min(...laneRects.map((r) => r.minY), 0);
    const byGroup = new Map<string, { minX: number; maxX: number; count: number }>();
    laneRects.forEach((r) => {
      const g = channelTopGroup(r.key);
      if (!g) return; // shared "All Channels" / unassigned — no group band
      const cur = byGroup.get(g);
      if (cur) {
        cur.minX = Math.min(cur.minX, r.minX);
        cur.maxX = Math.max(cur.maxX, r.maxX);
        cur.count += r.count;
      } else {
        byGroup.set(g, { minX: r.minX, maxX: r.maxX, count: r.count });
      }
    });
    byGroup.forEach((span, label) => {
      groupBandNodes.push({
        id: `chgroup:${label}`,
        type: "gridGroupNode",
        position: { x: span.minX, y: topMinY - 180 },
        data: { label, count: span.count, width: span.maxX - span.minX, color: CHANNEL_GROUP_COLORS[label] ?? UNASSIGNED_LANE_COLOR, zoom },
        style: { width: span.maxX - span.minX, height: 120 },
        zIndex: -1,
        draggable: false,
        selectable: false,
        focusable: false,
      });
    });
  }

  return [...groupBandNodes, ...laneNodes, ...mirrorNodes];
};

const getAccentColor = (node: PersonNode, lens: LensId) => {
  if (lens === "brand") {
    const key = node.attributes.primaryBrand ?? node.attributes.brands[0];
    if (key && BRAND_COLORS[key]) return BRAND_COLORS[key];
  }
  if (lens === "channel") {
    const key = node.attributes.primaryChannel ?? node.attributes.channels[0];
    if (key && CHANNEL_COLORS[key]) return CHANNEL_COLORS[key];
  }
  if (lens === "department") {
    const key = node.attributes.primaryDepartment ?? node.attributes.departments[0];
    if (key && DEPARTMENT_COLORS[key]) return DEPARTMENT_COLORS[key];
  }
  return BRAND_COLORS[node.attributes.primaryBrand ?? "Sonance"] ?? "#0284c7";
};

const getPrimaryLabel = (node: PersonNode, lens: LensId) => {
  if (lens === "brand") {
    return node.attributes.primaryBrand ?? node.attributes.brands[0];
  }
  if (lens === "channel") {
    return node.attributes.primaryChannel ?? node.attributes.channels[0];
  }
  if (lens === "department") {
    return node.attributes.primaryDepartment ?? node.attributes.departments[0];
  }
  return undefined;
};

const doesEdgeMatchTokens = (
  edge: GraphEdge,
  nodes: PersonNode[],
  tokens: string[],
  lens: LensId,
) => {
  if (tokens.length === 0) return true;
  const source = nodes.find((node) => node.id === edge.source);
  const target = nodes.find((node) => node.id === edge.target);
  if (!source || !target) return false;
  return (
    tokens.some((token) => isTokenMatchForLens(source, token, lens)) ||
    tokens.some((token) => isTokenMatchForLens(target, token, lens))
  );
};

const isTokenMatchForLens = (node: PersonNode, token: string, lens: LensId) => {
  if (lens === "brand") {
    return node.attributes.brands.includes(token);
  }
  if (lens === "channel") {
    return node.attributes.channels.includes(token);
  }
  if (lens === "department") {
    return node.attributes.departments.includes(token);
  }
  return (
    node.attributes.brands.includes(token) ||
    node.attributes.channels.includes(token) ||
    node.attributes.departments.includes(token) ||
    node.attributes.tags.includes(token)
  );
};

const deduceRelationshipType = (connection: Connection): GraphEdge["metadata"]["type"] | null => {
  const handle = connection.sourceHandle ?? connection.targetHandle ?? "";
  if (handle.includes("sponsor")) return "sponsor";
  if (handle.includes("dotted")) return "dotted";
  return "manager";
};

const offsetPosition = (position: { x: number; y: number }, delta: { x: number; y: number }) => ({
  x: position.x + delta.x,
  y: position.y + delta.y,
});
