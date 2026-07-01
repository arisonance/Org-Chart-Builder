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
import { HierarchyNode, type HierarchyNodeData, type PortfolioArea } from "@/components/hierarchy-node";
import { LaneNode, type LaneNodeData } from "@/components/lane-node";
import { FormationBandNode, type FormationBandNodeData } from "@/components/formation-band-node";
import { AreaCardNode, type AreaCardNodeData } from "@/components/area-card-node";
import { AreaFrameNode, type AreaFrameNodeData } from "@/components/area-frame-node";
import { MirrorNode, type MirrorNodeData } from "@/components/mirror-node";
import {
  SharedServiceGroupNode,
  type SharedServiceGroupNodeData,
} from "@/components/shared-service-group-node";
import { OnboardingOverlay } from "@/components/onboarding-overlay";
import { RelationshipLegend } from "@/components/relationship-legend";
import { CanvasContextBar } from "@/components/canvas-context-bar";
import {
  CanvasOrientationMap,
  type OrientationAction,
  type OrientationChip,
} from "@/components/canvas-orientation-map";
import { HelpDialog } from "@/components/help-dialog";
import { customEdgeTypes } from "@/components/custom-edges";
import { QuickAddPersonDialog, type QuickAddPersonData } from "@/components/quick-add-person-dialog";
import { useGraphStore, buildSettingsPatch } from "@/store/graph-store";
import { LENS_BY_ID, type LensId } from "@/lib/schema/lenses";
import {
  DEFAULT_OPERATING_VIEW_ID,
  PUBLISHED_OPERATING_VIEW_BY_ID,
  type PublishedOperatingView,
} from "@/lib/schema/operating-views";
import type {
  OperatingViewLayoutMap,
  OperatingViewLayoutMutation,
  OperatingViewLayoutRecord,
  OperatingViewViewport,
} from "@/lib/schema/operating-view-layouts";
import type { GraphEdge, PersonNode, RelationshipType } from "@/lib/schema/types";
import {
  getRelationshipDefinition,
  isSupportRelationship,
  relationshipLabel,
} from "@/lib/schema/relationships";
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
  buildDepartmentOwnerByKey,
  DEPARTMENT_OWNER_IDS,
  DEPARTMENT_OWNER_LABELS,
  DEPARTMENT_SUPER_ROOT_ID,
  isDepartmentExecutiveContextId,
  UNASSIGNED_GROUP_KEY,
  NODE_WIDTH,
  NODE_HEIGHT,
  type LensDimension,
} from "@/lib/graph/layout";
import { buildManagerRoute } from "@/lib/graph/edge-routing";
import { GridColNode, GridRowNode, GridCellNode, GridGroupNode } from "@/components/grid-frame-node";
import { CHANNEL_GROUP_COLORS } from "@/lib/theme/palette";
import { channelSubGroup, channelTopGroup } from "@/lib/org/channels";
import { CommandPalette, type PaletteAction } from "@/components/command-palette";
import { OrgHealthPanel } from "@/components/org-health-panel";
import { UnitRail } from "@/components/unit-rail";
import { UnitFoundation } from "@/components/unit-foundation";
import { computeOrgUnits, unitMemberIdSet, computeUnitAnchors, type ComputedUnit } from "@/lib/graph/org-units";
import { groupSharedServiceMirrors, groupSharedServicePods } from "@/lib/graph/shared-service-groups";
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
  kind: "support-pod" | "shared-services" | "unit" | "lens-group" | "operating-view";
  label: string;
  count: number;
  rootId?: string;
  owner?: string;
  description?: string;
  publishedBy?: string;
  publishedAt?: string;
  dimension?: LensDimension;
  value?: string;
  formation?: "residential";
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
  expectedIds?: string[];
  primaryId?: string;
  reason?: OrientationLoopReason;
  skipOrientationLoop?: boolean;
};

type OrientationLoopReason =
  | "fit"
  | "focus"
  | "lens"
  | "overview"
  | "person"
  | "shared"
  | "team"
  | "team-lens"
  | "unit";

type OrientationLoopTarget = {
  reason: OrientationLoopReason;
  expectedIds?: string[];
  primaryId?: string;
  fallback?: () => void;
  attempts?: number;
  delayMs?: number;
};

type MatrixRelationshipMode = "reporting" | "matrix" | "all";

type TruthAuditIssue = {
  level: "warning" | "danger";
  message: string;
  blockerNames: string[];
};

type PersonCardRect = {
  id: string;
  name: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
};

type TeamViewLayouts = Record<string, Record<string, { x: number; y: number }>>;

type TeamLayoutDraft = {
  rootId: string;
  positions: Record<string, { x: number; y: number }>;
  dirty: boolean;
};

type OperatingViewLayouts = OperatingViewLayoutMap;

type FormationPodTier = "direct" | "shared" | "enterprise" | "facility" | "capability";

type FormationPodSpec = {
  id: string;
  label: string;
  service: string;
  tier: FormationPodTier;
  memberIds: string[];
  leadId?: string;
  position: { x: number; y: number };
  accentColor: string;
  homeLane: string;
  targetLane: string;
};

type FormationLayerSpec = {
  id: string;
  label: string;
  color: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  count: number;
};

type ResidentialFormationSpec = {
  peopleIds: Set<string>;
  positions: Record<string, { x: number; y: number }>;
  pods: FormationPodSpec[];
  layers: FormationLayerSpec[];
  frameIds: string[];
};

type BrandCoverageSpec = {
  pods: FormationPodSpec[];
  layers: FormationLayerSpec[];
};

type AreaCardAction =
  | { type: "team"; rootId: string }
  | { type: "formation"; viewId: "all-residential" }
  | { type: "operating-view"; dimension: LensDimension; value: string; viewId?: string };

type AreaCardSpec = {
  id: string;
  label: string;
  displayUnderId: string;
  ownerId?: string;
  leadId?: string;
  rootId?: string;
  memberIds: string[];
  kind: string;
  detail?: string;
  accentColor: string;
  action: AreaCardAction;
};

const nodeTypes = {
  hierarchyNode: HierarchyNode,
  laneNode: LaneNode,
  formationBandNode: FormationBandNode,
  areaCardNode: AreaCardNode,
  areaFrameNode: AreaFrameNode,
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
  dedicated: { width: 18, height: 18, color: RELATIONSHIP_COLORS.dedicated },
  support: { width: 18, height: 18, color: RELATIONSHIP_COLORS.support },
  "shared-service": { width: 18, height: 18, color: RELATIONSHIP_COLORS["shared-service"] },
  sponsor: { width: 18, height: 18, color: RELATIONSHIP_COLORS.support },
  dotted: { width: 16, height: 16, color: RELATIONSHIP_COLORS.dotted },
  group: { width: 16, height: 16, color: RELATIONSHIP_COLORS.group },
};

const EXECUTIVE_ROOT_ID = "person-ari-supran";
const SENIOR_LEADERSHIP_CONTEXT_IDS = [
  EXECUTIVE_ROOT_ID,
  "person-pat-mcgaughan",
  "person-rob-roland",
  "person-jason-sloan",
  "person-michael-sonntag",
  "person-grace-dryer",
  "person-jorge-notni",
];

const RESIDENTIAL_FORMATION_VALUE = "Residential";
const RESIDENTIAL_ROOT_ID = "person-jason-sloan";
const RESIDENTIAL_BRANCH_ROOT_IDS = [
  "person-tyler-kungl",
  "person-nathan-whitesel",
  "person-aron-mckay",
  "person-jay-lazzaro-jr",
];
const AREA_CARD_PREFIX = "area-card:";
const FORMATION_LAYER_PREFIX = "formation-layer:";
const FORMATION_POD_PREFIX = "formation-pod:";
const BRAND_COVERAGE_NODE_PREFIX = "brand-coverage:";
const FINANCE_AREA_ID = "area-finance";
const PAT_ID = "person-pat-mcgaughan";
const ROB_ID = "person-rob-roland";
const JASON_ID = "person-jason-sloan";
const MICHAEL_ID = "person-michael-sonntag";
const GIGI_ID = "person-grace-dryer";
const JORGE_ID = "person-jorge-notni";
const PAT_NON_FINANCE_DIRECT_REPORT_IDS = new Set([
  GIGI_ID,
  JORGE_ID,
]);
const SENIOR_PORTFOLIO_FRAME_ANCHOR_IDS = new Set([
  PAT_ID,
  ROB_ID,
  GIGI_ID,
  JORGE_ID,
]);

const isAreaCardNodeId = (id: string) => id.startsWith(AREA_CARD_PREFIX);
const isFormationPodNodeId = (id: string) => id.startsWith(FORMATION_POD_PREFIX);
const isResidentialFormationContext = (context: ViewContext | null) =>
  context?.kind === "operating-view" &&
  (context.formation === "residential" || context.value === RESIDENTIAL_FORMATION_VALUE);

const isSeniorLeadershipContextId = (id: string) =>
  SENIOR_LEADERSHIP_CONTEXT_IDS.includes(id);

const isPatNonFinanceDirectReportEdge = (edge: GraphEdge) =>
  edge.source === PAT_ID && PAT_NON_FINANCE_DIRECT_REPORT_IDS.has(edge.target);

const isCuratedLeadershipReportEdge = (edge: GraphEdge) =>
  edge.metadata.type === "manager" &&
  edge.source !== EXECUTIVE_ROOT_ID &&
  !isPatNonFinanceDirectReportEdge(edge) &&
  isSeniorLeadershipContextId(edge.source) &&
  isSeniorLeadershipContextId(edge.target);

const SENIOR_TEAM_AREA_CARD_IDS = new Set([
  "area-residential",
  "area-professional",
  FINANCE_AREA_ID,
  "area-tech-it",
  "area-admin-hr",
  "area-product-engineering",
  "area-dealer-services",
  "area-minden-operations",
  "area-minden-production",
  "area-ops-sc",
]);

const SENIOR_AREA_CARD_WIDTH = 240;
const SENIOR_AREA_CARD_HEIGHT = 174;
const SENIOR_AREA_CARD_GAP_X = 34;
const SENIOR_AREA_CARD_GAP_Y = 104;
const SENIOR_AREA_CARD_SIDECAR_GAP_X = 42;
const SENIOR_AREA_CARD_SIDECAR_GAP_Y = 34;
const SENIOR_OWNER_FRAME_PAD_X = 20;
const SENIOR_OWNER_FRAME_TOP_PAD = 62;
const SENIOR_OWNER_FRAME_BOTTOM_PAD = 24;
const FORMATION_POD_WIDTH = 256;
const FORMATION_POD_HEIGHT = 164;

const SENIOR_AREA_CARD_SIDE_BY_ANCHOR: Record<string, "left" | "right"> = {
  "person-jorge-notni": "right",
};

const SENIOR_AREA_CARD_COLUMNS_BY_ANCHOR: Record<string, number> = {
  [ROB_ID]: 2,
  [JORGE_ID]: 2,
};

const getSeniorTeamAreaCardPosition = ({
  areaId,
  anchorId,
  anchor,
  childPositions,
  index,
  columns,
}: {
  areaId: string;
  anchorId: string;
  anchor: { x: number; y: number };
  childPositions: Array<{ x: number; y: number }>;
  index: number;
  columns: number;
}) => {
  const col = index % columns;
  const row = index;

  if (areaId === FINANCE_AREA_ID && childPositions.length > 0) {
    const childBottom = Math.max(...childPositions.map((position) => position.y + NODE_HEIGHT));
    return {
      x: anchor.x + NODE_WIDTH / 2 - SENIOR_AREA_CARD_WIDTH / 2,
      y: childBottom + 76 + row * SENIOR_AREA_CARD_GAP_Y,
    };
  }

  const rowIndex = Math.floor(index / columns);
  const rowWidth = columns * SENIOR_AREA_CARD_WIDTH + (columns - 1) * SENIOR_AREA_CARD_GAP_X;
  const side = SENIOR_AREA_CARD_SIDE_BY_ANCHOR[anchorId];
  if (anchorId === JORGE_ID) {
    return {
      x: anchor.x + NODE_WIDTH / 2 - 10 + col * (SENIOR_AREA_CARD_WIDTH + SENIOR_AREA_CARD_GAP_X),
      y:
        anchor.y +
        NODE_HEIGHT +
        78 +
        rowIndex * (SENIOR_AREA_CARD_HEIGHT + SENIOR_AREA_CARD_SIDECAR_GAP_Y),
    };
  }
  if (!side) {
    return {
      x: anchor.x + NODE_WIDTH / 2 - rowWidth / 2 + col * (SENIOR_AREA_CARD_WIDTH + SENIOR_AREA_CARD_GAP_X),
      y:
        anchor.y +
        NODE_HEIGHT +
        70 +
        rowIndex * (SENIOR_AREA_CARD_HEIGHT + SENIOR_AREA_CARD_SIDECAR_GAP_Y),
    };
  }

  return {
    x:
      side === "left"
        ? anchor.x - rowWidth - SENIOR_AREA_CARD_SIDECAR_GAP_X + col * (SENIOR_AREA_CARD_WIDTH + SENIOR_AREA_CARD_GAP_X)
        : anchor.x + NODE_WIDTH + SENIOR_AREA_CARD_SIDECAR_GAP_X + col * (SENIOR_AREA_CARD_WIDTH + SENIOR_AREA_CARD_GAP_X),
    y:
      anchor.y +
      NODE_HEIGHT +
      70 +
      rowIndex * (SENIOR_AREA_CARD_HEIGHT + SENIOR_AREA_CARD_SIDECAR_GAP_Y),
  };
};

const compressSeniorLeadershipTeamLayout = (
  positions: Record<string, { x: number; y: number }>,
  directReportIds: string[],
) => {
  const next = { ...positions };
  directReportIds.forEach((id) => {
    if (next[id]) next[id] = { ...next[id], y: 310 };
  });
  PAT_NON_FINANCE_DIRECT_REPORT_IDS.forEach((id) => {
    if (next[id]) next[id] = { ...next[id], y: 640 };
  });
  if (next[PAT_ID] && next[GIGI_ID]) next[GIGI_ID] = { ...next[GIGI_ID], x: next[PAT_ID].x - 320 };
  if (next[PAT_ID] && next[JORGE_ID]) next[JORGE_ID] = { ...next[JORGE_ID], x: next[PAT_ID].x + 320 };
  if (next[PAT_ID] && next[ROB_ID]) next[ROB_ID] = { ...next[ROB_ID], x: next[PAT_ID].x + 660 };
  if (next[PAT_ID] && next[JASON_ID]) next[JASON_ID] = { ...next[JASON_ID], x: next[PAT_ID].x + 990 };
  if (next[PAT_ID] && next[MICHAEL_ID]) next[MICHAEL_ID] = { ...next[MICHAEL_ID], x: next[PAT_ID].x + 1260 };
  if (next[EXECUTIVE_ROOT_ID]) next[EXECUTIVE_ROOT_ID] = { ...next[EXECUTIVE_ROOT_ID], y: 0 };
  return next;
};

const getPortfolioNodeHeight = (areaCount: number) =>
  areaCount > 0 ? NODE_HEIGHT + 44 + areaCount * 44 : NODE_HEIGHT;

const getFlowNodeRoutingHeight = (node: Node | undefined) => {
  const areaCount = ((node?.data as Partial<HierarchyNodeData> | undefined)?.portfolioAreas ?? []).length;
  return getPortfolioNodeHeight(areaCount);
};

const CHANNEL_ROOT_BY_CHANNEL: Record<string, string> = {
  "Luxury Residential": "person-jason-sloan",
  "National Accounts": "person-jason-sloan",
  "International Residential": "person-jason-sloan",
  "North America Professional": "person-michael-sonntag",
  "International Professional": "person-michael-sonntag",
  Enterprise: "person-michael-sonntag",
};

const BRAND_CONTEXT_BY_BRAND: Record<string, string[]> = {
  Sonance: SENIOR_LEADERSHIP_CONTEXT_IDS,
  James: SENIOR_LEADERSHIP_CONTEXT_IDS,
  iPort: ["person-rob-roland", "person-mike-paganini", "person-chris-lawson"],
};

const BRAND_CONTEXT_LABEL_BY_ID: Record<string, string> = {
  [EXECUTIVE_ROOT_ID]: "CEO / SLT",
  "person-pat-mcgaughan": "SLT context",
  "person-rob-roland": "SLT context",
  "person-jason-sloan": "SLT context",
  "person-michael-sonntag": "SLT context",
  "person-grace-dryer": "SLT context",
  "person-jorge-notni": "SLT context",
  "person-mike-paganini": "Product leadership",
  "person-chris-lawson": "iPort general manager",
};

const CHANNEL_CONTEXT_BY_KEY: Record<string, string[]> = {
  Residential: ["person-jason-sloan"],
  "Luxury Residential": ["person-jason-sloan"],
  "National Accounts": ["person-jason-sloan"],
  "International Residential": ["person-jason-sloan"],
  Commercial: ["person-michael-sonntag"],
  Professional: ["person-michael-sonntag"],
  "North America Professional": ["person-michael-sonntag"],
  "International Professional": ["person-michael-sonntag"],
  Enterprise: ["person-michael-sonntag", "person-chris-lawson"],
};

const CHANNEL_CONTEXT_LABEL_BY_ID: Record<string, string> = {
  "person-jason-sloan": "Residential owner",
  "person-michael-sonntag": "Professional owner",
  "person-chris-lawson": "Enterprise / iPort GM",
};

const CHANNEL_SUPPORT_NAME_HINTS: Record<string, string[]> = {
  "International Residential": ["Kim Buck", "Adrian Ickeringill", "Goran"],
};

const baseEdgeStyle = {
  strokeWidth: 2.5,
  strokeLinecap: "round" as const,
};

const MATRIX_WRAP_LAYOUT_STORAGE_KEY = "org-chart-matrix-wrap-layout-v4";
const TEAM_VIEW_LAYOUTS_STORAGE_KEY = "org-chart-team-view-layouts-v7";
const TEAM_VIEW_LAYOUTS_LEGACY_STORAGE_KEYS = [
  "org-chart-team-view-layouts-v6",
  "org-chart-team-view-layouts-v5",
  "org-chart-team-view-layouts-v4",
  "org-chart-team-view-layouts-v3",
  "org-chart-team-view-layouts-v2",
];
const OPERATING_VIEW_LAYOUTS_STORAGE_KEY = "org-chart-operating-view-layouts-v1";
const VIEWPORT_DEFAULTS_STORAGE_KEY = "org-chart-view-frame-defaults-v1";
const LENS_PRESET_TRANSITION_EVENT = "org-chart:lens-preset-transition";
const TEAM_TREE_FULL_DESCENDANT_LIMIT = 80;
const CHANNEL_FIT_MIN_ZOOM = 0.18;

const getLensFitMinZoom = (lens: LensId, width = 1400) => {
  if (lens === "channel") return width < 560 ? 0.1 : width < 900 ? 0.13 : width < 1280 ? 0.16 : CHANNEL_FIT_MIN_ZOOM;
  if (lens === "matrix") return width < 900 ? 0.12 : width < 1280 ? 0.16 : 0.22;
  if (lens === "brand") return width < 560 ? 0.1 : width < 1280 ? 0.11 : 0.12;
  if (lens === "department") return width < 560 ? 0.16 : width < 900 ? 0.18 : width < 1280 ? 0.22 : 0.28;
  return width < 900 ? 0.32 : 0.35;
};

const getLensFitPadding = (lens: LensId) => {
  if (lens === "channel") return 0.26;
  if (lens === "matrix") return 0.24;
  if (lens === "brand") return 0.22;
  return 0.18;
};

type SavedViewportDefaults = Record<string, ViewportState>;

const sanitizeTeamViewLayouts = (
  layouts: unknown,
  options: { stripExecutivePositions?: boolean; stripExecutiveAreaCardPositions?: boolean } = {},
): TeamViewLayouts => {
  if (!layouts || typeof layouts !== "object" || Array.isArray(layouts)) return {};
  const sanitized: TeamViewLayouts = {};
  Object.entries(layouts as Record<string, unknown>).forEach(([rootId, rawPositions]) => {
    if (!rawPositions || typeof rawPositions !== "object" || Array.isArray(rawPositions)) return;
    const positions: Record<string, { x: number; y: number }> = {};
    Object.entries(rawPositions as Record<string, unknown>).forEach(([nodeId, rawPosition]) => {
      if (
        rootId === EXECUTIVE_ROOT_ID &&
        (options.stripExecutivePositions ||
          (options.stripExecutiveAreaCardPositions && isAreaCardNodeId(nodeId)))
      ) {
        return;
      }
      if (!rawPosition || typeof rawPosition !== "object" || Array.isArray(rawPosition)) return;
      const candidate = rawPosition as Partial<{ x: number; y: number }>;
      if (
        typeof candidate.x !== "number" ||
        typeof candidate.y !== "number" ||
        !Number.isFinite(candidate.x) ||
        !Number.isFinite(candidate.y)
      ) {
        return;
      }
      positions[nodeId] = { x: candidate.x, y: candidate.y };
    });
    if (Object.keys(positions).length > 0) {
      sanitized[rootId] = positions;
    }
  });
  return sanitized;
};

const loadTeamViewLayouts = (): TeamViewLayouts => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(TEAM_VIEW_LAYOUTS_STORAGE_KEY);
    if (raw) return sanitizeTeamViewLayouts(JSON.parse(raw));
    for (const legacyKey of TEAM_VIEW_LAYOUTS_LEGACY_STORAGE_KEYS) {
      const legacyRaw = window.localStorage.getItem(legacyKey);
      if (!legacyRaw) continue;
      const migrated = sanitizeTeamViewLayouts(JSON.parse(legacyRaw), {
        stripExecutivePositions: true,
        stripExecutiveAreaCardPositions: true,
      });
      window.localStorage.setItem(TEAM_VIEW_LAYOUTS_STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
    return {};
  } catch {
    return {};
  }
};

const loadOperatingViewLayouts = (): OperatingViewLayouts => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(OPERATING_VIEW_LAYOUTS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed as OperatingViewLayouts : {};
  } catch {
    return {};
  }
};

const loadSavedViewportDefaults = (): SavedViewportDefaults => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(VIEWPORT_DEFAULTS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const entries = Object.entries(parsed).flatMap(([key, value]) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return [];
      const candidate = value as Partial<ViewportState>;
      if (
        typeof candidate.x !== "number" ||
        typeof candidate.y !== "number" ||
        typeof candidate.zoom !== "number" ||
        !Number.isFinite(candidate.x) ||
        !Number.isFinite(candidate.y) ||
        !Number.isFinite(candidate.zoom) ||
        candidate.zoom <= 0
      ) {
        return [];
      }
      return [[key, { x: candidate.x, y: candidate.y, zoom: candidate.zoom } as ViewportState]];
    });
    return Object.fromEntries(entries);
  } catch {
    return {};
  }
};

const normalizeViewport = (viewport: ViewportState): OperatingViewViewport => ({
  x: Math.round(viewport.x * 100) / 100,
  y: Math.round(viewport.y * 100) / 100,
  zoom: Math.round(viewport.zoom * 1000) / 1000,
});

const sameViewport = (
  a: ViewportState | null | undefined,
  b: ViewportState | null | undefined,
) => {
  if (!a || !b) return false;
  return (
    Math.abs(a.x - b.x) < 2 &&
    Math.abs(a.y - b.y) < 2 &&
    Math.abs(a.zoom - b.zoom) < 0.01
  );
};

const hasSavedViewport = (
  viewport: ViewportState | null | undefined,
): viewport is ViewportState =>
  Boolean(
    viewport &&
      Number.isFinite(viewport.x) &&
      Number.isFinite(viewport.y) &&
      Number.isFinite(viewport.zoom) &&
      viewport.zoom > 0,
  );

const loadRemoteOperatingViewLayouts = async (): Promise<OperatingViewLayouts | null> => {
  const response = await fetch("/api/operating-views/layouts", { cache: "no-store" });
  if (!response.ok) return null;
  const data = await response.json() as { configured?: boolean; layouts?: OperatingViewLayouts };
  if (!data.configured || !data.layouts) return null;
  return data.layouts;
};

const saveRemoteOperatingViewLayout = async (
  viewId: string,
  mutation: OperatingViewLayoutMutation,
): Promise<OperatingViewLayoutRecord | null> => {
  const response = await fetch(`/api/operating-views/${encodeURIComponent(viewId)}/layout`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(mutation),
  });
  if (!response.ok) return null;
  const data = await response.json() as { layout?: OperatingViewLayoutRecord };
  return data.layout ?? null;
};

const isPersonFlowNodeId = (id: string) =>
  !id.startsWith("lane:") &&
  !id.startsWith(AREA_CARD_PREFIX) &&
  !id.startsWith("mirror:") &&
  !id.startsWith("context:") &&
  !id.startsWith("mirror-group:") &&
  !id.startsWith("shared-overview:") &&
  !id.startsWith("formation-layer:") &&
  !id.startsWith("formation-pod:") &&
  !id.startsWith("grid");

const buildPersonCardRect = (
  person: Pick<PersonNode, "id" | "name">,
  position: { x: number; y: number },
): PersonCardRect => ({
  id: person.id,
  name: person.name,
  left: position.x + 18,
  right: position.x + NODE_WIDTH - 18,
  top: position.y + 12,
  bottom: position.y + NODE_HEIGHT - 10,
  centerX: position.x + NODE_WIDTH / 2,
  centerY: position.y + NODE_HEIGHT / 2,
});

const pointInRect = (x: number, y: number, rect: PersonCardRect) =>
  x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;

const segmentSamplesRect = (
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  rect: PersonCardRect,
) => {
  for (let step = 1; step < 14; step += 1) {
    const t = step / 14;
    const x = startX + (endX - startX) * t;
    const y = startY + (endY - startY) * t;
    if (pointInRect(x, y, rect)) return true;
  }
  return false;
};

const findManagerLineBlockers = (
  source: { x: number; y: number },
  target: { x: number; y: number },
  rects: PersonCardRect[],
  sourceId: string,
  targetId: string,
  routeLane?: number,
  routeBusY?: number,
) => {
  const sourceX = source.x + NODE_WIDTH / 2;
  const sourceY = source.y + NODE_HEIGHT;
  const targetX = target.x + NODE_WIDTH / 2;
  const targetY = target.y;
  const route = buildManagerRoute({
    id: `${sourceId}->${targetId}`,
    sourceId,
    sourceX,
    sourceY,
    targetX,
    targetY,
    routeLane,
    routeBusY,
    sourceRect: { x: source.x, y: source.y, width: NODE_WIDTH, height: NODE_HEIGHT },
    targetRect: { x: target.x, y: target.y, width: NODE_WIDTH, height: NODE_HEIGHT },
  });

  return rects.filter((rect) => {
    if (rect.id === sourceId || rect.id === targetId) return false;
    return route.points.some((point, index) => {
      const next = route.points[index + 1];
      if (!next) return false;
      const minX = Math.min(point.x, next.x);
      const maxX = Math.max(point.x, next.x);
      const minY = Math.min(point.y, next.y);
      const maxY = Math.max(point.y, next.y);
      if (rect.right < minX || rect.left > maxX || rect.bottom < minY || rect.top > maxY) {
        return false;
      }
      return segmentSamplesRect(point.x, point.y, next.x, next.y, rect);
    });
  });
};

const uniqueExistingIds = (ids: string[], personById: Map<string, PersonNode>) =>
  [...new Set(ids)].filter((id) => personById.has(id));

const collectVisibleDirectReports = (
  rootIds: string[],
  childMap: Record<string, string[]>,
  personById: Map<string, PersonNode>,
) =>
  uniqueExistingIds(
    rootIds.flatMap((rootId) => childMap[rootId] ?? []),
    personById,
  );

const buildResidentialFormationSpec = (
  people: PersonNode[],
  personById: Map<string, PersonNode>,
  childMap: Record<string, string[]>,
  orgUnits: ComputedUnit[],
): ResidentialFormationSpec => {
  const branchRootIds = uniqueExistingIds(RESIDENTIAL_BRANCH_ROOT_IDS, personById);
  const branchRootSet = new Set(branchRootIds);
  const branchReportIds = collectVisibleDirectReports(branchRootIds, childMap, personById);
  const peopleIds = new Set(
    uniqueExistingIds([RESIDENTIAL_ROOT_ID, ...branchRootIds, ...branchReportIds], personById),
  );

  const positions: Record<string, { x: number; y: number }> = {};
  positions[RESIDENTIAL_ROOT_ID] = { x: 1320, y: 80 };

  const branchX = [0, 840, 1680, 2520];
  branchRootIds.forEach((rootId, index) => {
    const x = branchX[index] ?? index * 840;
    positions[rootId] = { x, y: 360 };
    const reports = uniqueExistingIds(childMap[rootId] ?? [], personById)
      .filter((reportId) => !branchRootSet.has(reportId));
    const cols = Math.max(1, Math.min(2, reports.length || 1));
    const gapX = NODE_WIDTH + 70;
    const gapY = NODE_HEIGHT + 74;
    const rowWidth = cols * NODE_WIDTH + (cols - 1) * 70;
    const reportShiftX = rootId === "person-nathan-whitesel" ? NODE_WIDTH * 0.65 : 0;
    reports.forEach((reportId, reportIndex) => {
      const col = reportIndex % cols;
      const row = Math.floor(reportIndex / cols);
      positions[reportId] = {
        x: x + NODE_WIDTH / 2 - rowWidth / 2 + col * gapX + reportShiftX,
        y: 620 + row * gapY,
      };
    });
  });

  const byDepartment = (departments: string[]) =>
    people.filter((person) => departments.includes(person.attributes.primaryDepartment ?? ""));
  const byIdsWithDescendants = (ids: string[]) => {
    const picked = new Set<string>();
    uniqueExistingIds(ids, personById).forEach((id) => {
      picked.add(id);
      collectDescendants(childMap, [id]).forEach((descendantId) => picked.add(descendantId));
    });
    return [...picked].filter((id) => personById.has(id));
  };
  const unitMembers = (unitId: string) =>
    orgUnits.find((unit) => unit.def.id === unitId)?.members.map((member) => member.id) ?? [];

  const insideSalesIds = uniqueExistingIds(
    people
      .filter((person) => {
        const title = person.attributes.title.toLowerCase();
        return (
          person.attributes.primaryDepartment === "Sales Ops" &&
          (title.includes("inside sales") ||
            ["person-juan-rincon", "person-kim-buck"].includes(person.id))
        );
      })
      .map((person) => person.id),
    personById,
  );
  const salesOpsIds = uniqueExistingIds(
    byDepartment(["Sales Ops"])
      .map((person) => person.id)
      .filter((id) => !insideSalesIds.includes(id)),
    personById,
  );
  const brandMediaIds = byIdsWithDescendants(["person-christian-serge-nelson"]);
  const dealerServicesIds = unitMembers("unit-dealer-services");
  const chinaCapabilityIds = byIdsWithDescendants(["person-morgan-west"]);
  const engineeringSupportIds = uniqueExistingIds(
    people
      .filter((person) => {
        const department = person.attributes.primaryDepartment ?? "";
        return (
          department === "Technology and Innovation" ||
          department.startsWith("R&D ")
        );
      })
      .map((person) => person.id),
    personById,
  );
  const operationsSupportIds = uniqueExistingIds(
    people
      .filter((person) =>
        ["Ops SC", "Quality Control"].includes(person.attributes.primaryDepartment ?? ""),
      )
      .map((person) => person.id),
    personById,
  );

  const pods: FormationPodSpec[] = [
    {
      id: "inside-sales",
      label: "Inside Sales",
      service: "Inside Sales",
      tier: "direct",
      memberIds: insideSalesIds,
      leadId: "person-juan-rincon",
      position: { x: 140, y: 1120 },
      accentColor: "#0ea5e9",
      homeLane: "Sales Ops",
      targetLane: "Residential",
    },
    {
      id: "brand-media",
      label: "Brand Media Team",
      service: "Brand Media Team",
      tier: "direct",
      memberIds: brandMediaIds,
      leadId: "person-christian-serge-nelson",
      position: { x: 470, y: 1120 },
      accentColor: "#8b5cf6",
      homeLane: "Brand Marketing",
      targetLane: "Residential",
    },
    {
      id: "dealer-services",
      label: "Dealer Services",
      service: "Dealer Services",
      tier: "direct",
      memberIds: dealerServicesIds,
      leadId: "person-brad-thiess",
      position: { x: 800, y: 1120 },
      accentColor: "#14b8a6",
      homeLane: "Dealer Services",
      targetLane: "Residential",
    },
    {
      id: "china-capability",
      label: "China Capability",
      service: "China Capability",
      tier: "capability",
      memberIds: chinaCapabilityIds,
      leadId: "person-morgan-west",
      position: { x: 1130, y: 1120 },
      accentColor: "#f97316",
      homeLane: "Operations",
      targetLane: "Residential",
    },
    {
      id: "sales-operations",
      label: "Sales Operations",
      service: "Sales Operations",
      tier: "shared",
      memberIds: salesOpsIds,
      leadId: "person-jenna-campfield",
      position: { x: 300, y: 1450 },
      accentColor: "#0284c7",
      homeLane: "Sales Ops",
      targetLane: "Residential",
    },
    {
      id: "product-engineering",
      label: "Product & Engineering",
      service: "Product & Engineering",
      tier: "shared",
      memberIds: engineeringSupportIds,
      leadId: "person-derick-dahl",
      position: { x: 630, y: 1450 },
      accentColor: "#2563eb",
      homeLane: "R&D / Technology",
      targetLane: "Residential",
    },
    {
      id: "operations-support",
      label: "Operations Support",
      service: "Operations Support",
      tier: "shared",
      memberIds: operationsSupportIds,
      leadId: "person-jorge-notni",
      position: { x: 960, y: 1450 },
      accentColor: "#0891b2",
      homeLane: "Operations",
      targetLane: "Residential",
    },
    {
      id: "finance",
      label: "Finance",
      service: "Finance",
      tier: "enterprise",
      memberIds: unitMembers("unit-finance"),
      leadId: "person-pat-mcgaughan",
      position: { x: 140, y: 1780 },
      accentColor: "#64748b",
      homeLane: "Finance",
      targetLane: "all businesses",
    },
    {
      id: "admin-hr",
      label: "Administration & HR",
      service: "Administration & HR",
      tier: "enterprise",
      memberIds: unitMembers("unit-administration"),
      leadId: "person-grace-dryer",
      position: { x: 470, y: 1780 },
      accentColor: "#64748b",
      homeLane: "Administration",
      targetLane: "all businesses",
    },
    {
      id: "information-technology",
      label: "Information Technology",
      service: "Information Technology",
      tier: "enterprise",
      memberIds: unitMembers("unit-it"),
      leadId: "person-mark-litz",
      position: { x: 800, y: 1780 },
      accentColor: "#64748b",
      homeLane: "IT",
      targetLane: "all businesses",
    },
    {
      id: "fontana-warehouse",
      label: "Fontana Warehouse",
      service: "Fontana Warehouse",
      tier: "facility",
      memberIds: unitMembers("unit-fontana-warehouse"),
      leadId: "person-fred-salehi",
      position: { x: 140, y: 2110 },
      accentColor: "#10b981",
      homeLane: "Ops FNT",
      targetLane: "Residential",
    },
    {
      id: "minden-production",
      label: "Minden Production",
      service: "Minden Production",
      tier: "facility",
      memberIds: unitMembers("unit-minden-production"),
      position: { x: 470, y: 2110 },
      accentColor: "#10b981",
      homeLane: "James Manufacturing",
      targetLane: "Residential",
    },
    {
      id: "minden-operations",
      label: "Minden Operations",
      service: "Minden Operations",
      tier: "facility",
      memberIds: unitMembers("unit-minden-operations"),
      leadId: "person-joe-timpone",
      position: { x: 800, y: 2110 },
      accentColor: "#10b981",
      homeLane: "Ops MND",
      targetLane: "Residential",
    },
  ];

  const layers: FormationLayerSpec[] = [
    {
      id: "residential-branches",
      label: "Residential branches",
      color: "#7c3aed",
      position: { x: -220, y: 260 },
      size: { width: 3260, height: 790 },
      count: peopleIds.size,
    },
    {
      id: "direct-support",
      label: "Direct support pods",
      color: "#0ea5e9",
      position: { x: -220, y: 1070 },
      size: { width: 3260, height: 260 },
      count: pods.filter((pod) => pod.tier === "direct" || pod.tier === "capability").length,
    },
    {
      id: "shared-support",
      label: "Shared support",
      color: "#6366f1",
      position: { x: -220, y: 1400 },
      size: { width: 3260, height: 260 },
      count: pods.filter((pod) => pod.tier === "shared").length,
    },
    {
      id: "enterprise-foundation",
      label: "Enterprise foundation",
      color: "#64748b",
      position: { x: -220, y: 1730 },
      size: { width: 3260, height: 260 },
      count: pods.filter((pod) => pod.tier === "enterprise").length,
    },
    {
      id: "physical-foundation",
      label: "Facilities foundation",
      color: "#10b981",
      position: { x: -220, y: 2060 },
      size: { width: 3260, height: 260 },
      count: pods.filter((pod) => pod.tier === "facility").length,
    },
  ];

  pods.forEach((pod) => {
    positions[`${FORMATION_POD_PREFIX}${pod.id}`] = pod.position;
  });

  return {
    peopleIds,
    positions,
    pods,
    layers,
    frameIds: [
      RESIDENTIAL_ROOT_ID,
      ...branchRootIds,
      ...branchReportIds,
      ...pods
        .filter((pod) => pod.tier === "direct" || pod.tier === "capability")
        .map((pod) => `${FORMATION_POD_PREFIX}${pod.id}`),
    ],
  };
};

const buildBrandCoverageSpec = (
  people: PersonNode[],
  personById: Map<string, PersonNode>,
  childMap: Record<string, string[]>,
  orgUnits: ComputedUnit[],
): BrandCoverageSpec => {
  const assigned = new Set<string>();
  const rank: Record<string, number> = {
    "c-suite": 5,
    vp: 4,
    director: 3,
    manager: 2,
    ic: 1,
  };
  const departments = (values: string[]) =>
    uniqueExistingIds(
      people
        .filter((person) => values.includes(person.attributes.primaryDepartment ?? ""))
        .map((person) => person.id),
      personById,
    );
  const unitIds = (unitId: string) =>
    orgUnits.find((unit) => unit.def.id === unitId)?.members.map((member) => member.id) ?? [];
  const foundationUnitIds = new Set([
    ...unitIds("unit-finance"),
    ...unitIds("unit-administration"),
    ...unitIds("unit-it"),
    ...unitIds("unit-fontana-warehouse"),
    ...unitIds("unit-minden-operations"),
  ]);
  const withoutFoundationUnits = (ids: string[]) => ids.filter((id) => !foundationUnitIds.has(id));
  const subtreeIds = (rootId: string) =>
    uniqueExistingIds([rootId, ...collectDescendants(childMap, [rootId])], personById);
  const take = (ids: string[]) => {
    const uniqueIds = uniqueExistingIds(ids, personById).filter((id) => !assigned.has(id));
    uniqueIds.forEach((id) => assigned.add(id));
    return uniqueIds;
  };
  const bestLead = (ids: string[], fallbackId?: string) => {
    if (fallbackId && personById.has(fallbackId)) return fallbackId;
    return [...ids].sort((a, b) => {
      const left = personById.get(a);
      const right = personById.get(b);
      return (rank[right?.attributes.tier ?? "ic"] ?? 0) - (rank[left?.attributes.tier ?? "ic"] ?? 0);
    })[0];
  };
  const addPod = (pod: Omit<FormationPodSpec, "memberIds" | "leadId"> & {
    memberIds: string[];
    leadId?: string;
  }): FormationPodSpec | null => {
    const memberIds = take(pod.memberIds);
    if (memberIds.length === 0) return null;
    return {
      ...pod,
      memberIds,
      leadId: bestLead(memberIds, pod.leadId),
    };
  };

  const pods = [
    addPod({
      id: "brand-iport-enterprise",
      label: "iPort Enterprise Sales",
      service: "iPort Dedicated",
      tier: "direct",
      memberIds: [...departments(["iPort Enterprise Sales"]), "person-chris-lawson"],
      leadId: "person-chris-lawson",
      position: { x: 48, y: 78 },
      accentColor: BRAND_COLORS.iPort,
      homeLane: "iPort",
      targetLane: "iPort",
    }),
    addPod({
      id: "brand-iport-product",
      label: "iPort Product Development",
      service: "iPort Dedicated",
      tier: "direct",
      memberIds: departments(["R&D iPort Engineering"]),
      leadId: "person-alex-birch",
      position: { x: 336, y: 78 },
      accentColor: BRAND_COLORS.iPort,
      homeLane: "iPort",
      targetLane: "iPort",
    }),
    addPod({
      id: "brand-iport-marketing",
      label: "iPort Enterprise Marketing",
      service: "iPort Dedicated",
      tier: "direct",
      memberIds: departments(["iPort Enterprise Marketing"]),
      leadId: "person-debbie-michelle",
      position: { x: 624, y: 78 },
      accentColor: BRAND_COLORS.iPort,
      homeLane: "iPort",
      targetLane: "iPort",
    }),
    addPod({
      id: "brand-james-manufacturing",
      label: "Minden Manufacturing",
      service: "James Dedicated",
      tier: "facility",
      memberIds: unitIds("unit-minden-production"),
      leadId: "person-alberto-gomez",
      position: { x: 1010, y: 78 },
      accentColor: BRAND_COLORS.James,
      homeLane: "James",
      targetLane: "James",
    }),
    addPod({
      id: "brand-residential-coverage",
      label: "Residential Sales Coverage",
      service: "Sonance / All Brands Support",
      tier: "shared",
      memberIds: uniqueExistingIds(
        withoutFoundationUnits(
          people
            .filter((person) =>
              person.attributes.channels.some((channel) => channelTopGroup(channel) === "Residential"),
            )
            .map((person) => person.id),
        ),
        personById,
      ),
      leadId: "person-jason-sloan",
      position: { x: 48, y: 438 },
      accentColor: "#7c3aed",
      homeLane: "Sales",
      targetLane: "Sonance / all brands",
    }),
    addPod({
      id: "brand-professional-coverage",
      label: "Professional Sales Coverage",
      service: "Sonance / All Brands Support",
      tier: "shared",
      memberIds: departments(["Global Commercial Sales", "National Accounts"]),
      leadId: "person-michael-bridwell",
      position: { x: 336, y: 438 },
      accentColor: "#0d9488",
      homeLane: "Sales",
      targetLane: "Sonance / all brands",
    }),
    addPod({
      id: "brand-shared-product",
      label: "Shared Product & Engineering",
      service: "Sonance / All Brands Support",
      tier: "shared",
      memberIds: departments([
        "Technology and Innovation",
        "R&D Engineering",
        "R&D Electronics Engineering",
        "R&D Speaker Engineering",
      ]),
      leadId: "person-mike-paganini",
      position: { x: 624, y: 438 },
      accentColor: "#2563eb",
      homeLane: "Product & engineering",
      targetLane: "Sonance / all brands",
    }),
    addPod({
      id: "brand-marketing",
      label: "Brand Marketing",
      service: "Sonance / All Brands Support",
      tier: "shared",
      memberIds: uniqueExistingIds(
        [...subtreeIds("person-christian-serge-nelson"), ...departments(["Global Commercial Marketing", "Global Luxury Resi"])],
        personById,
      ),
      leadId: "person-christian-serge-nelson",
      position: { x: 912, y: 438 },
      accentColor: "#8b5cf6",
      homeLane: "Marketing",
      targetLane: "Sonance / all brands",
    }),
    addPod({
      id: "brand-dealer-services",
      label: "Dealer Services",
      service: "Sonance / All Brands Support",
      tier: "shared",
      memberIds: unitIds("unit-dealer-services"),
      leadId: "person-brad-thiess",
      position: { x: 1200, y: 438 },
      accentColor: "#14b8a6",
      homeLane: "Dealer Services",
      targetLane: "Sonance / all brands",
    }),
    addPod({
      id: "brand-finance",
      label: "Finance",
      service: "Shared Services Foundation",
      tier: "enterprise",
      memberIds: unitIds("unit-finance"),
      leadId: "person-mike-neves",
      position: { x: 48, y: 816 },
      accentColor: "#475569",
      homeLane: "Finance",
      targetLane: "all brands",
    }),
    addPod({
      id: "brand-admin-hr",
      label: "Administration & HR",
      service: "Shared Services Foundation",
      tier: "enterprise",
      memberIds: unitIds("unit-administration"),
      leadId: "person-grace-dryer",
      position: { x: 336, y: 816 },
      accentColor: "#db2777",
      homeLane: "Administration",
      targetLane: "all brands",
    }),
    addPod({
      id: "brand-it",
      label: "Information Technology",
      service: "Shared Services Foundation",
      tier: "enterprise",
      memberIds: unitIds("unit-it"),
      leadId: "person-mark-litz",
      position: { x: 624, y: 816 },
      accentColor: "#0369a1",
      homeLane: "IT",
      targetLane: "all brands",
    }),
    addPod({
      id: "brand-fontana",
      label: "Fontana Warehouse",
      service: "Shared Services Foundation",
      tier: "facility",
      memberIds: unitIds("unit-fontana-warehouse"),
      leadId: "person-fred-salehi",
      position: { x: 912, y: 816 },
      accentColor: "#10b981",
      homeLane: "Ops FNT",
      targetLane: "all brands",
    }),
    addPod({
      id: "brand-minden-operations",
      label: "Minden Operations",
      service: "Shared Services Foundation",
      tier: "facility",
      memberIds: unitIds("unit-minden-operations"),
      leadId: "person-joe-timpone",
      position: { x: 1200, y: 816 },
      accentColor: "#0f766e",
      homeLane: "Ops MND",
      targetLane: "all brands",
    }),
  ].filter((pod): pod is FormationPodSpec => Boolean(pod));

  const layers: FormationLayerSpec[] = [
    {
      id: "brand-iport-dedicated",
      label: "iPort Dedicated",
      color: BRAND_COLORS.iPort,
      position: { x: 0, y: 20 },
      size: { width: 928, height: 270 },
      count: pods.filter((pod) => pod.id.startsWith("brand-iport")).length,
    },
    {
      id: "brand-james-dedicated",
      label: "James Dedicated",
      color: BRAND_COLORS.James,
      position: { x: 962, y: 20 },
      size: { width: 342, height: 270 },
      count: pods.filter((pod) => pod.id.startsWith("brand-james")).length,
    },
    {
      id: "brand-all-support",
      label: "Sonance / All Brands Support",
      color: BRAND_COLORS["All Brands"],
      position: { x: 0, y: 382 },
      size: { width: 1504, height: 280 },
      count: pods.filter((pod) => pod.service === "Sonance / All Brands Support").length,
    },
    {
      id: "brand-shared-foundation",
      label: "Shared Services Foundation",
      color: "#64748b",
      position: { x: 0, y: 760 },
      size: { width: 1504, height: 280 },
      count: pods.filter((pod) => pod.service === "Shared Services Foundation").length,
    },
  ];

  return { pods, layers };
};

const formationPodBadge = (tier: FormationPodTier) => {
  if (tier === "direct") return "Direct support";
  if (tier === "shared") return "Shared support";
  if (tier === "enterprise") return "Enterprise foundation";
  if (tier === "facility") return "Facilities foundation";
  return "Capability pod";
};

const buildAreaCardSpecs = (
  people: PersonNode[],
  personById: Map<string, PersonNode>,
  childMap: Record<string, string[]>,
  orgUnits: ComputedUnit[],
): AreaCardSpec[] => {
  const subtreeIds = (rootId: string) =>
    uniqueExistingIds([rootId, ...collectDescendants(childMap, [rootId])], personById);
  const channelIds = (channel: string) =>
    uniqueExistingIds(
      people
        .filter((person) => person.attributes.channels.includes(channel))
        .map((person) => person.id),
      personById,
    );
  const residentialIds = uniqueExistingIds(
    people
      .filter((person) =>
        person.attributes.channels.some((channel) => channelTopGroup(channel) === "Residential"),
      )
      .map((person) => person.id),
    personById,
  );
  const departmentIds = (departments: string[]) =>
    uniqueExistingIds(
      people
        .filter((person) => {
          const primary = person.attributes.primaryDepartment;
          return Boolean(
            (primary && departments.includes(primary)) ||
              person.attributes.departments.some((department) => departments.includes(department)),
          );
        })
        .map((person) => person.id),
      personById,
    );
  const unitIds = (unitId: string) =>
    orgUnits.find((unit) => unit.def.id === unitId)?.members.map((member) => member.id) ?? [];
  const addSpec = (spec: Omit<AreaCardSpec, "memberIds"> & { memberIds: string[] }) => {
    const memberIds = uniqueExistingIds(spec.memberIds, personById);
    if (!personById.has(spec.displayUnderId) || memberIds.length === 0) return null;
    return { ...spec, memberIds };
  };

  return [
    addSpec({
      id: "area-residential",
      label: "Residential Sales",
      displayUnderId: "person-jason-sloan",
      ownerId: "person-jason-sloan",
      rootId: "person-jason-sloan",
      memberIds: residentialIds,
      kind: "Business area",
      detail: "Residential channels and direct support",
      accentColor: "#7c3aed",
      action: { type: "formation", viewId: "all-residential" },
    }),
    addSpec({
      id: "area-luxury-residential",
      label: "Luxury Residential",
      displayUnderId: "person-jason-sloan",
      ownerId: "person-tyler-kungl",
      rootId: "person-tyler-kungl",
      memberIds: channelIds("Luxury Residential"),
      kind: "Channel",
      detail: "North America luxury residential",
      accentColor: "#a855f7",
      action: { type: "operating-view", dimension: "channel", value: "Luxury Residential", viewId: "luxury-residential" },
    }),
    addSpec({
      id: "area-national-accounts",
      label: "National Accounts",
      displayUnderId: "person-jason-sloan",
      ownerId: "person-nathan-whitesel",
      rootId: "person-nathan-whitesel",
      memberIds: channelIds("National Accounts"),
      kind: "Channel",
      detail: "National account sales team",
      accentColor: "#8b5cf6",
      action: { type: "operating-view", dimension: "channel", value: "National Accounts", viewId: "national-accounts" },
    }),
    addSpec({
      id: "area-international-residential",
      label: "International Residential",
      displayUnderId: "person-jason-sloan",
      ownerId: "person-jay-lazzaro-jr",
      rootId: "person-jay-lazzaro-jr",
      memberIds: channelIds("International Residential"),
      kind: "Channel",
      detail: "International residential coverage",
      accentColor: "#d946ef",
      action: { type: "operating-view", dimension: "channel", value: "International Residential", viewId: "international-residential" },
    }),
    addSpec({
      id: "area-residential-marketing",
      label: "Residential Marketing",
      displayUnderId: "person-jason-sloan",
      ownerId: "person-aron-mckay",
      rootId: "person-aron-mckay",
      memberIds: subtreeIds("person-aron-mckay"),
      kind: "Support area",
      detail: "Marketing support for residential",
      accentColor: "#0ea5e9",
      action: { type: "team", rootId: "person-aron-mckay" },
    }),
    addSpec({
      id: "area-professional",
      label: "Professional Sales",
      displayUnderId: "person-michael-sonntag",
      ownerId: "person-michael-sonntag",
      rootId: "person-michael-sonntag",
      memberIds: uniqueExistingIds([
        ...channelIds("North America Professional"),
        ...channelIds("International Professional"),
        ...departmentIds(["Global Commercial Sales"]),
      ], personById),
      kind: "Business area",
      detail: "Professional and commercial channels",
      accentColor: "#0d9488",
      action: { type: "team", rootId: "person-michael-sonntag" },
    }),
    addSpec({
      id: "area-north-america-professional",
      label: "North America Professional",
      displayUnderId: "person-michael-sonntag",
      ownerId: "person-michael-bridwell",
      rootId: "person-michael-bridwell",
      memberIds: channelIds("North America Professional"),
      kind: "Channel",
      detail: "Professional US and Canada",
      accentColor: "#2563eb",
      action: { type: "operating-view", dimension: "channel", value: "North America Professional", viewId: "north-america-professional" },
    }),
    addSpec({
      id: "area-enterprise",
      label: "Enterprise",
      displayUnderId: "person-michael-sonntag",
      ownerId: "person-chris-lawson",
      rootId: "person-chris-lawson",
      memberIds: channelIds("Enterprise"),
      kind: "Channel",
      detail: "Enterprise and iPort go-to-market",
      accentColor: "#14b8a6",
      action: { type: "operating-view", dimension: "channel", value: "Enterprise", viewId: "enterprise" },
    }),
    addSpec({
      id: "area-finance",
      label: "Finance",
      displayUnderId: "person-pat-mcgaughan",
      ownerId: "person-pat-mcgaughan",
      leadId: "person-mike-neves",
      rootId: "person-mike-neves",
      memberIds: unitIds("unit-finance"),
      kind: "Shared service",
      detail: "Finance foundation",
      accentColor: "#475569",
      action: { type: "team", rootId: "person-mike-neves" },
    }),
    addSpec({
      id: "area-tech-it",
      label: "Technology & IT",
      displayUnderId: "person-derick-dahl",
      ownerId: "person-derick-dahl",
      rootId: "person-derick-dahl",
      memberIds: uniqueExistingIds(
        [...departmentIds(["Technology and Innovation"]), ...unitIds("unit-it")],
        personById,
      ),
      kind: "Capability pod",
      detail: "Technology, innovation, and IT support",
      accentColor: "#0d9488",
      action: { type: "team", rootId: "person-derick-dahl" },
    }),
    addSpec({
      id: "area-admin-hr",
      label: "Administration & HR",
      displayUnderId: "person-grace-dryer",
      ownerId: "person-grace-dryer",
      rootId: "person-grace-dryer",
      memberIds: unitIds("unit-administration"),
      kind: "Shared service",
      detail: "People, admin, and workplace support",
      accentColor: "#db2777",
      action: { type: "team", rootId: "person-grace-dryer" },
    }),
    addSpec({
      id: "area-product-engineering",
      label: "Product & Engineering",
      displayUnderId: "person-rob-roland",
      ownerId: "person-rob-roland",
      leadId: "person-mike-paganini",
      rootId: "person-mike-paganini",
      memberIds: departmentIds(["Technology and Innovation", "R&D Engineering", "R&D Electronics Engineering", "R&D Speaker Engineering", "R&D iPort Engineering"]),
      kind: "Shared capability",
      detail: "Product, engineering, and innovation teams",
      accentColor: "#2563eb",
      action: { type: "team", rootId: "person-mike-paganini" },
    }),
    addSpec({
      id: "area-dealer-services",
      label: "Dealer Services",
      displayUnderId: "person-rob-roland",
      ownerId: "person-rob-roland",
      leadId: "person-brad-thiess",
      rootId: "person-brad-thiess",
      memberIds: unitIds("unit-dealer-services"),
      kind: "Shared service",
      detail: "Technical support, design, and field support",
      accentColor: "#14b8a6",
      action: { type: "team", rootId: "person-brad-thiess" },
    }),
    addSpec({
      id: "area-minden-operations",
      label: "Minden Operations",
      displayUnderId: "person-jorge-notni",
      ownerId: "person-jorge-notni",
      leadId: "person-joe-timpone",
      rootId: "person-joe-timpone",
      memberIds: uniqueExistingIds([...unitIds("unit-minden-operations"), ...subtreeIds("person-joe-timpone")], personById),
      kind: "Facility area",
      detail: "Minden site operations",
      accentColor: "#0f766e",
      action: { type: "team", rootId: "person-joe-timpone" },
    }),
    addSpec({
      id: "area-minden-production",
      label: "Minden Production",
      displayUnderId: "person-jorge-notni",
      ownerId: "person-jorge-notni",
      leadId: "person-alberto-gomez",
      rootId: "person-alberto-gomez",
      memberIds: unitIds("unit-minden-production"),
      kind: "Facility area",
      detail: "James assembly and finishing",
      accentColor: "#10b981",
      action: { type: "team", rootId: "person-alberto-gomez" },
    }),
    addSpec({
      id: "area-ops-sc",
      label: "San Clemente Operations",
      displayUnderId: "person-jorge-notni",
      ownerId: "person-jorge-notni",
      leadId: "person-morgan-west",
      rootId: "person-morgan-west",
      memberIds: departmentIds(["Ops SC", "Quality Control"]),
      kind: "Operations area",
      detail: "SC operations and quality",
      accentColor: "#ea580c",
      action: { type: "team", rootId: "person-morgan-west" },
    }),
  ].filter((spec): spec is AreaCardSpec => Boolean(spec));
};

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
  const workspaceMode = useGraphStore((state) => state.workspaceMode);
  const canEdit = workspaceMode !== "explore";
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
  const openEditor = useGraphStore((state) => state.openEditor);
  const toggleGrid = useGraphStore((state) => state.toggleGrid);
  const toggleSnap = useGraphStore((state) => state.toggleSnap);
  const cleanupCanvas = useGraphStore((state) => state.cleanupCanvas);
  const setCurrentViewport = useGraphStore((state) => state.setCurrentViewport);
  const currentViewportState = useGraphStore((state) => state.currentViewport);
  const mirrorLanes = useGraphStore((state) => state.mirrorLanes);
  const toggleMirrorLanes = useGraphStore((state) => state.toggleMirrorLanes);
  const collapsedIds = useGraphStore((state) => state.collapsedIds);
  const toggleCollapse = useGraphStore((state) => state.toggleCollapse);
  const addCollapsed = useGraphStore((state) => state.addCollapsed);
  const expandSubtree = useGraphStore((state) => state.expandSubtree);
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
  const [truthAuditVisible, setTruthAuditVisible] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [viewportRescueVisible, setViewportRescueVisible] = useState(false);
  const focusRequest = useGraphStore((state) => state.focusRequest);
  const groupFocusRequest = useGraphStore((state) => state.groupFocusRequest);
  const operatingViewRequest = useGraphStore((state) => state.operatingViewRequest);
  const activeOperatingViewId = useGraphStore((state) => state.activeOperatingViewId);
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
        fitVisiblePeopleRef.current({
          padding: 0.2,
          duration: 500,
          maxZoom: 1,
          reason: "unit",
          expectedIds: memberIds,
        });
      }, 160);
    },
    [setLensStore, setLensFilters],
  );
  const [currentZoom, setCurrentZoom] = useState(1);
  const lodBucketRef = useRef<"full" | "medium" | "compact">("full");
  const [teamRootId, setTeamRootId] = useState<string | null>(null);
  const [teamReturnLens, setTeamReturnLens] = useState<LensId | null>(null);
  const [savedTeamLayouts, setSavedTeamLayouts] = useState<TeamViewLayouts>(() => loadTeamViewLayouts());
  const [teamLayoutDraft, setTeamLayoutDraft] = useState<TeamLayoutDraft | null>(null);
  const [operatingViewLayouts, setOperatingViewLayouts] = useState<OperatingViewLayouts>(() =>
    loadOperatingViewLayouts(),
  );
  const [operatingViewFrameDraft, setOperatingViewFrameDraft] = useState<OperatingViewViewport | null>(null);
  const [savedViewportDefaults, setSavedViewportDefaults] = useState<SavedViewportDefaults>(() =>
    loadSavedViewportDefaults(),
  );
  // The floating Edit panel overlays the right of the canvas; this lets us
  // measure the canvas and pan a freshly selected card out from under it.
  const wrapperRef = useRef<HTMLDivElement>(null);
  // True while jumpToPerson is animating the camera, so the reveal effect
  // doesn't fight it with a second pan.
  const cameraBusyRef = useRef(false);
  const blankPanePointerRef = useRef<{ x: number; y: number; time: number } | null>(null);
  // Zoom quantized to 0.05 steps for node data: LOD/label scaling only needs
  // coarse zoom, and feeding the raw value rebuilt every node per wheel frame
  const lodZoom = useMemo(() => Math.round(currentZoom * 20) / 20, [currentZoom]);
  const [lensTransition, setLensTransition] = useState(false);
  const [edgeReveal, setEdgeReveal] = useState(false);
  const lensTransitionTimersRef = useRef<{
    glide: ReturnType<typeof setTimeout> | null;
    reveal: ReturnType<typeof setTimeout> | null;
  }>({ glide: null, reveal: null });
  const isRestoringViewport = useRef(false);
  const matrixWrapRefreshRef = useRef<Set<LensId>>(new Set());
  const previousLens = useRef(lens);
  const fitVisiblePeopleRef = useRef<(options?: FitPeopleOptions) => void>(() => {});
  const defaultFitIdsRef = useRef<string[] | null>(null);
  const viewportSettleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const orientationLoopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const orientationLoopRunRef = useRef(0);
  const operatingViewRemoteQueueRef = useRef<Promise<void>>(Promise.resolve());
  const handledFocusRequestRef = useRef<number | null>(null);
  const handledGroupFocusRequestRef = useRef<number | null>(null);
  const handledOperatingViewRequestRef = useRef<number | string | null>(null);
  const verifyOrientationTargetRef = useRef<(target: OrientationLoopTarget) => boolean>(() => true);
  const viewportShowsRenderedPersonRef = useRef<() => boolean>(() => true);

  const scheduleOrientationLoop = useCallback((target: OrientationLoopTarget) => {
    orientationLoopRunRef.current += 1;
    const runId = orientationLoopRunRef.current;
    if (orientationLoopTimerRef.current) {
      clearTimeout(orientationLoopTimerRef.current);
      orientationLoopTimerRef.current = null;
    }

    const maxAttempts = target.attempts ?? 3;
    const delayMs = target.delayMs ?? 620;
    const pass = (attempt: number) => {
      if (orientationLoopRunRef.current !== runId) return;

      if (cameraBusyRef.current || isRestoringViewport.current) {
        orientationLoopTimerRef.current = setTimeout(() => pass(attempt), 180);
        return;
      }

      if (verifyOrientationTargetRef.current(target)) {
        setViewportRescueVisible(false);
        return;
      }

      if (attempt < maxAttempts) {
        target.fallback?.();
        orientationLoopTimerRef.current = setTimeout(() => pass(attempt + 1), delayMs);
        return;
      }

      setViewportRescueVisible(!viewportShowsRenderedPersonRef.current());
    };

    orientationLoopTimerRef.current = setTimeout(() => pass(1), delayMs);
  }, []);

  const playLensTransition = useCallback(() => {
    if (lensTransitionTimersRef.current.glide) {
      clearTimeout(lensTransitionTimersRef.current.glide);
    }
    if (lensTransitionTimersRef.current.reveal) {
      clearTimeout(lensTransitionTimersRef.current.reveal);
    }

    setLensTransition(true);
    setEdgeReveal(false);
    lensTransitionTimersRef.current.glide = setTimeout(() => {
      setLensTransition(false);
      setEdgeReveal(true);
    }, 920);
    lensTransitionTimersRef.current.reveal = setTimeout(() => setEdgeReveal(false), 1600);
  }, []);

  useEffect(() => {
    const timers = lensTransitionTimersRef.current;
    return () => {
      if (timers.glide) {
        clearTimeout(timers.glide);
      }
      if (timers.reveal) {
        clearTimeout(timers.reveal);
      }
    };
  }, []);

  useEffect(() => {
    window.addEventListener(LENS_PRESET_TRANSITION_EVENT, playLensTransition);
    return () => window.removeEventListener(LENS_PRESET_TRANSITION_EVENT, playLensTransition);
  }, [playLensTransition]);

  // Briefly enable the glide transition when the lens changes so cards
  // animate from their old positions to the new grouping
  useEffect(() => {
    if (previousLens.current === lens) return;
    previousLens.current = lens;
    playLensTransition();
  }, [lens, playLensTransition]);
  const [quickAddDialog, setQuickAddDialog] = useState<{
    open: boolean;
    mode: 'direct-report' | 'new-person';
    managerId?: string;
    managerName?: string;
    position?: { x: number; y: number };
  }>({ open: false, mode: 'new-person' });

  // Mouse-wheel behavior: zoom (default, mouse-friendly) or pan (trackpad-friendly)
  const [scrollZoom, setScrollZoom] = useState<boolean>(true);
  const [matrixRelationshipMode, setMatrixRelationshipMode] = useState<MatrixRelationshipMode>("reporting");
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
    () =>
      fitVisiblePeopleRef.current({
        padding: getLensFitPadding(lens),
        duration: 300,
        minZoom: getLensFitMinZoom(lens, wrapperRef.current?.clientWidth),
        maxZoom: 1.2,
        reason: "fit",
        expectedIds: defaultFitIdsRef.current ?? undefined,
      }),
    [lens],
  );

  const paletteActions = useMemo<PaletteAction[]>(
    () => [
      { id: "lens-1", label: "Switch to Executive Map", hint: "1", run: () => setLensStore("hierarchy") },
      { id: "lens-2", label: "Switch to Brand Coverage", hint: "2", run: () => setLensStore("brand") },
      { id: "lens-3", label: "Switch to Channel Support", hint: "3", run: () => setLensStore("channel") },
      { id: "lens-4", label: "Switch to Department Map", hint: "4", run: () => setLensStore("department") },
      { id: "lens-5", label: "Switch to Business Grid", hint: "5", run: () => setLensStore("matrix") },
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
    if (viewContext.kind === "operating-view") return;
    if (teamRootId) return;
    if ((filters?.focusIds?.length ?? 0) > 0) return;
    setViewContext(null);
  }, [viewContext, teamRootId, filters?.focusIds]);

  const personNodes = useMemo(
    () => nodesData.filter((node): node is PersonNode => node.kind === "person"),
    [nodesData],
  );
  const personNameById = useMemo(() => {
    const map = new Map<string, string>();
    personNodes.forEach((node) => map.set(node.id, node.name));
    return map;
  }, [personNodes]);
  const personById = useMemo(() => {
    const map = new Map<string, PersonNode>();
    personNodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [personNodes]);

  // Cross-cutting org units (facilities + shared services) roll up in Brand/Channel/Grid
  // views so dozens of warehouse/production/HR/finance people don't clutter every lane.
  const isCrossCutting = lens === "brand" || lens === "channel" || isGridLens(lens);
  const orgUnits = useMemo(() => computeOrgUnits(personNodes), [personNodes]);
  const unitMemberIds = useMemo(() => unitMemberIdSet(personNodes), [personNodes]);

  const noFocus = (filters?.focusIds?.length ?? 0) === 0;
  // Brand/Channel get the left rail; the Grid gets a full-width foundation band instead
  const showUnitRail = false;
  const showUnitFoundation =
    isGridLens(lens) && noFocus && orgUnits.length > 0;

  // Dedicated support-groups view: show shared-service units as pods first;
  // opening a pod drills into the people behind that shared-service group.
  const openSharedServices = useCallback((context?: Pick<ViewContext, "owner" | "description" | "publishedBy" | "publishedAt">) => {
    const ids = orgUnits
      .filter((u) => u.def.type === "shared-service")
      .flatMap((u) => u.members.map((m) => m.id));
    if (ids.length === 0) return;
    setLensStore("hierarchy");
    setTimeout(() => {
      setViewContext({
        kind: "shared-services",
        label: "Shared services",
        count: ids.length,
        owner: context?.owner,
        description: context?.description,
        publishedBy: context?.publishedBy,
        publishedAt: context?.publishedAt,
      });
      setLensFilters("hierarchy", { focusIds: ids });
      window.setTimeout(() => {
        if (rfInstance) {
          void rfInstance.fitView({
            padding: 0.24,
            duration: 500,
            minZoom: 0.45,
            maxZoom: 1.1,
          });
          setViewportRescueVisible(false);
          return;
        }
        fitVisiblePeopleRef.current({
          padding: 0.2,
          duration: 500,
          maxZoom: 1,
          reason: "shared",
          expectedIds: ids,
        });
      }, 240);
    }, 160);
  }, [orgUnits, rfInstance, setLensStore, setLensFilters]);
  const openSharedServicesDefault = useCallback(() => {
    openSharedServices();
  }, [openSharedServices]);

  // Last rendered position per node, across lenses — used as the glide start
  // point when a lens hasn't been laid out yet
  const lastRenderedPositions = useRef<Record<string, { x: number; y: number }>>({});

  const childMap = useMemo(() => buildChildMap(edgesData), [edgesData]);
  const residentialFormationSpec = useMemo(
    () => buildResidentialFormationSpec(personNodes, personById, childMap, orgUnits),
    [childMap, orgUnits, personById, personNodes],
  );
  const areaCardSpecs = useMemo(
    () => buildAreaCardSpecs(personNodes, personById, childMap, orgUnits),
    [childMap, orgUnits, personById, personNodes],
  );
  const brandCoverageSpec = useMemo(
    () => buildBrandCoverageSpec(personNodes, personById, childMap, orgUnits),
    [childMap, orgUnits, personById, personNodes],
  );
  const areaCardById = useMemo(
    () => new Map(areaCardSpecs.map((area) => [area.id, area])),
    [areaCardSpecs],
  );

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
        ? (() => {
            const hidden = collectDescendants(childMap, collapsedIds);
            if (activeOperatingViewId === DEFAULT_OPERATING_VIEW_ID) {
              SENIOR_LEADERSHIP_CONTEXT_IDS.forEach((id) => hidden.delete(id));
            }
            return hidden;
          })()
        : null,
    [lens, collapsedIds, childMap, filters?.focusIds, activeOperatingViewId],
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
    if (teamRootId === EXECUTIVE_ROOT_ID) {
      SENIOR_LEADERSHIP_CONTEXT_IDS.forEach((id) => visibleIds.add(id));
    }
    const scopedNodes = nodesData.filter((node) => visibleIds.has(node.id));
    const scopedEdges = edgesData.filter(
      (edge) =>
        edge.metadata.type === "manager" &&
        visibleIds.has(edge.source) &&
        visibleIds.has(edge.target),
    );
    const positions = calculateTeamTreeLayout(scopedNodes, scopedEdges, teamRootId);
    return {
      rootId: teamRootId,
      ids: visibleIds,
      directReportIds,
      descendantIds,
      positions:
        teamRootId === EXECUTIVE_ROOT_ID
          ? compressSeniorLeadershipTeamLayout(positions, directReportIds)
      : positions,
    };
  }, [teamRootId, childMap, nodesData, edgesData]);

  const showBrandCoverageFormation =
    lens === "brand" &&
    noFocus &&
    !teamTree &&
    viewContext?.kind !== "operating-view" &&
    viewContext?.kind !== "shared-services";

  const activeTeamPositions = useMemo(() => {
    if (!teamTree) return null;
    const saved = savedTeamLayouts[teamTree.rootId] ?? {};
    const draft = teamLayoutDraft?.rootId === teamTree.rootId ? teamLayoutDraft.positions : {};
    const positions: Record<string, { x: number; y: number }> = { ...teamTree.positions };
    teamTree.ids.forEach((id) => {
      if (saved[id]) positions[id] = saved[id];
      if (draft[id]) positions[id] = draft[id];
    });
    Object.entries(saved).forEach(([id, position]) => {
      if (isAreaCardNodeId(id)) positions[id] = position;
    });
    Object.entries(draft).forEach(([id, position]) => {
      if (isAreaCardNodeId(id)) positions[id] = position;
    });
    return positions;
  }, [savedTeamLayouts, teamLayoutDraft, teamTree]);

  const teamLayoutDirty = Boolean(teamTree && teamLayoutDraft?.rootId === teamTree.rootId && teamLayoutDraft.dirty);
  const teamLayoutSaved = Boolean(teamTree && Object.keys(savedTeamLayouts[teamTree.rootId] ?? {}).length > 0);
  const activeOperatingViewLayout =
    activeOperatingViewId && viewContext?.kind === "operating-view"
      ? operatingViewLayouts[activeOperatingViewId] ?? null
      : null;
  const operatingViewPositions = useMemo(() => {
    if (!activeOperatingViewLayout) return null;
    const published = activeOperatingViewLayout.published ?? {};
    const draft = workspaceMode === "explore" ? {} : activeOperatingViewLayout.draft ?? {};
    return { ...published, ...draft };
  }, [activeOperatingViewLayout, workspaceMode]);
  const activeOperatingViewViewport =
    activeOperatingViewLayout && workspaceMode !== "explore"
      ? activeOperatingViewLayout.draftViewport ?? activeOperatingViewLayout.publishedViewport ?? null
      : activeOperatingViewLayout?.publishedViewport ?? null;
  const operatingViewFrameDirty = Boolean(operatingViewFrameDraft);
  const operatingViewLayoutDirty = Boolean(activeOperatingViewLayout?.draft) || operatingViewFrameDirty;
  const operatingViewLayoutSaved = Boolean(
    (activeOperatingViewLayout?.published &&
      Object.keys(activeOperatingViewLayout.published).length > 0) ||
      activeOperatingViewLayout?.publishedViewport,
  );
  const canDragNodes = canEdit;

  const topOverviewRootId = useMemo(() => {
    const roots = personNodes.filter((person) => !parentMap[person.id]);
    const cSuiteRoot = roots.find((person) => person.attributes.tier === "c-suite");
    return (cSuiteRoot ?? roots[0])?.id ?? null;
  }, [personNodes, parentMap]);

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
        fitVisiblePeopleRef.current({ padding: 0.2, duration: 400, maxZoom: 1.2, reason: "overview" });
      }, 450);
    }
  }, [rfInstance, personNodes.length, parentMap, collapseTargets.top, addCollapsed]);

  // "Reset view": clear the active subset (search/filter/focus), drop any
  // single-person focus, unfold everything, and reframe the whole org.
  const resetView = useCallback(() => {
    setTeamRootId(null);
    setTeamReturnLens(null);
    setTeamLayoutDraft(null);
    setViewContext(null);
    setLensFilters(lens, { focusIds: [], hiddenIds: [], activeTokens: [] });
    clearSelection();
    expandAll();
    setTimeout(() => {
      fitVisiblePeopleRef.current({ padding: 0.15, duration: 400, minZoom: 0.42, maxZoom: 1.2, reason: "lens" });
    }, 80);
  }, [lens, setLensFilters, clearSelection, expandAll]);

  useEffect(() => {
    if (teamRootId && lens !== "hierarchy") {
      setTeamRootId(null);
      setTeamReturnLens(null);
      setTeamLayoutDraft(null);
      setViewContext(null);
    }
  }, [teamRootId, lens]);

  // Action confirmation toast with one-click Undo
  const [toast, setToast] = useState<{ message: string; undoable?: boolean } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((message: string, options: { undoable?: boolean } = {}) => {
    setToast({ message, undoable: options.undoable });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 6000);
  }, []);

  const persistTeamLayouts = useCallback((layouts: TeamViewLayouts) => {
    try {
      window.localStorage.setItem(TEAM_VIEW_LAYOUTS_STORAGE_KEY, JSON.stringify(layouts));
    } catch {
      /* Storage may be unavailable; keep the in-session layout state. */
    }
  }, []);

  const saveTeamViewLayout = useCallback(() => {
    if (!teamTree || !activeTeamPositions) return;
    const positions: Record<string, { x: number; y: number }> = {};
    Object.entries(activeTeamPositions).forEach(([id, position]) => {
      if (teamTree.ids.has(id) || isAreaCardNodeId(id)) {
        positions[id] = position;
      }
    });
    const next = { ...savedTeamLayouts, [teamTree.rootId]: positions };
    setSavedTeamLayouts(next);
    persistTeamLayouts(next);
    setTeamLayoutDraft(null);
    showToast("Saved changes to this org view", { undoable: false });
  }, [activeTeamPositions, persistTeamLayouts, savedTeamLayouts, showToast, teamTree]);

  const resetTeamViewLayout = useCallback(() => {
    if (!teamTree) return;
    const next = { ...savedTeamLayouts };
    delete next[teamTree.rootId];
    setSavedTeamLayouts(next);
    persistTeamLayouts(next);
    setTeamLayoutDraft(null);
    showToast("Reset this org view to auto layout", { undoable: false });
  }, [persistTeamLayouts, savedTeamLayouts, showToast, teamTree]);

  const persistOperatingViewLayouts = useCallback((layouts: OperatingViewLayouts) => {
    try {
      window.localStorage.setItem(OPERATING_VIEW_LAYOUTS_STORAGE_KEY, JSON.stringify(layouts));
    } catch {
      /* Storage may be unavailable; keep the in-session layout state. */
    }
  }, []);

  const persistViewportDefaults = useCallback((viewports: SavedViewportDefaults) => {
    try {
      window.localStorage.setItem(VIEWPORT_DEFAULTS_STORAGE_KEY, JSON.stringify(viewports));
    } catch {
      /* Storage may be unavailable; keep the in-session viewport state. */
    }
  }, []);

  const queueRemoteOperatingViewLayout = useCallback(
    (viewId: string, mutation: OperatingViewLayoutMutation) => {
      const queued = operatingViewRemoteQueueRef.current
        .catch(() => {
          /* Keep later user actions moving even if an earlier sync failed. */
        })
        .then(() => saveRemoteOperatingViewLayout(viewId, mutation));
      operatingViewRemoteQueueRef.current = queued.then(
        () => undefined,
        () => undefined,
      );
      return queued;
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    loadRemoteOperatingViewLayouts()
      .then((remoteLayouts) => {
        if (cancelled || !remoteLayouts) return;
        setOperatingViewLayouts((current) => {
          const next = { ...current, ...remoteLayouts };
          persistOperatingViewLayouts(next);
          return next;
        });
      })
      .catch(() => {
        /* Remote persistence is additive; local layouts remain the fallback. */
      });
    return () => {
      cancelled = true;
    };
  }, [persistOperatingViewLayouts]);

  const publishOperatingViewLayout = useCallback(() => {
    if (!activeOperatingViewId || viewContext?.kind !== "operating-view") return;
    const isAdminPublish = workspaceMode === "publish";
    const focusIds = filters?.focusIds ?? [];
    const focusSet = new Set(focusIds);
    const existing = operatingViewLayouts[activeOperatingViewId] ?? {};
    const source = existing.draft ?? existing.published ?? {};
    const viewport =
      operatingViewFrameDraft ??
      existing.draftViewport ??
      existing.publishedViewport ??
      (rfInstance ? normalizeViewport(rfInstance.getViewport()) : normalizeViewport(currentViewportState));
    const published: Record<string, { x: number; y: number }> = {};
    Object.entries(source).forEach(([id, position]) => {
      if (focusSet.has(id) || (isResidentialFormationContext(viewContext) && isFormationPodNodeId(id))) {
        published[id] = position;
      }
    });
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const actor = viewContext.owner ?? viewContext.publishedBy ?? "View owner";
    const next = {
      ...operatingViewLayouts,
      [activeOperatingViewId]: {
        ...existing,
        draft: published,
        draftViewport: viewport,
        draftUpdatedAt: now.toISOString(),
        approvalStatus: "pending_approval" as const,
        pendingReason: "SLT layout changes submitted for admin approval",
        submittedAt: today,
        submittedBy: actor,
      },
    };
    if (!isAdminPublish) {
      setOperatingViewLayouts(next);
      persistOperatingViewLayouts(next);
    }
    void queueRemoteOperatingViewLayout(activeOperatingViewId, {
      mode: isAdminPublish ? "approve" : "submit",
      label: viewContext.label,
      owner: viewContext.owner,
      actor,
      publishedBy: actor,
      reason: isAdminPublish
        ? "Admin approved and published arrangement and default frame"
        : "SLT layout and default frame submitted for admin approval",
      layout: published,
      viewport,
    })
      .then((remoteLayout) => {
        if (!remoteLayout) return;
        setOperatingViewLayouts((current) => {
          const normalizedRemote =
            remoteLayout.approvalStatus === "approved"
              ? {
                  ...remoteLayout,
                  draft: undefined,
                  draftUpdatedAt: undefined,
                  pendingReason: undefined,
                }
              : remoteLayout;
          const synced = {
            ...current,
            [activeOperatingViewId]: {
              ...current[activeOperatingViewId],
              ...normalizedRemote,
            },
          };
          persistOperatingViewLayouts(synced);
          return synced;
        });
        setOperatingViewFrameDraft(null);
        if (isAdminPublish) {
          showToast(`Approved and published ${viewContext.label}`, { undoable: false });
        }
      })
      .catch(() => {
        showToast(`Saved ${viewContext.label} locally; Supabase sync will retry on next save`, { undoable: false });
      });
    showToast(
      isAdminPublish
        ? `Publishing ${viewContext.label}...`
        : `Submitted ${viewContext.label} for admin approval`,
      { undoable: false },
    );
  }, [
    activeOperatingViewId,
    currentViewportState,
    filters?.focusIds,
    operatingViewFrameDraft,
    operatingViewLayouts,
    persistOperatingViewLayouts,
    queueRemoteOperatingViewLayout,
    rfInstance,
    showToast,
    viewContext,
    workspaceMode,
  ]);

  const discardOperatingViewDraft = useCallback(() => {
    if (!activeOperatingViewId || viewContext?.kind !== "operating-view") return;
    const existing = operatingViewLayouts[activeOperatingViewId];
    if (!existing?.draft) return;
    const next = {
      ...operatingViewLayouts,
      [activeOperatingViewId]: {
        ...existing,
        draft: undefined,
        draftViewport: undefined,
        draftUpdatedAt: undefined,
        approvalStatus: existing.published ? ("approved" as const) : ("draft" as const),
        pendingReason: undefined,
      },
    };
    setOperatingViewLayouts(next);
    setOperatingViewFrameDraft(null);
    persistOperatingViewLayouts(next);
    void queueRemoteOperatingViewLayout(activeOperatingViewId, {
      mode: "discard",
      label: viewContext.label,
      owner: viewContext.owner,
      actor: viewContext.owner ?? viewContext.publishedBy ?? "View owner",
      reason: "Discarded arrangement draft",
    }).catch(() => {
      /* Local discard remains valid if remote sync is temporarily unavailable. */
    });
    showToast(`Discarded ${viewContext.label} draft`, { undoable: false });
  }, [activeOperatingViewId, operatingViewLayouts, persistOperatingViewLayouts, queueRemoteOperatingViewLayout, showToast, viewContext]);

  const resetOperatingViewLayout = useCallback(() => {
    if (!activeOperatingViewId || viewContext?.kind !== "operating-view") return;
    const next = { ...operatingViewLayouts };
    delete next[activeOperatingViewId];
    setOperatingViewLayouts(next);
    setOperatingViewFrameDraft(null);
    persistOperatingViewLayouts(next);
    void queueRemoteOperatingViewLayout(activeOperatingViewId, {
      mode: "reset",
      label: viewContext.label,
      owner: viewContext.owner,
      actor: viewContext.owner ?? viewContext.publishedBy ?? "View owner",
      publishedBy: viewContext.owner ?? viewContext.publishedBy ?? "View owner",
      reason: "Reset arrangement to auto layout",
    }).catch(() => {
      /* Local reset remains valid if remote sync is temporarily unavailable. */
    });
    showToast(`Reset ${viewContext.label} to auto layout`, { undoable: false });
  }, [activeOperatingViewId, operatingViewLayouts, persistOperatingViewLayouts, queueRemoteOperatingViewLayout, showToast, viewContext]);

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
          fitVisiblePeopleRef.current({
            padding: 0.22,
            duration: 450,
            maxZoom: 1,
            reason: "shared",
            expectedIds: focusedMembers,
          });
        }, 180);
      }, 120);
    },
    [childMap, setLensStore, setLensFilters, clearSelection, showToast],
  );

  const openTeamTree = useCallback(
    (nodeId: string, context?: ViewContext) => {
      setTeamReturnLens((current) => current ?? lens);
      setTeamLayoutDraft(null);
      setViewContext(context ?? null);
      setLensStore("hierarchy");
      setLensFilters("hierarchy", { focusIds: [], hiddenIds: [], activeTokens: [] });
      clearSelection();
      expandAll();
      setTeamRootId(nodeId);
      const name = personNameById.get(nodeId) ?? "Selected person";
      showToast(context?.kind === "unit" ? `Opened ${context.label} team view` : `Opened ${name}'s org view`);
    },
    [lens, setLensStore, setLensFilters, clearSelection, expandAll, personNameById, showToast],
  );

  const selectPersonFromCard = useCallback(
    (id: string, additive?: boolean) => {
      selectNode(id, additive);
    },
    [selectNode],
  );

  const framePositionMap = useCallback(
    (
      ids: string[],
      positions: Record<string, { x: number; y: number }>,
      options: FitPeopleOptions & { verticalBias?: number } = {},
    ) => {
      if (!rfInstance || !wrapperRef.current) return false;
      const uniqueIds = [...new Set(ids)];
      const frames = uniqueIds
        .map((nodeId) => ({ id: nodeId, position: positions[nodeId] }))
        .filter((item): item is { id: string; position: { x: number; y: number } } => Boolean(item.position));
      if (frames.length === 0) return false;

      const rect = wrapperRef.current.getBoundingClientRect();
      const insetX = 72;
      const topInset = 118;
      const bottomInset = 132;
      const availableWidth = Math.max(360, rect.width - insetX * 2);
      const availableHeight = Math.max(300, rect.height - topInset - bottomInset);
      const minX = Math.min(...frames.map((item) => item.position.x));
      const maxX = Math.max(...frames.map((item) => item.position.x + NODE_WIDTH));
      const minY = Math.min(...frames.map((item) => item.position.y));
      const maxY = Math.max(...frames.map((item) => item.position.y + NODE_HEIGHT));
      const boundsWidth = Math.max(NODE_WIDTH, maxX - minX);
      const boundsHeight = Math.max(NODE_HEIGHT, maxY - minY);
      const padding = options.padding ?? 0.18;
      const zoom = Math.min(
        options.maxZoom ?? 1.05,
        Math.max(
          options.minZoom ?? 0.32,
          Math.min(
            (availableWidth * (1 - padding)) / boundsWidth,
            (availableHeight * (1 - padding)) / boundsHeight,
          ),
        ),
      );
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const targetY = topInset + availableHeight * (options.verticalBias ?? 0.4);

      cameraBusyRef.current = true;
      setViewportRescueVisible(false);
      rfInstance.setViewport(
        {
          x: insetX + availableWidth / 2 - centerX * zoom,
          y: targetY - centerY * zoom,
          zoom,
        },
        { duration: options.duration ?? 480 },
      );
      setTimeout(() => {
        cameraBusyRef.current = false;
      }, (options.duration ?? 480) + 120);
      return true;
    },
    [rfInstance],
  );

  const applySavedViewport = useCallback(
    (viewport: ViewportState | null | undefined, options: { duration?: number } = {}) => {
      if (!rfInstance || !hasSavedViewport(viewport)) return false;
      cameraBusyRef.current = true;
      isRestoringViewport.current = true;
      setViewportRescueVisible(false);
      rfInstance.setViewport(
        { x: viewport.x, y: viewport.y, zoom: viewport.zoom },
        { duration: options.duration ?? 480 },
      );
      window.setTimeout(() => {
        cameraBusyRef.current = false;
        isRestoringViewport.current = false;
      }, (options.duration ?? 480) + 140);
      return true;
    },
    [rfInstance],
  );

  const saveCurrentViewportDefault = useCallback(() => {
    const viewport = rfInstance?.getViewport() ?? currentViewportState;
    const normalized = normalizeViewport(viewport);
    if (activeOperatingViewId && viewContext?.kind === "operating-view") {
      setOperatingViewFrameDraft(normalized);
      showToast("Framing ready to save with this official view", { undoable: false });
      return;
    }
    const key = `lens:${lens}`;
    const next = { ...savedViewportDefaults, [key]: normalized };
    setSavedViewportDefaults(next);
    persistViewportDefaults(next);
    showToast(`Saved ${LENS_BY_ID[lens].label} framing`, { undoable: false });
  }, [
    activeOperatingViewId,
    currentViewportState,
    lens,
    persistViewportDefaults,
    rfInstance,
    savedViewportDefaults,
    showToast,
    viewContext?.kind,
  ]);

  const framePersonContext = useCallback(
    (id: string) => {
      if (!rfInstance || !wrapperRef.current) return;
      const fresh = useGraphStore.getState();
      const positions = activeTeamPositions ?? fresh.document.lens_state[fresh.document.lens]?.layout.positions ?? {};
      const directReports = teamTree?.rootId === id ? teamTree.directReportIds : childMap[id] ?? [];
      const descendants = collectDescendants(childMap, [id]);
      const descendantIds = [...descendants];
      const shouldFrameLocalOrg =
        !teamTree &&
        descendantIds.length > 0 &&
        descendantIds.length <= TEAM_TREE_FULL_DESCENDANT_LIMIT;
      let framePositions = positions;
      if (shouldFrameLocalOrg) {
        const focusedSubtreeIds = new Set<string>([id, ...descendantIds]);
        const rootPosition = positions[id];
        const focusedNodes = fresh.document.nodes.filter((node) => focusedSubtreeIds.has(node.id));
        const focusedEdges = fresh.document.edges.filter(
          (edge) =>
            edge.metadata.type === "manager" &&
            focusedSubtreeIds.has(edge.source) &&
            focusedSubtreeIds.has(edge.target),
        );
        const focusedLayout = calculateTeamTreeLayout(focusedNodes, focusedEdges, id);
        const focusedRoot = focusedLayout[id];
        if (rootPosition && focusedRoot) {
          const offsetX = rootPosition.x - focusedRoot.x;
          const offsetY = rootPosition.y - focusedRoot.y;
          framePositions = { ...positions };
          Object.entries(focusedLayout).forEach(([nodeId, point]) => {
            framePositions[nodeId] = {
              x: point.x + offsetX,
              y: point.y + offsetY,
            };
          });
        }
      }
      const teamTreeFrameIds =
        teamTree?.rootId === id
          ? [id, ...[...teamTree.ids].filter((teamId) => teamId !== id)]
          : null;
      const downstreamFrameIds =
        shouldFrameLocalOrg
          ? [id, ...descendantIds]
          : null;
      const frameIds =
        teamTreeFrameIds ??
        downstreamFrameIds ??
        (directReports.length > 0
          ? [id, ...directReports]
          : [parentMap[id], id].filter((value): value is string => Boolean(value)));
      const frames = frameIds
        .map((nodeId) => ({ id: nodeId, position: framePositions[nodeId] }))
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
      const isTeamRootFrame = teamTree?.rootId === id;
      const isExecutiveTeamRootFrame = isTeamRootFrame && id === EXECUTIVE_ROOT_ID;
      const rootPosition = isTeamRootFrame || shouldFrameLocalOrg ? framePositions[id] : null;
      const targetY = isTeamRootFrame
        ? rect.top + (isExecutiveTeamRootFrame ? 72 : 135)
        : shouldFrameLocalOrg
          ? rect.top + rect.height * 0.36
        : rect.top + rect.height * 0.46;

      cameraBusyRef.current = true;
      setViewportRescueVisible(false);
      rfInstance.setViewport(
        {
          x: targetX - rect.left - (rootPosition ? rootPosition.x + NODE_WIDTH / 2 : centerX) * zoom,
          y: targetY - rect.top - (rootPosition ? rootPosition.y : centerY) * zoom,
          zoom,
        },
        { duration: 420 },
      );
      setTimeout(() => {
        cameraBusyRef.current = false;
        scheduleOrientationLoop({
          reason: teamTree?.rootId === id ? "team" : "person",
          primaryId: id,
          expectedIds: frameIds,
          fallback: () =>
            framePositionMap(frameIds, framePositions, {
              padding: 0.16,
              duration: 360,
              minZoom: 0.22,
              maxZoom: 0.95,
              verticalBias: 0.38,
            }),
        });
      }, 520);
    },
    [rfInstance, childMap, parentMap, selection.nodeIds.length, teamTree, activeTeamPositions, scheduleOrientationLoop, framePositionMap],
  );

  const focusPersonFromCard = useCallback(
    (id: string, additive?: boolean) => {
      const hasReports = (childMap[id]?.length ?? 0) > 0;
      const isFocusedPerson = selection.nodeIds.length === 1 && selection.nodeIds[0] === id;
      if (!additive && lens === "hierarchy" && hasReports && isFocusedPerson && teamTree?.rootId !== id) {
        openTeamTree(id);
        return;
      }
      const hasHiddenReportsInCurrentTree =
        Boolean(teamTree && teamTree.rootId !== id && hasReports) &&
        Array.from(collectDescendants(childMap, [id])).some((descendantId) => !teamTree?.ids.has(descendantId));
      if (!additive && lens === "hierarchy" && hasHiddenReportsInCurrentTree) {
        openTeamTree(id);
        return;
      }
      if (!additive && lens === "hierarchy" && hasReports) {
        expandSubtree(id);
        selectNode(id, false);
        window.setTimeout(() => framePersonContext(id), 90);
        window.setTimeout(() => framePersonContext(id), 360);
        return;
      }
      selectNode(id, additive);
    },
    [childMap, expandSubtree, framePersonContext, lens, openTeamTree, selectNode, selection.nodeIds, teamTree],
  );

  const showOrientationOverview = useCallback((
    officialContext?: Pick<ViewContext, "owner" | "description" | "publishedBy" | "publishedAt"> & { label?: string },
    options: { forceTop?: boolean } = {},
  ) => {
    const selectedPersonId =
      selection.nodeIds.length === 1 && personNameById.has(selection.nodeIds[0])
        ? selection.nodeIds[0]
        : null;
    const currentRoot = options.forceTop ? null : teamRootId ?? selectedPersonId;
    const overviewRootId =
      (currentRoot ? parentMap[currentRoot] ?? currentRoot : null) ?? topOverviewRootId;

    if (!overviewRootId) {
      fitVisiblePeopleRef.current({ padding: 0.22, duration: 450, minZoom: 0.42, maxZoom: 1.05, reason: "overview" });
      return;
    }

    const directReportIds = childMap[overviewRootId] ?? [];
    const descendantIds = [...collectDescendants(childMap, [overviewRootId])];
    const visibleIds =
      descendantIds.length > TEAM_TREE_FULL_DESCENDANT_LIMIT
        ? new Set([overviewRootId, ...directReportIds])
        : new Set([overviewRootId, ...descendantIds]);
    if (overviewRootId === EXECUTIVE_ROOT_ID) {
      SENIOR_LEADERSHIP_CONTEXT_IDS.forEach((id) => visibleIds.add(id));
    }
    const scopedNodes = nodesData.filter((node) => visibleIds.has(node.id));
    const scopedEdges = edgesData.filter(
      (edge) =>
        edge.metadata.type === "manager" &&
        visibleIds.has(edge.source) &&
        visibleIds.has(edge.target),
    );
    const positions = calculateTeamTreeLayout(scopedNodes, scopedEdges, overviewRootId);
    const framePositions =
      overviewRootId === EXECUTIVE_ROOT_ID
        ? compressSeniorLeadershipTeamLayout(positions, directReportIds)
        : positions;
    const overviewFrameIds =
      overviewRootId === EXECUTIVE_ROOT_ID
        ? [overviewRootId, ...directReportIds, ...SENIOR_LEADERSHIP_CONTEXT_IDS]
        : [overviewRootId, ...directReportIds];
    const frameIds = [...new Set(overviewFrameIds)].filter((id) => visibleIds.has(id));

    setViewportRescueVisible(false);
    setTeamReturnLens((current) => current ?? lens);
    setViewContext(
      officialContext
        ? {
            kind: "operating-view",
            label: officialContext.label ?? "Executive overview",
            count: visibleIds.size,
            owner: officialContext.owner,
            description: officialContext.description,
            publishedBy: officialContext.publishedBy,
            publishedAt: officialContext.publishedAt,
          }
        : null,
    );
    setLensStore("hierarchy");
    setLensFilters("hierarchy", { focusIds: [], hiddenIds: [], activeTokens: [] });
    setTeamRootId(overviewRootId);
    clearSelection();

    const frameOverview = () => {
      const didFrame = framePositionMap(frameIds, framePositions, {
          padding: 0.18,
          duration: 520,
          minZoom: 0.42,
          maxZoom: 1.05,
          verticalBias: 0.22,
      });
      if (!didFrame) {
        fitVisiblePeopleRef.current({
          padding: 0.22,
          duration: 450,
          minZoom: 0.42,
          maxZoom: 1.05,
          reason: "overview",
          primaryId: overviewRootId,
          expectedIds: frameIds,
        });
        return;
      }
      scheduleOrientationLoop({
        reason: "overview",
        primaryId: overviewRootId,
        expectedIds: frameIds,
        fallback: () =>
          framePositionMap(frameIds, positions, {
            padding: 0.18,
            duration: 360,
            minZoom: 0.42,
            maxZoom: 1.05,
            verticalBias: 0.22,
          }),
      });
    };
    window.setTimeout(frameOverview, 220);
    window.setTimeout(frameOverview, 560);
  }, [
    childMap,
    edgesData,
    framePositionMap,
    lens,
    nodesData,
    parentMap,
    personNameById,
    clearSelection,
    selection.nodeIds,
    setLensFilters,
    setLensStore,
    scheduleOrientationLoop,
    teamRootId,
    topOverviewRootId,
  ]);

  const focusLensGroup = useCallback(
    (dimension: LensDimension, key: string) => {
      const members = personNodes.filter((person) =>
        getAssignments(person, dimension).includes(key),
      );
      if (members.length === 0) return;
      setTeamRootId(null);
      setTeamReturnLens(null);
      clearSelection();
      setViewContext({ kind: "lens-group", label: key, count: members.length });
      setLensFilters(lens, {
        focusIds: members.map((member) => member.id),
        hiddenIds: [],
        activeTokens: [key],
      });
      showToast(`Focused ${key}`);
      window.setTimeout(() => {
        fitVisiblePeopleRef.current({
          padding: 0.22,
          duration: 450,
          minZoom: 0.38,
          maxZoom: 1.05,
          reason: "focus",
          expectedIds: members.map((member) => member.id),
        });
      }, 180);
    },
    [clearSelection, lens, personNodes, setLensFilters, showToast],
  );

  const openOperatingView = useCallback(
    (
      dimension: LensDimension,
      key: string,
      label = key,
      context?: Pick<ViewContext, "kind" | "owner" | "description" | "publishedBy" | "publishedAt">,
      options: { scope?: "all-assigned" | "primary-team"; viewId?: string } = {},
    ) => {
      const assignedMembers = personNodes.filter((person) =>
        getAssignments(person, dimension).includes(key),
      );
      const primaryMembers = personNodes.filter((person) => getGroupKey(person, dimension) === key);
      const members =
        options.scope === "primary-team" && primaryMembers.length > 0
          ? primaryMembers
          : assignedMembers;
      if (members.length === 0) return;
      const targetLens = dimension === "brand" ? "brand" : dimension === "channel" ? "channel" : "department";
      const rootId = dimension === "channel" ? CHANNEL_ROOT_BY_CHANNEL[key] : undefined;
      const savedViewFrame = options.viewId
        ? workspaceMode === "explore"
          ? operatingViewLayouts[options.viewId]?.publishedViewport
          : operatingViewLayouts[options.viewId]?.draftViewport ??
            operatingViewLayouts[options.viewId]?.publishedViewport
        : undefined;
      const memberIds = (() => {
        if (!rootId || !personNameById.has(rootId)) return members.map((member) => member.id);
        const ids = new Set<string>([rootId]);
        members.forEach((member) => {
          ids.add(member.id);
          let ancestor = parentMap[member.id];
          const seen = new Set<string>([member.id]);
          while (ancestor && !seen.has(ancestor)) {
            ids.add(ancestor);
            if (ancestor === rootId) break;
            seen.add(ancestor);
            ancestor = parentMap[ancestor];
          }
        });
        return [...ids].filter((id) => personNameById.has(id));
      })();
      setTeamRootId(null);
      setTeamReturnLens(null);
      setOperatingViewFrameDraft(null);
      clearSelection();
      setLensStore(targetLens);
      window.setTimeout(() => {
        setLensFilters(targetLens, {
          focusIds: memberIds,
          hiddenIds: [],
          activeTokens: [key],
        });
        setViewContext({
          kind: context?.kind ?? "lens-group",
          label,
          count: members.length,
          owner: context?.owner,
          description: context?.description,
          publishedBy: context?.publishedBy,
          publishedAt: context?.publishedAt,
          rootId,
          dimension,
          value: key,
        });
        showToast(`Showing ${label}`);
        window.setTimeout(() => {
          if (applySavedViewport(savedViewFrame, { duration: 520 })) return;
          fitVisiblePeopleRef.current({
            padding: 0.14,
            duration: 520,
            minZoom: dimension === "channel" ? 0.5 : 0.34,
            maxZoom: dimension === "channel" ? 0.74 : 1.02,
            reason: "focus",
            expectedIds: memberIds,
          });
        }, 220);
      }, 170);
    },
    [
      applySavedViewport,
      clearSelection,
      operatingViewLayouts,
      parentMap,
      personNameById,
      personNodes,
      setLensFilters,
      setLensStore,
      showToast,
      workspaceMode,
    ],
  );

  const openResidentialFormation = useCallback(
    (view: Extract<PublishedOperatingView, { kind: "formation" }>) => {
      const focusIds = [...residentialFormationSpec.peopleIds];
      if (focusIds.length === 0) return;
      const existingLayout = operatingViewLayouts[view.id];
      const savedViewFrame =
        workspaceMode === "explore"
          ? existingLayout?.publishedViewport
          : existingLayout?.draftViewport ?? existingLayout?.publishedViewport;
      const framePositions = {
        ...residentialFormationSpec.positions,
        ...(existingLayout?.published ?? {}),
        ...(existingLayout?.draft ?? {}),
      };

      setTeamRootId(null);
      setTeamReturnLens(null);
      setOperatingViewFrameDraft(null);
      clearSelection();
      setLensStore("hierarchy");
      window.setTimeout(() => {
        setLensFilters("hierarchy", {
          focusIds,
          hiddenIds: [],
          activeTokens: [RESIDENTIAL_FORMATION_VALUE],
        });
        setViewContext({
          kind: "operating-view",
          label: view.label,
          count: focusIds.length,
          owner: view.owner,
          description: view.description,
          publishedBy: view.publishedBy,
          publishedAt: view.publishedAt,
          value: RESIDENTIAL_FORMATION_VALUE,
          formation: view.formation,
        });
        const frameFormation = () => {
          if (applySavedViewport(savedViewFrame, { duration: 560 })) return;
          const didFrame = framePositionMap(residentialFormationSpec.frameIds, framePositions, {
            padding: 0.12,
            duration: 560,
            minZoom: 0.22,
            maxZoom: 0.82,
            verticalBias: 0.3,
          });
          if (!didFrame) {
            fitVisiblePeopleRef.current({
              padding: 0.2,
              duration: 520,
              minZoom: 0.26,
              maxZoom: 0.88,
              reason: "focus",
              expectedIds: focusIds,
              primaryId: RESIDENTIAL_ROOT_ID,
            });
          }
        };
        window.setTimeout(frameFormation, 220);
        window.setTimeout(frameFormation, 620);
      }, 170);
    },
    [
      applySavedViewport,
      clearSelection,
      framePositionMap,
      operatingViewLayouts,
      residentialFormationSpec,
      setLensFilters,
      setLensStore,
      workspaceMode,
    ],
  );

  const openPublishedOperatingView = useCallback(
    (view: PublishedOperatingView) => {
      if (view.kind === "overview") {
        resetView();
        window.setTimeout(() => showOrientationOverview({
          label: view.label,
          owner: view.owner,
          description: view.description,
          publishedBy: view.publishedBy,
          publishedAt: view.publishedAt,
        }, { forceTop: true }), 120);
        return;
      }
      if (view.kind === "shared-services") {
        openSharedServices({
          owner: view.owner,
          description: view.description,
          publishedBy: view.publishedBy,
          publishedAt: view.publishedAt,
        });
        return;
      }
      if (view.kind === "formation") {
        openResidentialFormation(view);
        return;
      }
      openOperatingView(view.dimension, view.value, view.label, {
        kind: "operating-view",
        owner: view.owner,
        description: view.description,
        publishedBy: view.publishedBy,
        publishedAt: view.publishedAt,
      }, { scope: "primary-team", viewId: view.id });
    },
    [openOperatingView, openResidentialFormation, openSharedServices, resetView, showOrientationOverview],
  );

  const openAreaCard = useCallback(
    (areaId: string) => {
      const area = areaCardById.get(areaId);
      if (!area) return;
      if (area.action.type === "formation") {
        const view = PUBLISHED_OPERATING_VIEW_BY_ID[area.action.viewId];
        if (view?.kind === "formation") {
          openResidentialFormation(view);
          return;
        }
      }
      if (area.action.type === "operating-view") {
        openOperatingView(
          area.action.dimension,
          area.action.value,
          area.label,
          {
            kind: "operating-view",
            owner: area.ownerId ? personNameById.get(area.ownerId) : undefined,
            description: area.detail,
          },
          { scope: "primary-team", viewId: area.action.viewId },
        );
        return;
      }
      if (area.action.type === "team") {
        openTeamTree(area.action.rootId, {
          kind: "unit",
          label: area.label,
          count: area.memberIds.length,
          owner: area.ownerId ? personNameById.get(area.ownerId) : undefined,
          description: area.detail,
        });
      }
    },
    [areaCardById, openOperatingView, openResidentialFormation, openTeamTree, personNameById],
  );

  const openSeniorLeadershipHome = useCallback(() => {
    const homeView = PUBLISHED_OPERATING_VIEW_BY_ID[DEFAULT_OPERATING_VIEW_ID];
    if (homeView) {
      openPublishedOperatingView(homeView);
      return;
    }
    showOrientationOverview(undefined, { forceTop: true });
  }, [openPublishedOperatingView, showOrientationOverview]);

  const closeTeamTree = useCallback(() => {
    const returnLens = teamReturnLens;
    if (!returnLens || returnLens === "hierarchy") {
      openSeniorLeadershipHome();
      return;
    }

    setTeamRootId(null);
    setTeamReturnLens(null);
    setTeamLayoutDraft(null);
    setViewContext(null);
    setLensFilters("hierarchy", { focusIds: [], hiddenIds: [], activeTokens: [] });
    setLensStore(returnLens);
  }, [openSeniorLeadershipHome, teamReturnLens, setLensFilters, setLensStore]);

  const stepOutToBroaderView = useCallback(() => {
    if (!teamRootId) {
      clearSelection();
      return;
    }

    const parentId = parentMap[teamRootId];
    if (parentId) {
      openTeamTree(parentId);
      return;
    }

    clearSelection();
  }, [clearSelection, openTeamTree, parentMap, teamRootId]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const isBlankPaneTarget = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return false;
      if (target.closest(".react-flow__node, .react-flow__edge, button, input, textarea, select, [role='button']")) {
        return false;
      }
      return target.classList.contains("react-flow__pane");
    };

    const trackBlankPanePointer = (event: PointerEvent) => {
      if (!isBlankPaneTarget(event)) return;
      blankPanePointerRef.current = {
        x: event.clientX,
        y: event.clientY,
        time: Date.now(),
      };
    };

    const clearSelectionFromBlankClick = (event: PointerEvent) => {
      if (!isBlankPaneTarget(event)) return;

      const start = blankPanePointerRef.current;
      blankPanePointerRef.current = null;
      if (!start) return;

      const distance = Math.hypot(event.clientX - start.x, event.clientY - start.y);
      const elapsed = Date.now() - start.time;
      if (distance > 6 || elapsed > 450) return;

      clearSelection();
    };

    const stepOutFromBlankPane = (event: MouseEvent) => {
      if (!isBlankPaneTarget(event)) return;
      event.preventDefault();
      event.stopPropagation();
      if (teamRootId) stepOutToBroaderView();
      else openSeniorLeadershipHome();
    };

    wrapper.addEventListener("pointerdown", trackBlankPanePointer, true);
    wrapper.addEventListener("pointerup", clearSelectionFromBlankClick, true);
    wrapper.addEventListener("dblclick", stepOutFromBlankPane, true);
    return () => {
      wrapper.removeEventListener("pointerdown", trackBlankPanePointer, true);
      wrapper.removeEventListener("pointerup", clearSelectionFromBlankClick, true);
      wrapper.removeEventListener("dblclick", stepOutFromBlankPane, true);
    };
  }, [clearSelection, openSeniorLeadershipHome, stepOutToBroaderView, teamRootId]);

  useEffect(() => {
    if (!operatingViewRequest) return;
    if (handledOperatingViewRequestRef.current === operatingViewRequest.nonce) return;
    handledOperatingViewRequestRef.current = operatingViewRequest.nonce;
    const view = PUBLISHED_OPERATING_VIEW_BY_ID[operatingViewRequest.id];
    if (!view) return;
    openPublishedOperatingView(view);
  }, [openPublishedOperatingView, operatingViewRequest]);

  useEffect(() => {
    if (!activeOperatingViewId || operatingViewRequest) return;
    const bootKey = `active:${activeOperatingViewId}`;
    if (handledOperatingViewRequestRef.current === bootKey) return;
    const view = PUBLISHED_OPERATING_VIEW_BY_ID[activeOperatingViewId];
    if (!view) return;
    handledOperatingViewRequestRef.current = bootKey;
    window.setTimeout(() => openPublishedOperatingView(view), 120);
  }, [activeOperatingViewId, openPublishedOperatingView, operatingViewRequest]);

  const orientationMap = useMemo(() => {
    const focusIds = filters?.focusIds ?? [];
    const activeTokens = filters?.activeTokens ?? [];
    const hidden =
      selection.nodeIds.length > 0 ||
      Boolean(teamTree) ||
      focusIds.length > 0 ||
      activeTokens.length > 0;
    const sharedUnits = orgUnits.filter((unit) => unit.def.type === "shared-service");
    const facilityUnits = orgUnits.filter((unit) => unit.def.type === "facility");
    const sharedServicePods = groupSharedServicePods(sharedUnits.flatMap((unit) => unit.members));

    const groupChips = (dimension: LensDimension, limit = 8): OrientationChip[] => {
      const groups = groupNodesByDimension(personNodes, dimension);
      return [...groups.entries()]
        .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
        .slice(0, limit)
        .map(([key, members]) => ({
          id: `${dimension}:${key}`,
          label: key,
          count: members.length,
          color: getLaneColor(key, dimension),
          detail: `Focus ${members.length} ${members.length === 1 ? "person" : "people"}`,
          onClick: () => focusLensGroup(dimension, key),
        }));
    };
    const supportPodChips = (limit = 4): OrientationChip[] =>
      sharedServicePods.slice(0, limit).map((pod) => ({
        id: pod.id,
        label: pod.service === pod.label ? pod.label : pod.label,
        count: pod.members.length,
        color: "#7c3aed",
        detail:
          pod.service === pod.label
            ? "Open shared-service pod"
            : `${pod.service} shared-service pod`,
        onClick: () =>
          openSharedServiceGroup(
            pod.members.map((member) => member.id),
            pod.service === pod.label ? pod.label : `${pod.service}: ${pod.label}`,
          ),
      }));

    const hasChannel = (channel: string) =>
      personNodes.some((person) => getAssignments(person, "channel").includes(channel));

    const actions: OrientationAction[] = [
      {
        id: "overview",
        label: "Senior team",
        tone: "dark",
        onClick: () => showOrientationOverview(undefined, { forceTop: true }),
      },
    ];
    if (hasChannel("Luxury Residential")) {
      actions.push({
        id: "view-luxury-residential",
        label: "Luxury Resi",
        onClick: () => openOperatingView("channel", "Luxury Residential", "Luxury Residential"),
      });
    }
    if (hasChannel("North America Professional")) {
      actions.push({
        id: "view-na-professional",
        label: "NA Professional",
        onClick: () => openOperatingView("channel", "North America Professional", "North America Professional"),
      });
    }
    if (sharedUnits.length > 0) {
      actions.push({ id: "shared", label: "Shared services", onClick: openSharedServicesDefault });
    }
    if (canEdit) {
      actions.push({ id: "save-frame", label: "Save frame", onClick: saveCurrentViewportDefault });
    }
    actions.push({ id: "fit", label: "Fit view", onClick: fitToView });

    if (lens === "hierarchy") {
      const rootId = topOverviewRootId;
      const directReportIds = rootId ? childMap[rootId] ?? [] : [];
      const chips = directReportIds.slice(0, 8).map((id) => {
        const person = personNodes.find((candidate) => candidate.id === id);
        return {
          id,
          label: personNameById.get(id) ?? "Leader",
          count: childMap[id]?.length ?? 0,
          color: person ? getAccentColor(person, lens) : "#334155",
          detail: "Open org view",
          onClick: () => openTeamTree(id),
        };
      });
      return {
        hidden: true,
        title: "Executive Map",
        detail: "Formal reporting truth from the top, with drill-down by leader.",
        stats: [
          `${personNodes.length} people`,
          `${directReportIds.length} top reports`,
          `${sharedUnits.length + facilityUnits.length} shared-service groups`,
        ],
        chips,
        actions,
      };
    }

    if (lens === "brand" && showBrandCoverageFormation) {
      const dedicatedCount = brandCoverageSpec.pods.filter(
        (pod) => pod.service === "iPort Dedicated" || pod.service === "James Dedicated",
      ).length;
      const sharedCount = brandCoverageSpec.pods.filter(
        (pod) => pod.service === "Sonance / All Brands Support",
      ).length;
      const foundationCount = brandCoverageSpec.pods.filter(
        (pod) => pod.service === "Shared Services Foundation",
      ).length;
      return {
        hidden,
        title: "Brand Coverage",
        detail: "Dedicated brand teams, shared all-brand support, and foundation services.",
        stats: [
          `${dedicatedCount} dedicated groups`,
          `${sharedCount} shared support groups`,
          `${foundationCount} foundation groups`,
        ],
        chips: brandCoverageSpec.pods.slice(0, 7).map((pod) => ({
          id: pod.id,
          label: pod.label,
          count: pod.memberIds.length,
          color: pod.accentColor,
          detail: pod.service,
          onClick: () => openSharedServiceGroup(pod.memberIds, `${pod.service}: ${pod.label}`),
        })),
        actions,
      };
    }

    if (lens === "brand" || lens === "channel" || lens === "department") {
      const dimension = lensToDimension(lens)!;
      const groups = groupNodesByDimension(personNodes, dimension);
      return {
        hidden,
        title: LENS_BY_ID[lens].label,
        detail:
          lens === "department"
            ? "SLT leaders anchor department portfolios; department lanes sit underneath their owner."
            : "Lanes show primary ownership; support pods show teams serving multiple lanes.",
        stats: [
          `${groups.size} lanes`,
          `${personNodes.length} people`,
          `${sharedServicePods.length} support pods`,
        ],
        chips: [...supportPodChips(), ...groupChips(dimension, 6)],
        actions,
      };
    }

    const brandGroups = groupNodesByDimension(personNodes, "brand");
    const channelGroups = groupNodesByDimension(personNodes, "channel");
    return {
      hidden,
      title: "Brand x Channel Grid",
      detail: "Rows are brand homes, columns are channel coverage, foundation groups support all cells.",
      stats: [
        `${brandGroups.size} brand rows`,
        `${channelGroups.size} channel columns`,
        `${sharedUnits.length + facilityUnits.length} foundation groups`,
      ],
      chips: [
        ...groupChips("brand", 4).map((chip) => ({ ...chip, detail: "Focus brand row" })),
        ...groupChips("channel", 4).map((chip) => ({ ...chip, detail: "Focus channel column" })),
      ],
      actions,
    };
  }, [
    childMap,
    brandCoverageSpec,
    filters?.activeTokens,
    filters?.focusIds,
    fitToView,
    focusLensGroup,
    lens,
    openOperatingView,
    openSharedServicesDefault,
    openSharedServiceGroup,
    openTeamTree,
    orgUnits,
    personNameById,
    personNodes,
    canEdit,
    saveCurrentViewportDefault,
    selection.nodeIds.length,
    showOrientationOverview,
    showBrandCoverageFormation,
    teamTree,
    topOverviewRootId,
  ]);

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

  // Header command search can also ask the canvas to open a brand/channel/
  // department/shared-service group as a real framed destination.
  useEffect(() => {
    if (!groupFocusRequest) return;
    if (handledGroupFocusRequestRef.current === groupFocusRequest.nonce) return;
    handledGroupFocusRequestRef.current = groupFocusRequest.nonce;
    const focusIds = groupFocusRequest.focusIds.filter((id) => personNameById.has(id));
    if (focusIds.length === 0) return;

    setTeamRootId(null);
    setTeamReturnLens(null);
    setTeamLayoutDraft(null);
    setOperatingViewFrameDraft(null);
    clearSelection();
    setLensStore(groupFocusRequest.lens);
    window.setTimeout(() => {
      setLensFilters(groupFocusRequest.lens, {
        focusIds,
        hiddenIds: [],
        activeTokens: [groupFocusRequest.token],
      });
      setViewContext({
        kind: "lens-group",
        label: groupFocusRequest.label,
        count: focusIds.length,
      });
      showToast(`Showing ${groupFocusRequest.label}`);
      window.setTimeout(() => {
        fitVisiblePeopleRef.current({
          padding: 0.2,
          duration: 480,
          minZoom: groupFocusRequest.lens === "matrix" ? 0.26 : 0.34,
          maxZoom: groupFocusRequest.lens === "hierarchy" ? 1.1 : 0.95,
          reason: "focus",
          expectedIds: focusIds,
        });
      }, 220);
    }, 170);
  }, [
    clearSelection,
    groupFocusRequest,
    personNameById,
    setLensFilters,
    setLensStore,
    showToast,
  ]);

  // Header "Find anyone" search asks the canvas to fly to a person; the nonce
  // changes on every request so re-picking the same person still flies there.
  useEffect(() => {
    if (!focusRequest) return;
    if (handledFocusRequestRef.current === focusRequest.nonce) return;
    handledFocusRequestRef.current = focusRequest.nonce;
    if ((childMap[focusRequest.id]?.length ?? 0) > 0) {
      openTeamTree(focusRequest.id);
      return;
    }
    jumpToPerson(focusRequest.id);
  }, [childMap, focusRequest, jumpToPerson, openTeamTree]);

  useEffect(() => {
    if (!teamTree || !rfInstance) return;
    const frameScopedTeam = () => {
      if (lens === "hierarchy") {
        framePersonContext(teamTree.rootId);
        return;
      }
      fitVisiblePeopleRef.current({
        padding: 0.18,
        duration: 420,
        minZoom: lens === "matrix" ? 0.18 : 0.26,
        maxZoom: lens === "channel" ? 0.78 : 0.9,
        reason: "team-lens",
        expectedIds: [...teamTree.ids],
      });
    };
    const timers = [120, 520].map((delay) => setTimeout(frameScopedTeam, delay));
    return () => timers.forEach((timer) => clearTimeout(timer));
  }, [teamTree, rfInstance, framePersonContext, lens]);

  // Person focus mode: selecting a single person spotlights their formal
  // reporting context plus support-truth links, and dims everyone else.
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

  const relationshipRoleById = useMemo(() => {
    const roles = new Map<string, HierarchyNodeData["relationshipRole"]>();
    if (!focusedNodeId) return roles;

    const focusedName = personNameById.get(focusedNodeId) ?? "selected person";
    const managerId = parentMap[focusedNodeId];
    const managerName = managerId ? personNameById.get(managerId) ?? "their manager" : null;
    const directReports = new Set(childMap[focusedNodeId] ?? []);
    const descendants = new Set(collectDescendants(childMap, [focusedNodeId]));
    const peers = new Set(
      managerId
        ? (childMap[managerId] ?? []).filter((id) => id !== focusedNodeId)
        : [],
    );

    roles.set(focusedNodeId, {
      label: "Selected",
      detail: `${focusedName} is in focus`,
      tone: "selected",
    });

    if (managerId) {
      roles.set(managerId, {
        label: "Manager",
        detail: `${focusedName} reports to ${managerName}`,
        tone: "manager",
      });
    }

    directReports.forEach((id) => {
      roles.set(id, {
        label: "Direct report",
        detail: `${personNameById.get(id) ?? "This person"} reports to ${focusedName}`,
        tone: "report",
      });
    });

    descendants.forEach((id) => {
      if (roles.has(id)) return;
      roles.set(id, {
        label: "Downstream",
        detail: `${personNameById.get(id) ?? "This person"} is in ${focusedName}'s organization`,
        tone: "downstream",
      });
    });

    peers.forEach((id) => {
      if (roles.has(id)) return;
      roles.set(id, {
        label: "Peer",
        detail: managerName
          ? `${personNameById.get(id) ?? "This person"} also reports to ${managerName}`
          : "Same reporting level",
        tone: "peer",
      });
    });

    edgesData.forEach((edge) => {
      if (edge.metadata.type === "manager") return;
      if (edge.source !== focusedNodeId && edge.target !== focusedNodeId) return;
      const otherId = edge.source === focusedNodeId ? edge.target : edge.source;
      if (roles.has(otherId)) return;
      const definition = getRelationshipDefinition(edge.metadata.type);
      roles.set(otherId, {
        label: definition.shortLabel,
        detail:
          edge.metadata.label ??
          relationshipLabel(
            edge.metadata.type,
            personNameById.get(edge.source) ?? "This person",
            personNameById.get(edge.target) ?? focusedName,
          ),
        tone: "matrix",
      });
    });

    return roles;
  }, [focusedNodeId, personNameById, parentMap, childMap, edgesData]);

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
    if (showBrandCoverageFormation) return [];
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
  }, [filters?.focusIds, filters?.hiddenIds, hiddenByCollapse, personNodes, showBrandCoverageFormation, teamTree]);

  const visiblePositionCount = useMemo(() => {
    const positions = lensLayout?.positions ?? {};
    return visibleViewportPersonIds.filter((id) => Boolean(positions[id])).length;
  }, [lensLayout?.positions, visibleViewportPersonIds]);

  useEffect(() => {
    if (teamTree || !noFocus) {
      defaultFitIdsRef.current = null;
      return;
    }

    const highLevelIds = new Set<string>();
    if (lens === "brand") {
      Object.values(BRAND_CONTEXT_BY_BRAND).flat().forEach((id) => highLevelIds.add(id));
      personNodes.forEach((person) => {
        const tier = person.attributes.tier;
        const brand = person.attributes.primaryBrand ?? person.attributes.brands[0];
        if (!brand) return;
        if (tier === "vp" || tier === "director") highLevelIds.add(person.id);
      });
    } else if (lens === "channel") {
      Object.values(CHANNEL_CONTEXT_BY_KEY).flat().forEach((id) => highLevelIds.add(id));
      personNodes.forEach((person) => {
        const tier = person.attributes.tier;
        if (tier !== "vp" && tier !== "director") return;
        if ((person.attributes.primaryChannel ?? "All Channels") === "All Channels") return;
        highLevelIds.add(person.id);
      });
    } else if (lens === "department") {
      highLevelIds.add(DEPARTMENT_SUPER_ROOT_ID);
      DEPARTMENT_OWNER_IDS.forEach((id) => highLevelIds.add(id));
    }

    const fitIds = [...highLevelIds].filter((id) => visibleViewportPersonIds.includes(id));
    defaultFitIdsRef.current = fitIds.length > 0 ? fitIds : null;
  }, [lens, noFocus, personNodes, teamTree, visibleViewportPersonIds]);

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

  const renderedPersonIdsInView = useCallback(() => {
    const wrapper = wrapperRef.current;
    const renderedIds = new Set<string>();
    if (!wrapper) return renderedIds;
    const wrapperRect = wrapper.getBoundingClientRect();
    if (wrapperRect.width <= 0 || wrapperRect.height <= 0) return renderedIds;
    const inset = 48;
    const personElements = Array.from(wrapper.querySelectorAll<HTMLElement>(".react-flow__node")).filter((element) => {
      const id = element.dataset.id;
      return id ? isPersonFlowNodeId(id) : false;
    });
    personElements.forEach((element) => {
      const id = element.dataset.id;
      if (!id) return;
      const rect = element.getBoundingClientRect();
      const intersectsViewport =
        rect.right >= wrapperRect.left + inset &&
        rect.left <= wrapperRect.right - inset &&
        rect.bottom >= wrapperRect.top + inset &&
        rect.top <= wrapperRect.bottom - inset;
      if (!intersectsViewport) return;

      const centerX = Math.min(Math.max(rect.left + rect.width / 2, wrapperRect.left + 1), wrapperRect.right - 1);
      const centerY = Math.min(Math.max(rect.top + rect.height / 2, wrapperRect.top + 1), wrapperRect.bottom - 1);
      const topElement = document.elementFromPoint(centerX, centerY);
      if (topElement && !element.contains(topElement)) return;
      renderedIds.add(id);
    });
    return renderedIds;
  }, []);

  const viewportShowsRenderedPerson = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return true;
    const wrapperRect = wrapper.getBoundingClientRect();
    if (wrapperRect.width <= 0 || wrapperRect.height <= 0) return true;
    return renderedPersonIdsInView().size > 0;
  }, [renderedPersonIdsInView]);

  const verifyOrientationTarget = useCallback(
    (target: OrientationLoopTarget) => {
      const renderedIds = renderedPersonIdsInView();
      if (renderedIds.size === 0) return false;

      if (target.primaryId && !renderedIds.has(target.primaryId)) {
        return false;
      }

      const visibleIds = new Set(visibleViewportPersonIds);
      const expectedIds = [...new Set(target.expectedIds ?? [])].filter((id) => visibleIds.has(id));
      if (expectedIds.length === 0) return true;

      const expectedVisibleCount = expectedIds.filter((id) => renderedIds.has(id)).length;
      const minimumVisible = target.primaryId
        ? Math.min(expectedIds.length, 2)
        : Math.min(expectedIds.length, 3);
      return expectedVisibleCount >= minimumVisible;
    },
    [renderedPersonIdsInView, visibleViewportPersonIds],
  );

  useEffect(() => {
    verifyOrientationTargetRef.current = verifyOrientationTarget;
    viewportShowsRenderedPersonRef.current = viewportShowsRenderedPerson;
  }, [verifyOrientationTarget, viewportShowsRenderedPerson]);
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
      const expectedIds = options.expectedIds ?? visibleViewportPersonIds;
      const visibleIds = new Set(visibleViewportPersonIds);
      const candidateIds = [...new Set(expectedIds)].filter((id) => visibleIds.has(id));
      const nodesToFit = (candidateIds.length > 0 ? candidateIds : visibleViewportPersonIds)
        .filter((id) => Boolean(positions[id]))
        .map((id) => ({ id }));
      const fitOptions = {
        padding: options.padding ?? 0.18,
        duration: options.duration ?? 350,
        minZoom: options.minZoom ?? 0.35,
        maxZoom: options.maxZoom ?? 1.2,
      };

      setViewportRescueVisible(false);
      const scheduleFitCheck = () => {
        if (visibleViewportPersonIds.length === 0) return;
        if (options.skipOrientationLoop) return;
        window.setTimeout(() => {
          scheduleOrientationLoop({
            reason: options.reason ?? "fit",
            primaryId: options.primaryId,
            expectedIds,
            fallback: () =>
              fitVisiblePeopleRef.current({
                ...options,
                skipOrientationLoop: true,
              }),
          });
        }, (options.duration ?? 350) + 180);
      };

      if (nodesToFit.length > 0) {
        void rfInstance.fitView({
          nodes: nodesToFit,
          includeHiddenNodes: false,
          ...fitOptions,
        });
        scheduleFitCheck();
        return;
      }

      void rfInstance.fitView(fitOptions);
      scheduleFitCheck();
    },
    [rfInstance, lensLayout?.positions, visibleViewportPersonIds, scheduleOrientationLoop],
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
      const mathShowsPerson = latest.viewportShowsAnyPerson(viewport, positions);
      const renderedShowsPerson = viewportShowsRenderedPerson();
      const isBlank = !mathShowsPerson && !renderedShowsPerson;
      setViewportRescueVisible(isBlank);
      return isBlank;
    },
    [visiblePositionCount, viewportShowsRenderedPerson],
  );

  const lensMotionCue = useMemo(() => {
    const cueByLens: Record<LensId, { title: string; detail: string; color: string }> = {
      hierarchy: {
        title: "Executive Map",
        detail: "Formal reporting truth",
        color: "#334155",
      },
      brand: {
        title: "Brand Coverage",
        detail: "Dedicated brand teams and shared all-brand support",
        color: "#0284c7",
      },
      channel: {
        title: "Channel Support",
        detail: "Dedicated and shared channel support",
        color: "#0d9488",
      },
      department: {
        title: "Department Map",
        detail: "SLT ownership by department",
        color: "#7c3aed",
      },
      matrix: {
        title: "Business Grid",
        detail: "Brand rows × channel columns",
        color: "#2563eb",
      },
    };
    return cueByLens[lens] ?? {
      title: LENS_BY_ID[lens].label,
      detail: "View updated",
      color: "#334155",
    };
  }, [lens]);

  // Auto-layout on first load with spacious preset
  useEffect(() => {
    if (!personNodes.length) return;
    if (teamTree) return;
    if (showBrandCoverageFormation) return;
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
  }, [personNodes, lensLayout, cleanupCanvas, lens, hiddenByCollapse, teamTree, filters?.focusIds, showBrandCoverageFormation]);

  // Position the viewport once per lens visit (initial load or lens switch).
  // Deliberately NOT keyed on the whole lensLayout: that object changes every
  // time the viewport is persisted, which previously re-fired fitView ~once a
  // second and yanked the canvas back while the user was panning ("snapping").
  const positionedLensRef = useRef<string | null>(null);
  const positionedBrandCoverageRef = useRef<string | null>(null);

  useEffect(() => {
    if (!showBrandCoverageFormation) {
      positionedBrandCoverageRef.current = null;
      return;
    }
    if (!rfInstance) return;
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const key = `${brandCoverageSpec.layers.length}:${brandCoverageSpec.pods.length}`;
    if (positionedBrandCoverageRef.current === key) return;
    positionedBrandCoverageRef.current = key;

    const bounds = [
      ...brandCoverageSpec.layers.map((layer) => ({
        left: layer.position.x,
        top: layer.position.y,
        right: layer.position.x + layer.size.width,
        bottom: layer.position.y + layer.size.height,
      })),
      ...brandCoverageSpec.pods.map((pod) => ({
        left: pod.position.x,
        top: pod.position.y,
        right: pod.position.x + FORMATION_POD_WIDTH,
        bottom: pod.position.y + FORMATION_POD_HEIGHT,
      })),
    ];
    if (bounds.length === 0) return;

    const minX = Math.min(...bounds.map((item) => item.left));
    const minY = Math.min(...bounds.map((item) => item.top));
    const maxX = Math.max(...bounds.map((item) => item.right));
    const maxY = Math.max(...bounds.map((item) => item.bottom));
    const boundsWidth = Math.max(1, maxX - minX);
    const boundsHeight = Math.max(1, maxY - minY);
    const chromeTop = wrapper.clientWidth < 900 ? 112 : 150;
    const sidePadding = wrapper.clientWidth < 900 ? 32 : 96;
    const bottomPadding = wrapper.clientWidth < 900 ? 96 : 150;
    const zoom = Math.max(
      0.36,
      Math.min(
        (wrapper.clientWidth - sidePadding * 2) / boundsWidth,
        (wrapper.clientHeight - chromeTop - bottomPadding) / boundsHeight,
        0.96,
      ),
    );
    const viewport = {
      x: (wrapper.clientWidth - boundsWidth * zoom) / 2 - minX * zoom,
      y: chromeTop - minY * zoom,
      zoom,
    };

    const timers = [120, 520].map((delay, index) =>
      window.setTimeout(() => {
        setViewportRescueVisible(false);
        rfInstance.setViewport(viewport, { duration: index === 0 ? 280 : 180 });
      }, delay),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [brandCoverageSpec, rfInstance, showBrandCoverageFormation]);

  useEffect(() => {
    if (!rfInstance || personNodes.length === 0) return;
    if (teamTree) return;
    if (showBrandCoverageFormation) return;
    const latest = viewportRestoreRef.current;
    const currentLensLayout = latest.lensLayout;
    if (!currentLensLayout || visiblePositionCount === 0) return;
    if (positionedLensRef.current === lens) return;
    positionedLensRef.current = lens;
    let didPosition = false;

    // Presets have their own saved framing. If none exists, fall back to a
    // safe fit instead of borrowing the last camera position from another view.
    const savedDefault = savedViewportDefaults[`lens:${lens}`];
    const persisted = hasSavedViewport(savedDefault) ? savedDefault : null;
    const persistedIsDefault =
      !persisted ||
      (persisted.x === 0 && persisted.y === 0 && persisted.zoom === 1);
    const target = persistedIsDefault ? null : persisted;
    const isDefault =
      !target || (target.x === 0 && target.y === 0 && target.zoom === 1);
    const positions = currentLensLayout.positions ?? {};
    const restoreWouldBeBlank = target ? !latest.viewportShowsAnyPerson(target, positions) : false;
    const fitLensView = (duration: number) => {
      const wrapperWidth = wrapperRef.current?.clientWidth;
      const expectedIds = defaultFitIdsRef.current ?? visibleViewportPersonIds;
      fitVisiblePeopleRef.current({
        padding: getLensFitPadding(lens),
        duration,
        minZoom: getLensFitMinZoom(lens, wrapperWidth),
        maxZoom: lens === "channel" ? 0.86 : 1.2,
        reason: "lens",
        expectedIds,
      });
    };

    isRestoringViewport.current = true;
    const timer = setTimeout(() => {
      didPosition = true;
      if (isDefault || restoreWouldBeBlank) {
        // Land at a readable zoom rather than crushing a wide org into a 1px ribbon.
        // The explicit "Fit" control uses this same people-first framing.
        // Also refuse stale saved pan/zoom values that would open to empty canvas.
        fitLensView(350);
      } else {
        setViewportRescueVisible(false);
        rfInstance.setViewport(
          { x: target.x, y: target.y, zoom: target.zoom },
          { duration: 300 },
        );
        scheduleOrientationLoop({
          reason: "lens",
          expectedIds: visibleViewportPersonIds,
          fallback: () => fitLensView(320),
        });
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
  }, [rfInstance, lens, viewportRestoreReadyKey, teamTree, savedViewportDefaults, showBrandCoverageFormation]);

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
      fitVisiblePeopleRef.current({
        padding: getLensFitPadding(lens),
        duration: 350,
        minZoom: getLensFitMinZoom(lens, wrapperRef.current?.clientWidth),
        maxZoom: 1.15,
        reason: "lens",
      });
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
      activeTeamPositions ??
      (isGridLens(lens) && collapsedChannelGroups.size > 0
        ? calculateGridLayout(nodesData, collapsedChannelGroups)
        : lensLayout?.positions ?? {});
    const focusIds = filters?.focusIds ?? [];
    const hiddenIds = filters?.hiddenIds ?? [];
    const dimension = lensToDimension(lens);
    const isResidentialFormation = isResidentialFormationContext(viewContext);
    
    // Filter nodes based on focusIds or hiddenIds
    let filteredNodes = personNodes;
    if (isResidentialFormation) {
      filteredNodes = filteredNodes.filter((node) => residentialFormationSpec.peopleIds.has(node.id));
    }
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
    const showSharedServiceOverview =
      viewContext?.kind === "shared-services" && focusIds.length > 0 && !teamTree;

    const positions =
      isResidentialFormation
        ? residentialFormationSpec.positions
        : focusIds.length > 0 && !teamTree
        ? (() => {
            const scopedEdges = edgesData.filter(
              (edge) =>
                edge.metadata.type === "manager" &&
                focusIds.includes(edge.source) &&
                focusIds.includes(edge.target),
            );
            const operatingRootId =
              viewContext?.kind === "operating-view" && viewContext.rootId
                ? viewContext.rootId
                : undefined;
            if (operatingRootId && focusIds.includes(operatingRootId)) {
              return calculateTeamTreeLayout(filteredNodes, scopedEdges, operatingRootId);
            }
            if (dimension) {
              return calculateMatrixLayout(filteredNodes, edgesData, dimension);
            }
            const childIds = new Set(scopedEdges.map((edge) => edge.target));
            const roots = filteredNodes.filter((node) => !childIds.has(node.id));
            return roots.length === 1
              ? calculateTeamTreeLayout(filteredNodes, scopedEdges, roots[0].id)
              : calculateLayout(filteredNodes, scopedEdges);
          })()
        : basePositions;
    let displayPositions =
      viewContext?.kind === "operating-view" && operatingViewPositions
        ? { ...positions, ...operatingViewPositions }
        : positions;
    const shouldBloomFocusedTeam =
      Boolean(focusedNodeId) &&
      Boolean(dimension) &&
      !teamTree &&
      !isResidentialFormation &&
      viewContext?.kind !== "operating-view" &&
      viewContext?.kind !== "shared-services" &&
      (childMap[focusedNodeId ?? ""]?.length ?? 0) > 0;
    if (shouldBloomFocusedTeam && focusedNodeId) {
      const focusedSubtreeIds = new Set<string>([
        focusedNodeId,
        ...collectDescendants(childMap, [focusedNodeId]),
      ]);
      const focusedNodes = filteredNodes.filter((node) => focusedSubtreeIds.has(node.id));
      const rootPosition = positions[focusedNodeId];
      if (focusedNodes.length > 1 && rootPosition) {
        const focusedEdges = edgesData.filter(
          (edge) =>
            edge.metadata.type === "manager" &&
            focusedSubtreeIds.has(edge.source) &&
            focusedSubtreeIds.has(edge.target),
        );
        const focusedLayout = calculateTeamTreeLayout(focusedNodes, focusedEdges, focusedNodeId);
        const focusedRoot = focusedLayout[focusedNodeId];
        if (focusedRoot) {
          const offsetX = rootPosition.x - focusedRoot.x;
          const offsetY = rootPosition.y - focusedRoot.y;
          displayPositions = { ...displayPositions };
          Object.entries(focusedLayout).forEach(([nodeId, point]) => {
            displayPositions[nodeId] = {
              x: point.x + offsetX,
              y: point.y + offsetY,
            };
          });
        }
      }
    }

    if (showSharedServiceOverview) {
      const pods = groupSharedServicePods(filteredNodes);
      const columns = Math.max(2, Math.min(4, Math.ceil(Math.sqrt(pods.length))));
      return pods.map((pod, index) => {
        const col = index % columns;
        const row = Math.floor(index / columns);
        const displayLabel = pod.service === pod.label ? pod.label : `${pod.service}: ${pod.label}`;
        const data: SharedServiceGroupNodeData = {
          service: pod.service,
          label: pod.label,
          members: pod.members,
          lead: pod.lead,
          accentColor: "#7c3aed",
          homeLane: pod.service,
          targetLane: "all lanes",
          dimensionLabel: "service",
          onOpen: openSharedServiceGroup,
        };
        return {
          id: `shared-overview:${pod.id}`,
          type: "sharedServiceGroupNode",
          position: {
            x: col * (NODE_WIDTH + 96),
            y: row * (MIRROR_HEIGHT + 70),
          },
          data,
          draggable: false,
          focusable: false,
          selectable: false,
          zIndex: 4,
          ariaLabel: `${displayLabel} shared-service pod`,
        };
      });
    }

    if (showBrandCoverageFormation) {
      const layerNodes: Node[] = brandCoverageSpec.layers.map((layer) => {
        const data: FormationBandNodeData = {
          label: layer.label,
          color: layer.color,
          count: layer.count,
        };
        return {
          id: `${BRAND_COVERAGE_NODE_PREFIX}layer:${layer.id}`,
          type: "formationBandNode",
          position: layer.position,
          data,
          style: {
            width: layer.size.width,
            height: layer.size.height,
          },
          zIndex: -3,
          draggable: false,
          selectable: false,
          focusable: false,
        };
      });
      const podNodes: Node[] = brandCoverageSpec.pods.map((pod) => {
        const members = pod.memberIds.flatMap((memberId) => {
          const member = personById.get(memberId);
          return member ? [member] : [];
        });
        const isDedicated = pod.service === "iPort Dedicated" || pod.service === "James Dedicated";
        const isFoundation = pod.service === "Shared Services Foundation";
        const data: SharedServiceGroupNodeData = {
          service: pod.service,
          label: pod.label,
          members,
          lead: (pod.leadId ? personById.get(pod.leadId) : undefined) ?? members[0],
          accentColor: pod.accentColor,
          homeLane: pod.homeLane,
          targetLane: pod.targetLane,
          dimensionLabel: isFoundation ? "service" : "brand",
          badgeLabel: isDedicated
            ? "Dedicated brand team"
            : isFoundation
              ? "Shared foundation"
              : "Shared brand support",
          truthLabel: "Coverage group",
          onOpen: openSharedServiceGroup,
        };
        return {
          id: `${BRAND_COVERAGE_NODE_PREFIX}pod:${pod.id}`,
          type: "sharedServiceGroupNode",
          position: pod.position,
          data,
          draggable: false,
          selectable: false,
          focusable: false,
          zIndex: 4,
          ariaLabel: `${pod.label} ${data.badgeLabel}`,
        };
      });
      return [...layerNodes, ...podNodes];
    }

    // Roll up facilities / shared services into single cards in cross-cutting views,
    // removing their members from the brand/channel lanes. Skipped while focusing.
    const rollUp = isCrossCutting && focusIds.length === 0 && orgUnits.length > 0;
    if (rollUp) {
      filteredNodes = filteredNodes.filter(
        (node) =>
          !unitMemberIds.has(node.id) ||
          SENIOR_LEADERSHIP_CONTEXT_IDS.includes(node.id),
      );
    }
    const channelContextOnlyPersonIds = (() => {
      if (dimension !== "channel" || focusIds.length === 0) return new Set<string>();
      const ids = new Set<string>();
      if (viewContext?.rootId) ids.add(viewContext.rootId);
      const uniqueLabels = (values: Array<string | null | undefined>) =>
        Array.from(new Set(values.filter((value): value is string => Boolean(value))));
      const contextKeys = uniqueLabels([
        viewContext?.value,
        viewContext?.label,
        ...(filters?.activeTokens ?? []),
      ]);
      contextKeys.forEach((key) => {
        uniqueLabels([key, channelSubGroup(key), channelTopGroup(key)]).forEach((contextKey) => {
          (CHANNEL_CONTEXT_BY_KEY[contextKey] ?? []).forEach((id) => ids.add(id));
        });
      });
      return ids;
    })();

    const seniorPortfolioAreasByOwner = new Map<string, PortfolioArea[]>();
    if (lens === "hierarchy" && teamTree?.rootId === EXECUTIVE_ROOT_ID) {
      areaCardSpecs.forEach((area) => {
        if (!SENIOR_TEAM_AREA_CARD_IDS.has(area.id)) return;
        const anchorId = area.displayUnderId;
        if (!teamTree.ids.has(anchorId)) return;
        const lead = area.leadId ? personById.get(area.leadId) : undefined;
        const list = seniorPortfolioAreasByOwner.get(anchorId) ?? [];
        list.push({
          id: area.id,
          label: area.label,
          count: area.memberIds.length,
          kind: area.kind,
          leadName: lead?.name,
          accentColor: area.accentColor,
          onOpen: () => openAreaCard(area.id),
        });
        seniorPortfolioAreasByOwner.set(anchorId, list);
      });
    }

    const personFlowNodes: Node[] = filteredNodes
      .filter((node) => !channelContextOnlyPersonIds.has(node.id))
      .map((node) => {
      const position =
        displayPositions[node.id] ?? lastRenderedPositions.current[node.id] ?? { x: 0, y: 0 };
      lastRenderedPositions.current[node.id] = position;
      const accent = getAccentColor(node, lens);
      const unitForNode = lens === "hierarchy" ? unitAnchorMap.get(node.id) : undefined;
      const directReportCount = lens === "hierarchy" ? childMap[node.id]?.length ?? 0 : 0;
      const isNodeCollapsed = collapsedIds.includes(node.id);
      
      const data: HierarchyNodeData = {
        node,
        lens,
        accentColor: accent,
        emphasisLabel: getPrimaryLabel(node, lens),
        relationshipRole: relationshipRoleById.get(node.id),
        isSelected: selection.nodeIds.includes(node.id),
        highlightTokens: highlightTokens.get(node.id) ?? [],
        zoom: lodZoom, // Pass zoom for LOD rendering
        readOnly: !canEdit,
        reportCount: directReportCount,
        hiddenCount: descendantCounts[node.id] ?? 0,
        isCollapsed: isNodeCollapsed,
        onToggleCollapse: lens === "hierarchy" ? toggleCollapse : undefined,
        hideReportToggle: Boolean(teamTree),
        interactionKey: [
          lens,
          teamTree?.rootId ?? "full-org",
          canEdit ? "edit" : "explore",
          directReportCount,
          isNodeCollapsed ? "collapsed" : "expanded",
          relationshipRoleById.get(node.id)?.tone ?? "none",
        ].join(":"),
        // When this node is a facility / shared-service anchor, render it as a container
        unit: unitForNode,
        portfolioAreas: seniorPortfolioAreasByOwner.get(node.id),
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
          duplicate: (nodeId) => duplicateNodes([nodeId]),
          copy: (nodeId) => copyNodesById([nodeId]),
          delete: removeNode,
          lockToggle: toggleNodeLock,
          colorTag: addTagToNode,
          openEditor: (nodeId) => openEditor(nodeId),
          openOrg: (nodeId) => {
            if ((childMap[nodeId]?.length ?? 0) > 0) {
              const unitForOpenedNode = nodeId === node.id && isNodeCollapsed ? unitForNode : undefined;
              openTeamTree(
                nodeId,
                unitForOpenedNode
                  ? {
                      kind: "unit",
                      label: unitForOpenedNode.label,
                      count: (descendantCounts[nodeId] ?? 0) + 1,
                    }
                  : undefined,
              );
            } else {
              openEditor(nodeId);
            }
          },
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
          focusPersonFromCard(id, additive);
        },
      };
      
      const dimmed = focusSet ? !focusSet.has(node.id) : false;

      return {
        id: node.id,
        type: "hierarchyNode",
        position,
        data,
        draggable: canDragNodes && !node.locked,
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

    const framedAreaIds = new Set<string>();
    const areaFrameNodes: Node[] =
      lens === "hierarchy" &&
      teamTree &&
      teamTree.rootId !== EXECUTIVE_ROOT_ID &&
      !isResidentialFormation
        ? (() => {
            const frameAreas = areaCardSpecs
              .filter((area) => {
                const anchorId = area.rootId ?? area.ownerId;
                return Boolean(anchorId && teamTree.ids.has(anchorId));
              })
              .sort((a, b) => b.memberIds.length - a.memberIds.length);
            if (frameAreas.length === 0) return [];

            const nodes: Node[] = [];
            frameAreas.forEach((area) => {
              const isPrimary =
                area.rootId === teamTree.rootId || area.ownerId === teamTree.rootId;
              const framePersonIds = uniqueExistingIds(
                [area.rootId, area.ownerId, ...area.memberIds]
                  .filter((id): id is string => Boolean(id))
                  .filter((id) => teamTree.ids.has(id)),
                personById,
              ).filter((id) => displayPositions[id]);
              if (framePersonIds.length < 2) return;

              const xValues = framePersonIds.map((id) => displayPositions[id].x);
              const yValues = framePersonIds.map((id) => displayPositions[id].y);
              const minX = Math.min(...xValues);
              const minY = Math.min(...yValues);
              const maxX = Math.max(...xValues);
              const maxY = Math.max(...yValues);
              const marginX = isPrimary ? 66 : 42;
              const headerTop = isPrimary ? 58 : 44;
              const bottomPad = isPrimary ? 70 : 46;
              const width = Math.max(
                isPrimary ? 620 : 360,
                maxX - minX + NODE_WIDTH + marginX * 2,
              );
              const height = Math.max(
                isPrimary ? 260 : 180,
                maxY - minY + NODE_HEIGHT + headerTop + bottomPad,
              );
              const owner = area.ownerId ? personById.get(area.ownerId) : undefined;
              const data: AreaFrameNodeData = {
                label: area.label,
                ownerName: owner?.name,
                count: area.memberIds.length,
                kind: area.kind,
                detail: area.detail,
                accentColor: area.accentColor,
                nested: !isPrimary,
              };
              framedAreaIds.add(area.id);
              nodes.push({
                id: `area-frame:${area.id}`,
                type: "areaFrameNode",
                position: {
                  x: minX - marginX,
                  y: minY - headerTop,
                },
                data,
                draggable: false,
                selectable: false,
                focusable: false,
                style: { width, height, pointerEvents: "none" },
                zIndex: isPrimary ? -4 : -3,
                ariaLabel: `${area.label} area frame`,
              });
            });
            return nodes;
          })()
        : [];

    const areaFlowNodes: Node[] =
      lens === "hierarchy" && teamTree && !isResidentialFormation
        ? (() => {
            if (teamTree.rootId === EXECUTIVE_ROOT_ID) {
              return [];
            }
            const grouped = new Map<string, AreaCardSpec[]>();
            areaCardSpecs.forEach((area) => {
              if (framedAreaIds.has(area.id)) return;
              if (teamTree.rootId === EXECUTIVE_ROOT_ID && !SENIOR_TEAM_AREA_CARD_IDS.has(area.id)) {
                return;
              }
              const preferredAnchor =
                teamTree.rootId === EXECUTIVE_ROOT_ID
                  ? area.displayUnderId
                  : area.rootId && teamTree.ids.has(area.rootId)
                    ? area.rootId
                    : area.ownerId && teamTree.ids.has(area.ownerId)
                      ? area.ownerId
                      : null;
              if (!preferredAnchor) return;
              const shouldShow = teamTree.ids.has(preferredAnchor);
              const anchor = displayPositions[preferredAnchor];
              if (!shouldShow || !anchor) return;
              const list = grouped.get(preferredAnchor) ?? [];
              list.push(area);
              grouped.set(preferredAnchor, list);
            });

            const ownerFrameNodes: Node[] = [];
            const cardNodes: Node[] = [];
            grouped.forEach((areas, anchorId) => {
              const anchor = displayPositions[anchorId];
              if (!anchor) return;
              const columns =
                teamTree.rootId === EXECUTIVE_ROOT_ID
                  ? Math.min(
                      Math.max(1, SENIOR_AREA_CARD_COLUMNS_BY_ANCHOR[anchorId] ?? 1),
                      areas.length,
                    )
                  : Math.min(2, Math.max(1, areas.length));
              const rowWidth = columns * SENIOR_AREA_CARD_WIDTH + (columns - 1) * SENIOR_AREA_CARD_GAP_X;
              const childPositions =
                (childMap[anchorId] ?? [])
                  .map((childId) => displayPositions[childId])
                  .filter((position): position is { x: number; y: number } => Boolean(position));
              const cardPositions: Array<{ x: number; y: number }> = [];
              areas.forEach((area, index) => {
                const col = index % columns;
                const row = Math.floor(index / columns);
                const position =
                  activeTeamPositions?.[`${AREA_CARD_PREFIX}${area.id}`] ??
                  (teamTree.rootId === EXECUTIVE_ROOT_ID
                    ? getSeniorTeamAreaCardPosition({
                        areaId: area.id,
                        anchorId,
                        anchor,
                        childPositions,
                        index,
                        columns,
                      })
                    : {
                        x: anchor.x + NODE_WIDTH / 2 - rowWidth / 2 + col * (SENIOR_AREA_CARD_WIDTH + SENIOR_AREA_CARD_GAP_X),
                        y: anchor.y + NODE_HEIGHT + 54 + row * SENIOR_AREA_CARD_GAP_Y,
                      });
                cardPositions.push(position);
                const owner = area.ownerId ? personById.get(area.ownerId) : undefined;
                const lead = area.leadId ? personById.get(area.leadId) : undefined;
                const data: AreaCardNodeData = {
                  label: area.label,
                  ownerName: owner?.name,
                  leadName: lead?.name,
                  count: area.memberIds.length,
                  kind: area.kind,
                  detail: area.detail,
                  accentColor: area.accentColor,
                  onOpen: () => openAreaCard(area.id),
                };
                cardNodes.push({
                  id: `${AREA_CARD_PREFIX}${area.id}`,
                  type: "areaCardNode",
                  position,
                  data,
                  draggable: canDragNodes,
                  selectable: false,
                  focusable: false,
                  style: { width: SENIOR_AREA_CARD_WIDTH, pointerEvents: "all" },
                  zIndex: 6,
                  ariaLabel: `${area.label} area card`,
                });
              });
              if (
                teamTree.rootId === EXECUTIVE_ROOT_ID &&
                cardPositions.length > 0 &&
                SENIOR_PORTFOLIO_FRAME_ANCHOR_IDS.has(anchorId)
              ) {
                const owner = personById.get(anchorId);
                const ownerFirstName = owner?.name.split(/\s+/)[0] ?? "Leader";
                const accentColor = areas[0]?.accentColor ?? "#64748b";
                const minX = Math.min(...cardPositions.map((position) => position.x));
                const minY = Math.min(...cardPositions.map((position) => position.y));
                const maxX = Math.max(
                  ...cardPositions.map((position) => position.x + SENIOR_AREA_CARD_WIDTH),
                );
                const maxY = Math.max(
                  ...cardPositions.map((position) => position.y + SENIOR_AREA_CARD_HEIGHT),
                );
                const labels = areas.map((area) => area.label).join(", ");
                const frameData: AreaFrameNodeData = {
                  label: `${ownerFirstName} owns`,
                  ownerName: undefined,
                  count: areas.length,
                  kind: areas.length === 1 ? "Owned area" : "Owned areas",
                  detail: labels,
                  accentColor,
                  nested: true,
                };
                ownerFrameNodes.push({
                  id: `owner-frame:${anchorId}`,
                  type: "areaFrameNode",
                  position: {
                    x: minX - SENIOR_OWNER_FRAME_PAD_X,
                    y: minY - SENIOR_OWNER_FRAME_TOP_PAD,
                  },
                  data: frameData,
                  draggable: false,
                  selectable: false,
                  focusable: false,
                  style: {
                    width: maxX - minX + SENIOR_OWNER_FRAME_PAD_X * 2,
                    height:
                      maxY -
                      minY +
                      SENIOR_OWNER_FRAME_TOP_PAD +
                      SENIOR_OWNER_FRAME_BOTTOM_PAD,
                    pointerEvents: "none",
                  },
                  zIndex: -2,
                  ariaLabel: `${owner?.name ?? "Leader"} owned areas frame`,
                });
              }
            });
            return [...ownerFrameNodes, ...cardNodes];
          })()
        : [];

    // Brand × Channel grid: draw row bands (brands) and column bands (channels)
    if (isGridLens(lens)) {
      const frame = buildGridFrameNodes(personNodes, lodZoom, collapsedChannelGroups, toggleChannelGroup);
      return [...frame, ...personFlowNodes];
    }

    if (isResidentialFormation) {
      const layerNodes: Node[] = residentialFormationSpec.layers.map((layer) => {
        const data: FormationBandNodeData = {
          label: layer.label,
          color: layer.color,
          count: layer.count,
        };
        return {
          id: `${FORMATION_LAYER_PREFIX}${layer.id}`,
          type: "formationBandNode",
          position: layer.position,
          data,
          style: {
            width: layer.size.width,
            height: layer.size.height,
          },
          zIndex: -3,
          draggable: false,
          selectable: false,
          focusable: false,
        };
      });
      const podNodes: Node[] = residentialFormationSpec.pods.map((pod) => {
        const nodeId = `${FORMATION_POD_PREFIX}${pod.id}`;
        const members = pod.memberIds.flatMap((memberId) => {
          const member = personById.get(memberId);
          return member ? [member] : [];
        });
        const data: SharedServiceGroupNodeData = {
          service: pod.service,
          label: pod.label,
          members,
          lead: (pod.leadId ? personById.get(pod.leadId) : undefined) ?? members[0],
          accentColor: pod.accentColor,
          homeLane: pod.homeLane,
          targetLane: pod.targetLane,
          dimensionLabel: "home",
          badgeLabel: formationPodBadge(pod.tier),
          draggableSurface: true,
          onOpen: openSharedServiceGroup,
        };
        return {
          id: nodeId,
          type: "sharedServiceGroupNode",
          position: displayPositions[nodeId] ?? pod.position,
          data,
          draggable: canDragNodes,
          selectable: false,
          focusable: false,
          zIndex: pod.tier === "enterprise" || pod.tier === "facility" ? 2 : 3,
          ariaLabel: `${pod.label} ${formationPodBadge(pod.tier)} pod`,
        };
      });
      return [...layerNodes, ...personFlowNodes, ...podNodes];
    }

    // Matrix views: draw a labeled swim lane behind each brand/channel/department group
    const suppressLaneNodes = viewContext?.kind === "operating-view" && Boolean(viewContext.rootId);
    if (!dimension || suppressLaneNodes) {
      return [...areaFrameNodes, ...personFlowNodes, ...areaFlowNodes];
    }
    const laneNodes = buildLaneNodes(
      filteredNodes,
      edgesData,
      positions,
      dimension,
      mirrorLanes && focusIds.length === 0,
      openSharedServiceGroup,
      focusPersonFromCard,
      focusSet,
      lodZoom,
      channelContextOnlyPersonIds,
    );
    return [...laneNodes, ...areaFrameNodes, ...personFlowNodes, ...areaFlowNodes];
  }, [
    areaCardSpecs,
    mirrorLanes,
    focusedNodeId,
    focusSet,
    relationshipRoleById,
    brandCoverageSpec,
    residentialFormationSpec,
    personById,
    personNodes,
    teamTree,
    showBrandCoverageFormation,
    selection.nodeIds,
    lensLayout?.positions,
    lens,
    highlightTokens,
    lodZoom,
    addPerson,
    addRelationship,
    applyToPeople,
    canEdit,
    canDragNodes,
    copyPersonSettings,
    duplicateNodes,
    openSharedServiceGroup,
    openAreaCard,
    copyNodesById,
    removeNode,
    toggleNodeLock,
    addTagToNode,
    openEditor,
    openTeamTree,
    focusPersonFromCard,
    setSelection,
    isCrossCutting,
    orgUnits,
    unitMemberIds,
    unitAnchorMap,
    collapsedChannelGroups,
    toggleChannelGroup,
    nodesData,
    activeTeamPositions,
    operatingViewPositions,
    filters?.activeTokens,
    filters?.focusIds,
    filters?.hiddenIds,
    viewContext,
    edgesData,
    hiddenByCollapse,
    childMap,
    descendantCounts,
    collapsedIds,
    showToast,
    toggleCollapse,
  ]);

  // Local node state so React Flow position changes (dragging) render per
  // frame; re-synced from the store-derived nodes whenever those change
  const [rfNodes, setRfNodes] = useState<Node[]>(computedNodes);
  useEffect(() => {
    setRfNodes(computedNodes);
  }, [computedNodes]);

  const managerRouteLaneByEdgeId = useMemo(() => {
    type RouteSegment = {
      edgeId: string;
      sourceId: string;
      targetY: number;
      minX: number;
      maxX: number;
    };

    const lanes = new Map<string, number>();
    const personFlowNodes = computedNodes.filter((node) => isPersonFlowNodeId(node.id));
    const nodeById = new Map(personFlowNodes.map((node) => [node.id, node]));
    const positionById = new Map(personFlowNodes.map((node) => [node.id, node.position]));
    const visibleIds = new Set(personFlowNodes.map((node) => node.id));
    const segments: RouteSegment[] = [];

    edgesData.forEach((edge) => {
      if (edge.metadata.type !== "manager") return;
      if (isCuratedLeadershipReportEdge(edge)) return;
      if (!visibleIds.has(edge.source) || !visibleIds.has(edge.target)) return;

      const sourcePosition = positionById.get(edge.source);
      const targetPosition = positionById.get(edge.target);
      if (!sourcePosition || !targetPosition) return;

      const sourceX = sourcePosition.x + NODE_WIDTH / 2;
      const sourceY = sourcePosition.y + getFlowNodeRoutingHeight(nodeById.get(edge.source));
      const targetX = targetPosition.x + NODE_WIDTH / 2;
      const targetY = targetPosition.y;
      if (targetY <= sourceY) return;

      segments.push({
        edgeId: edge.id,
        sourceId: edge.source,
        targetY,
        minX: Math.min(sourceX, targetX),
        maxX: Math.max(sourceX, targetX),
      });
    });

    const rowKey = (value: number) => `${Math.round(value / 24)}`;
    const byRow = new Map<string, RouteSegment[]>();
    segments.forEach((segment) => {
      const key = rowKey(segment.targetY);
      const row = byRow.get(key) ?? [];
      row.push(segment);
      byRow.set(key, row);
    });

    const overlaps = (a: RouteSegment, b: RouteSegment) =>
      Math.max(a.minX, b.minX) <= Math.min(a.maxX, b.maxX) + 28;

    byRow.forEach((row) => {
      const laneSegments: RouteSegment[][] = [];
      row
        .sort((a, b) => a.minX - b.minX || a.maxX - b.maxX)
        .forEach((segment) => {
          let laneIndex = 0;
          while (
            laneSegments[laneIndex]?.some(
              (existing) =>
                existing.sourceId !== segment.sourceId && overlaps(existing, segment),
            )
          ) {
            laneIndex += 1;
          }
          const lane = laneSegments[laneIndex] ?? [];
          lane.push(segment);
          laneSegments[laneIndex] = lane;
          lanes.set(segment.edgeId, laneIndex);
        });
    });

    return lanes;
  }, [computedNodes, edgesData]);

  const managerRouteBusYByEdgeId = useMemo(() => {
    const buses = new Map<string, number>();
    const personFlowNodes = computedNodes.filter((node) => isPersonFlowNodeId(node.id));
    const nodeById = new Map(personFlowNodes.map((node) => [node.id, node]));
    const positionById = new Map(personFlowNodes.map((node) => [node.id, node.position]));
    const visibleIds = new Set(personFlowNodes.map((node) => node.id));
    const bySource = new Map<
      string,
      Array<{ edgeId: string; sourceBottom: number; targetTop: number }>
    >();

    edgesData.forEach((edge) => {
      if (edge.metadata.type !== "manager") return;
      if (!visibleIds.has(edge.source) || !visibleIds.has(edge.target)) return;
      const source = positionById.get(edge.source);
      const target = positionById.get(edge.target);
      if (!source || !target) return;
      const sourceBottom = source.y + getFlowNodeRoutingHeight(nodeById.get(edge.source));
      const targetTop = target.y;
      if (targetTop - sourceBottom <= 36) return;
      const rows = bySource.get(edge.source) ?? [];
      rows.push({ edgeId: edge.id, sourceBottom, targetTop });
      bySource.set(edge.source, rows);
    });

    bySource.forEach((segments) => {
      if (segments.length === 0) return;
      const sourceBottom = Math.max(...segments.map((segment) => segment.sourceBottom));
      const nearestTargetTop = Math.min(...segments.map((segment) => segment.targetTop));
      const gap = nearestTargetTop - sourceBottom;
      const busY = Math.min(
        nearestTargetTop - 30,
        sourceBottom + Math.max(44, Math.min(82, gap * 0.34)),
      );
      segments.forEach((segment) => buses.set(segment.edgeId, busY));
    });

    return buses;
  }, [computedNodes, edgesData]);

  const edgeTruthAuditById = useMemo(() => {
    const issues = new Map<string, TruthAuditIssue>();
    if (viewContext?.kind === "shared-services") return issues;

    const personFlowNodes = computedNodes.filter((node) => isPersonFlowNodeId(node.id));
    if (personFlowNodes.length < 3) return issues;

    const personById = new Map(personNodes.map((person) => [person.id, person]));
    const visibleIds = new Set(personFlowNodes.map((node) => node.id));
    const rects = personFlowNodes
      .map((node) => {
        const person = personById.get(node.id);
        if (!person) return null;
        return buildPersonCardRect(person, node.position);
      })
      .filter((rect): rect is PersonCardRect => Boolean(rect));
    const positionById = new Map(personFlowNodes.map((node) => [node.id, node.position]));

    edgesData.forEach((edge) => {
      if (edge.metadata.type !== "manager") return;
      if (!visibleIds.has(edge.source) || !visibleIds.has(edge.target)) return;

      if (lens === "department") {
        const source = personById.get(edge.source);
        const target = personById.get(edge.target);
        if (
          source &&
          target &&
          getGroupKey(source, "department") !== getGroupKey(target, "department")
        ) {
          return;
        }
      }
      if (lens === "matrix") {
        const source = personById.get(edge.source);
        const target = personById.get(edge.target);
        if (
          source &&
          target &&
          (getGroupKey(source, "brand") !== getGroupKey(target, "brand") ||
            getGroupKey(source, "channel") !== getGroupKey(target, "channel"))
        ) {
          return;
        }
      }

      const sourcePosition = positionById.get(edge.source);
      const targetPosition = positionById.get(edge.target);
      if (!sourcePosition || !targetPosition) return;

      const blockers = findManagerLineBlockers(
        sourcePosition,
        targetPosition,
        rects,
        edge.source,
        edge.target,
        managerRouteLaneByEdgeId.get(edge.id) ?? 0,
        managerRouteBusYByEdgeId.get(edge.id),
      );
      if (blockers.length === 0) return;

      const targetName = personNameById.get(edge.target) ?? "This person";
      const blockerNames = blockers.slice(0, 3).map((blocker) => blocker.name);
      const blockerLabel =
        blockerNames.length === 1
          ? blockerNames[0]
          : `${blockerNames.slice(0, 2).join(", ")}${blockers.length > 2 ? `, +${blockers.length - 2}` : ""}`;
      issues.set(edge.id, {
        level: blockers.length > 1 ? "danger" : "warning",
        message: `Could read as ${targetName} reporting to ${blockerLabel}`,
        blockerNames,
      });
    });

    return issues;
  }, [
    computedNodes,
    edgesData,
    managerRouteBusYByEdgeId,
    managerRouteLaneByEdgeId,
    personNameById,
    personNodes,
    lens,
    viewContext?.kind,
  ]);

  const truthAuditIssues = useMemo(
    () =>
      [...edgeTruthAuditById.entries()].map(([edgeId, issue]) => ({
        edgeId,
        ...issue,
      })),
    [edgeTruthAuditById],
  );

  const edges = useMemo<Edge[]>(() => {
    const activeTokens = filters?.activeTokens ?? [];
    const focusIds = filters?.focusIds ?? [];
    if (showBrandCoverageFormation) return [];
    if (viewContext?.kind === "shared-services") return [];
    const isResidentialFormationView =
      viewContext?.kind === "operating-view" &&
      (viewContext.formation === "residential" || viewContext.value === RESIDENTIAL_FORMATION_VALUE);

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
    const personFlowNodesForEdges = computedNodes.filter((node) => isPersonFlowNodeId(node.id));
    const nodeById = new Map(personFlowNodesForEdges.map((node) => [node.id, node]));
    const positionByNodeId = new Map(
      personFlowNodesForEdges.map((node) => [node.id, node.position] as const),
    );
    const departmentObstacleRects =
      lens === "department"
        ? [...positionByNodeId.entries()].map(([id, position]) => ({
            id,
            x: position.x,
            y: position.y,
            width: NODE_WIDTH,
            height: getFlowNodeRoutingHeight(nodeById.get(id)),
          }))
        : [];
    const seniorAreaCardObstacleRects =
      teamTree?.rootId === EXECUTIVE_ROOT_ID
        ? computedNodes
            .filter((node) => isAreaCardNodeId(node.id))
            .map((node) => ({
              id: node.id,
              x: node.position.x,
              y: node.position.y,
              width: SENIOR_AREA_CARD_WIDTH,
              height: SENIOR_AREA_CARD_HEIGHT,
            }))
        : [];
    const formationObstacleRects = isResidentialFormationView
      ? computedNodes
          .filter((node) => isPersonFlowNodeId(node.id) || isFormationPodNodeId(node.id))
          .map((node) => ({
            id: node.id,
            x: node.position.x,
            y: node.position.y,
            width: isFormationPodNodeId(node.id) ? FORMATION_POD_WIDTH : NODE_WIDTH,
            height: isFormationPodNodeId(node.id)
              ? FORMATION_POD_HEIGHT
              : getFlowNodeRoutingHeight(nodeById.get(node.id)),
          }))
      : [];
    const dimension = lensToDimension(lens);
    const contextRectByPersonAndLane = new Map<
      string,
      { x: number; y: number; width: number; height: number }
    >();
    if (dimension) {
      const contextPrefix = `context:${dimension}:`;
      computedNodes.forEach((node) => {
        if (!node.id.startsWith(contextPrefix)) return;
        const rest = node.id.slice(contextPrefix.length);
        const personIdMarker = ":person-";
        const markerIndex = rest.lastIndexOf(personIdMarker);
        if (markerIndex < 0) return;
        const laneKey = rest.slice(0, markerIndex);
        const personId = rest.slice(markerIndex + 1);
        contextRectByPersonAndLane.set(`${personId}|||${laneKey}`, {
          x: node.position.x,
          y: node.position.y,
          width: NODE_WIDTH,
          height: CONTEXT_CARD_HEIGHT,
        });
      });
    }
    return visibleEdges.flatMap((edge) => {
      const marker = markerByType[edge.metadata.type] ?? markerByType.manager;
      const color = RELATIONSHIP_COLORS[edge.metadata.type] ?? "#94a3b8";
      const isGhost =
        activeTokens.length > 0 &&
        !doesEdgeMatchTokens(edge, personNodes, activeTokens, lens);
      
      const definition = getRelationshipDefinition(edge.metadata.type);
      const edgeType = definition.edgeStyle;
      
      // In matrix views support-truth relationships are the story, so fade
      // the within-lane reporting lines and let cross-lane links stand out.
      const isRootedOperatingView = viewContext?.kind === "operating-view" && Boolean(viewContext.rootId);
      const isMatrixView = lens !== "hierarchy" && !isRootedOperatingView;
      const isManager = edge.metadata.type === "manager";
      const isCuratedLeadershipReport = isCuratedLeadershipReportEdge(edge);
      const isMatrixRelationship = isSupportRelationship(edge.metadata.type);
      const hasTruthIssue = edgeTruthAuditById.has(edge.id);
      const sourceNode = personById.get(edge.source);
      const targetNode = personById.get(edge.target);

      // Focus mode: spotlight the selected person's relationships and the manager
      // chain they sit in (both endpoints in the focus set), fade everything else.
      const isIncidentToFocus =
        !!focusSet && focusSet.has(edge.source) && focusSet.has(edge.target);
      const isDepartmentCrossReporting =
        dimension === "department" &&
        isMatrixView &&
        isManager &&
        !isCuratedLeadershipReport &&
        sourceNode &&
        targetNode &&
        getGroupKey(sourceNode, "department") !== getGroupKey(targetNode, "department");
      const isBusinessGridCrossReporting =
        lens === "matrix" &&
        isMatrixView &&
        isManager &&
        !isCuratedLeadershipReport &&
        sourceNode &&
        targetNode &&
        (getGroupKey(sourceNode, "brand") !== getGroupKey(targetNode, "brand") ||
          getGroupKey(sourceNode, "channel") !== getGroupKey(targetNode, "channel"));
      if (
        (isDepartmentCrossReporting || isBusinessGridCrossReporting) &&
        matrixRelationshipMode !== "all" &&
        !isIncidentToFocus
      ) {
        return [];
      }
      const isDirectFocusedManagerEdge =
        isManager &&
        !!focusedNodeId &&
        (edge.source === focusedNodeId || edge.target === focusedNodeId);
      const focusedDirectReportCount = focusedNodeId ? childMap[focusedNodeId]?.length ?? 0 : 0;
      const shouldLabelFocusedEdge =
        !teamTree &&
        isDirectFocusedManagerEdge &&
        lodZoom > 0.48 &&
        (edge.target === focusedNodeId || focusedDirectReportCount <= 4);
      if (isMatrixView && !(truthAuditVisible && hasTruthIssue)) {
        if (matrixRelationshipMode === "reporting" && !isManager) {
          return [];
        }
        if (
          matrixRelationshipMode === "matrix" &&
          !isMatrixRelationship &&
          !isManager &&
          (!focusSet || !isIncidentToFocus)
        ) {
          return [];
        }
      }

      const dimmedManager =
        isMatrixView &&
        isManager &&
        matrixRelationshipMode === "matrix" &&
        !isIncidentToFocus;
      let opacity = isGhost || edge.metadata.ghost ? 0.3 : dimmedManager ? 0.22 : 0.9;
      if (
        isMatrixView &&
        matrixRelationshipMode === "reporting" &&
        isManager &&
        !isGhost &&
        !edge.metadata.ghost
      ) {
        opacity = 0.88;
      }
      if (isMatrixView && matrixRelationshipMode === "matrix" && isMatrixRelationship) {
        opacity = isGhost || edge.metadata.ghost ? 0.38 : 0.92;
      }
      if (truthAuditVisible && hasTruthIssue) {
        opacity = 0.96;
      }
      if (focusedNodeId) {
        opacity = isIncidentToFocus ? 0.95 : 0.05;
        if (truthAuditVisible && hasTruthIssue) {
          opacity = 0.96;
        }
        if (isMatrixView && matrixRelationshipMode === "matrix" && isMatrixRelationship) {
          opacity = isIncidentToFocus || !focusSet ? 0.95 : 0.28;
        }
      }

      const sourceName = personNameById.get(edge.source) ?? "Manager";
      const targetName = personNameById.get(edge.target) ?? "Report";
      const sourcePosition = positionByNodeId.get(edge.source);
      const targetPosition = positionByNodeId.get(edge.target);
      const sourceContextRect =
        isManager && dimension && targetNode
          ? contextRectByPersonAndLane.get(
              `${edge.source}|||${getGroupKey(targetNode, dimension)}`,
            )
          : undefined;
      const sourceRect = sourceContextRect ??
        (sourcePosition
          ? {
              x: sourcePosition.x,
              y: sourcePosition.y,
              width: NODE_WIDTH,
              height: getFlowNodeRoutingHeight(nodeById.get(edge.source)),
            }
          : undefined);
      const targetRect = targetPosition
        ? {
            x: targetPosition.x,
            y: targetPosition.y,
            width: NODE_WIDTH,
            height: getFlowNodeRoutingHeight(nodeById.get(edge.target)),
          }
        : undefined;
      const avoidRects =
        isManager
          ? [
              ...(lens === "department"
                ? departmentObstacleRects.filter(
                    (rect) => rect.id !== edge.source && rect.id !== edge.target,
                  )
                : []),
              ...seniorAreaCardObstacleRects,
              ...formationObstacleRects.filter(
                (rect) => rect.id !== edge.source && rect.id !== edge.target,
              ),
            ]
          : undefined;
      const edgeStroke = isCuratedLeadershipReport ? "#94a3b8" : color;
      const edgeOpacity = isCuratedLeadershipReport
        ? Math.min(opacity, focusedNodeId && !isIncidentToFocus ? 0.12 : 0.5)
        : opacity;

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: isManager ? `${edge.source}-manager-source` : undefined,
        targetHandle: isCuratedLeadershipReport
          ? `${edge.target}-manager-peer-target`
          : isManager
            ? `${edge.target}-manager-target`
            : undefined,
        type: edgeType,
        data: {
          ...edge,
          relationshipLabel: isCuratedLeadershipReport
            ? undefined
            : relationshipLabel(edge.metadata.type, sourceName, targetName, edge.metadata.label),
          showLabel: isCuratedLeadershipReport ? false : shouldLabelFocusedEdge,
          routeLane: managerRouteLaneByEdgeId.get(edge.id) ?? 0,
          routeBusY: sourceContextRect ? undefined : managerRouteBusYByEdgeId.get(edge.id),
          sourceRect,
          targetRect,
          avoidRects,
          visualTreatment: isCuratedLeadershipReport ? "curated-peer-report" : undefined,
          truthIssue: edgeTruthAuditById.get(edge.id),
          showTruthIssue: truthAuditVisible,
        },
        animated: definition.edgeStyle === "dotted" && lodZoom > 0.5,
        markerEnd: definition.edgeStyle === "support" || isCuratedLeadershipReport
          ? undefined
          : {
              type: MarkerType.ArrowClosed,
              width: marker.width,
              height: marker.height,
              color: edgeStroke,
            },
        style: {
          ...baseEdgeStyle,
          stroke: edgeStroke,
          opacity: edgeOpacity,
          strokeWidth: isCuratedLeadershipReport ? (isIncidentToFocus ? 2 : 1.35) : isIncidentToFocus ? 3.5 : baseEdgeStyle.strokeWidth,
        },
        selectable: true,
        selected: selection.edgeIds.includes(edge.id),
        zIndex: truthAuditVisible && hasTruthIssue ? 12 : isIncidentToFocus ? 10 : 0,
      };
    });
  }, [
    edgesData,
    edgeTruthAuditById,
    managerRouteLaneByEdgeId,
    managerRouteBusYByEdgeId,
    computedNodes,
    filters?.activeTokens,
    personNodes,
    personById,
    personNameById,
    teamTree,
    lens,
    selection.edgeIds,
    lodZoom,
    focusedNodeId,
    focusSet,
    childMap,
    matrixRelationshipMode,
    viewContext?.kind,
    viewContext?.formation,
    viewContext?.rootId,
    viewContext?.value,
    hiddenByCollapse,
    isCrossCutting,
    orgUnits,
    unitMemberIds,
    filters?.focusIds,
    truthAuditVisible,
    showBrandCoverageFormation,
  ]);

  // Handle node drag stop - persist positions (the whole dragged selection),
  // and in matrix views reassign each person to the lane they were dropped into
  const handleNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node, draggedNodes: Node[]) => {
      const moved = draggedNodes?.length ? draggedNodes : [node];
      if (teamTree) {
        setTeamLayoutDraft((current) => {
          const positions =
            current?.rootId === teamTree.rootId
              ? { ...current.positions }
              : { ...(savedTeamLayouts[teamTree.rootId] ?? {}) };
          moved.forEach((item) => {
            if (teamTree.ids.has(item.id) || isAreaCardNodeId(item.id)) {
              positions[item.id] = item.position;
            }
          });
          return { rootId: teamTree.rootId, positions, dirty: true };
        });
        return;
      }

      if (activeOperatingViewId && viewContext?.kind === "operating-view") {
        const focusIds = new Set(filters?.focusIds ?? []);
        const existing = operatingViewLayouts[activeOperatingViewId] ?? {};
        const draft = { ...(existing.draft ?? existing.published ?? {}) };
        const draftViewport =
          operatingViewFrameDraft ??
          existing.draftViewport ??
          existing.publishedViewport ??
          (rfInstance ? normalizeViewport(rfInstance.getViewport()) : undefined);
        moved.forEach((item) => {
          if (focusIds.has(item.id) || (isResidentialFormationContext(viewContext) && isFormationPodNodeId(item.id))) {
            draft[item.id] = item.position;
          }
        });
        const next = {
          ...operatingViewLayouts,
          [activeOperatingViewId]: {
            ...existing,
            draft,
            draftViewport,
            draftUpdatedAt: new Date().toISOString(),
            approvalStatus: "draft" as const,
            pendingReason: undefined,
          },
        };
        setOperatingViewLayouts(next);
        persistOperatingViewLayouts(next);
        void queueRemoteOperatingViewLayout(activeOperatingViewId, {
          mode: "draft",
          label: viewContext.label,
          owner: viewContext.owner,
          actor: viewContext.owner ?? viewContext.publishedBy ?? "View owner",
          reason: "Moved cards on canvas",
          layout: draft,
          viewport: draftViewport,
        }).catch(() => {
          /* The in-browser draft remains the source of truth until Supabase is reachable again. */
        });
        return;
      }

      if (!canEdit) return;

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
    [
      activeOperatingViewId,
      canEdit,
      filters?.focusIds,
      operatingViewLayouts,
      operatingViewFrameDraft,
      persistOperatingViewLayouts,
      queueRemoteOperatingViewLayout,
      rfInstance,
      teamTree,
      savedTeamLayouts,
      updateNodePosition,
      laneXRanges,
      personNodes,
      reassignToLane,
      showToast,
      viewContext,
    ],
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
      if (!canEdit) {
        showToast("Switch to Edit mode to change reporting lines.");
        return;
      }
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
    [addRelationship, canEdit, childMap, setSelection, showToast],
  );

  const handleEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      if (!canEdit) {
        showToast("Switch to Edit mode to remove relationships.");
        return;
      }
      deleted.forEach((edge) => removeRelationship(edge.id));
    },
    [canEdit, removeRelationship, showToast],
  );

  const handleNodesDelete = useCallback(
    (deleted: Node[]) => {
      if (!canEdit) {
        showToast("Switch to Edit mode to remove people.");
        return;
      }
      const people = deleted.filter((node) => node.id.startsWith("person-"));
      deleted.forEach((node) => removeNode(node.id));
      if (people.length === 1) {
        const person = personNodes.find((n) => n.id === people[0].id);
        showToast(`Deleted ${person?.name ?? "1 person"}`);
      } else if (people.length > 1) {
        showToast(`Deleted ${people.length} people`);
      }
    },
    [canEdit, removeNode, personNodes, showToast],
  );

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
      event.stopPropagation();
      if (!isPersonFlowNodeId(node.id)) return;
      if ((childMap[node.id]?.length ?? 0) > 0) {
        openTeamTree(node.id);
        return;
      }
      openEditor(node.id);
    },
    [childMap, openEditor, openTeamTree],
  );

  const handleEdgeContextMenu = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.preventDefault();
    if (!canEdit) {
      showToast("Switch to Edit mode to change relationships.");
      return;
    }
    selectEdge(edge.id);
    setEdgeMenu({ edge, position: { x: event.clientX, y: event.clientY } });
  }, [canEdit, selectEdge, showToast]);

  const handleEdgeMenuAction = useCallback(
    (action: RelationshipType | "delete") => {
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
      if (orientationLoopTimerRef.current) clearTimeout(orientationLoopTimerRef.current);
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
        if (canEdit && selection.nodeIds.length) {
          duplicateNodes(selection.nodeIds);
        } else if (!canEdit) {
          showToast("Switch to Edit mode to duplicate people.");
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
        if (!canEdit) {
          showToast("Switch to Edit mode to add people.");
          return;
        }
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
        if (!canEdit) {
          showToast("Switch to Edit mode to add reports.");
          return;
        }
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
        if (!canEdit) {
          showToast("Switch to Edit mode to add managers.");
          return;
        }
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
      canEdit,
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
      showToast,
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
            edgeReveal ? "lens-edge-reveal" : "",
            className ?? "",
          ].join(" ")}
          style={style}
          onContextMenu={handlePaneContextMenu}
        >
          {(lensTransition || edgeReveal) && personNodes.length > 0 && (
            <div className="motion-view-cue pointer-events-none absolute left-1/2 top-16 z-40 flex items-center gap-2 rounded-full border border-white/80 bg-white/95 px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xl ring-1 ring-slate-200/80 backdrop-blur dark:border-white/10 dark:bg-slate-950/90 dark:text-slate-100 dark:ring-white/10">
              <span
                className="h-2.5 w-2.5 rounded-full shadow-sm"
                style={{ background: lensMotionCue.color }}
                aria-hidden
              />
              <span className="text-slate-900 dark:text-white">{lensMotionCue.title}</span>
              <span className="h-3.5 w-px bg-slate-200 dark:bg-white/10" />
              <span className="text-slate-500 dark:text-slate-300">{lensMotionCue.detail}</span>
            </div>
          )}
          <CanvasOrientationMap
            title={orientationMap.title}
            detail={orientationMap.detail}
            stats={orientationMap.stats}
            chips={orientationMap.chips}
            actions={orientationMap.actions}
            hidden={orientationMap.hidden || lensTransition || edgeReveal}
          />
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
                if (!isBlankViewport) {
                  setCurrentViewport(viewport);
                  if (
                    activeOperatingViewId &&
                    viewContext?.kind === "operating-view" &&
                    canEdit &&
                    !cameraBusyRef.current &&
                    !isRestoringViewport.current
                  ) {
                    const normalized = normalizeViewport(viewport);
                    if (!sameViewport(normalized, activeOperatingViewViewport)) {
                      setOperatingViewFrameDraft(normalized);
                    }
                  }
                }
                viewportSettleTimerRef.current = null;
              }, 80);
            }}
            nodesDraggable={canDragNodes}
            nodesConnectable={canEdit}
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
            {!isGridLens(lens) &&
              lens !== "brand" &&
              lens !== "channel" &&
              viewContext?.kind !== "shared-services" &&
              teamTree?.rootId !== EXECUTIVE_ROOT_ID &&
              !isResidentialFormationContext(viewContext) && (
                <MiniMap
                  className="!bottom-6 !right-6 rounded-2xl border border-slate-200 bg-white/90 text-slate-600 shadow-sm dark:border-white/10 dark:bg-slate-900/80"
                  nodeStrokeColor={(n) => (n.data?.accentColor as string) ?? "#64748b"}
                  nodeColor={(n) => (n.data?.accentColor as string) ?? "#cbd5f5"}
                  maskColor="rgba(15, 23, 42, 0.08)"
                  pannable
                  zoomable
                />
              )}
            {/* Matrix-lens controls: keep reporting lines intentional instead of
                drawing an ambiguous all-org web across unrelated lanes. */}
            {lens !== "hierarchy" && personNodes.length > 0 && (
              <MatrixRelationshipControls
                mode={matrixRelationshipMode}
                onModeChange={setMatrixRelationshipMode}
                mirrorLanes={mirrorLanes}
                onToggleMirrorLanes={toggleMirrorLanes}
              />
            )}
            {/* Hierarchy view: global fold control so the whole org can collapse to
                its top tiers or expand back out in one click */}
            {lens === "hierarchy" && personNodes.length > 0 && (
              <div className="motion-stage-in absolute left-6 top-6 z-30 flex items-center gap-0.5 rounded-full border border-slate-200 bg-white/95 p-1 text-xs font-semibold text-slate-600 shadow-sm ring-1 ring-slate-100 backdrop-blur dark:border-white/10 dark:bg-white/90 dark:text-slate-700 dark:ring-slate-200">
                <button
                  type="button"
                  onClick={() => addCollapsed(collapseTargets.top)}
                  title="Fold every team down to the top levels"
                  aria-label="Collapse all teams to the top levels"
                  className="rounded-full px-3 py-1 transition hover:bg-slate-100 dark:hover:bg-slate-100"
                >
                  Collapse all
                </button>
                <span className="h-4 w-px bg-slate-200 dark:bg-slate-300" />
                <button
                  type="button"
                  onClick={() => expandAll()}
                  disabled={collapsedIds.length === 0}
                  title="Show every report"
                  aria-label="Expand all teams to show every report"
                  className="rounded-full px-3 py-1 transition hover:bg-slate-100 disabled:cursor-default disabled:opacity-40 dark:hover:bg-slate-100"
                >
                  Expand all
                </button>
              </div>
            )}
            {/* Unified top-right tools dock: one labeled home for the canvas
                actions instead of buttons scattered around every corner */}
            {personNodes.length > 0 && (
              <CanvasToolsMenu
                healthOpen={healthOpen}
                truthAuditVisible={truthAuditVisible}
                truthAuditCount={truthAuditIssues.length}
                onOpenHelp={() => setHelpOpen(true)}
                onToggleHealth={() => setHealthOpen((value) => !value)}
                onToggleTruthAudit={() => setTruthAuditVisible((value) => !value)}
                onOpenSharedServices={openSharedServicesDefault}
                onCleanup={(mode) => {
                  cleanupCanvas(lens, mode);
                  setTimeout(() => {
                    fitVisiblePeopleRef.current({ padding: 0.2, duration: 400, maxZoom: 1.5, reason: "fit" });
                  }, 100);
                }}
              />
            )}
            {truthAuditVisible && truthAuditIssues.length > 0 && (
              <div className="motion-stage-in absolute right-6 top-[78px] z-30 w-[min(360px,calc(100%-3rem))] rounded-lg border border-amber-200 bg-white/95 p-3 text-xs text-slate-700 shadow-lg ring-1 ring-amber-100 backdrop-blur dark:border-amber-300/30 dark:bg-slate-950/90 dark:text-slate-200 dark:ring-amber-300/10">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold text-slate-950 dark:text-white">
                    {truthAuditIssues.length} risky reporting {truthAuditIssues.length === 1 ? "line" : "lines"}
                  </div>
                  <button
                    type="button"
                    onClick={() => setTruthAuditVisible(false)}
                    className="rounded-full px-2 py-1 text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
                    aria-label="Hide truth audit"
                  >
                    Hide
                  </button>
                </div>
                <div className="mt-2 space-y-1.5">
                  {truthAuditIssues.slice(0, 4).map((issue) => (
                    <div
                      key={issue.edgeId}
                      className="rounded-md bg-amber-50/80 px-2.5 py-2 leading-snug text-amber-950 ring-1 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-100 dark:ring-amber-300/10"
                    >
                      {issue.message}
                    </div>
                  ))}
                </div>
                {truthAuditIssues.length > 4 && (
                  <div className="mt-2 text-[11px] font-semibold text-amber-700 dark:text-amber-200">
                    +{truthAuditIssues.length - 4} more highlighted on the canvas
                  </div>
                )}
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
              onOpenSharedServices={openSharedServicesDefault}
            />
          )}

          {/* Grid lens: shared services & facilities as the foundation beneath the matrix */}
          {showUnitFoundation && (
            <UnitFoundation
              units={orgUnits}
              onJump={jumpToUnit}
              onOpenSharedServices={openSharedServicesDefault}
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
                  onClick={() => showOrientationOverview()}
                  className="rounded-full bg-slate-900 px-3 py-1 text-white shadow-sm transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  Show overview
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
                {toast.undoable !== false && (
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
                )}
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
          {canEdit && selection.nodeIds.length > 1 && (
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
              teamLayoutControls={
                teamRootId
                  ? {
                      dirty: teamLayoutDirty,
                      saved: teamLayoutSaved,
                      onSave: saveTeamViewLayout,
                      onReset: resetTeamViewLayout,
                    }
                  : undefined
              }
              officialLayoutControls={
                viewContext?.kind === "operating-view"
                  ? {
                      dirty: operatingViewLayoutDirty,
                      saved: operatingViewLayoutSaved,
                      canManage: workspaceMode !== "explore",
                      publishedAt: activeOperatingViewLayout?.publishedAt ?? viewContext.publishedAt,
                      publishedBy: activeOperatingViewLayout?.publishedBy ?? viewContext.publishedBy,
                      approvalStatus: activeOperatingViewLayout?.approvalStatus,
                      pendingReason: activeOperatingViewLayout?.pendingReason,
                      dirtyLabel:
                        activeOperatingViewLayout?.approvalStatus === "pending_approval"
                          ? "Submitted draft"
                          : activeOperatingViewLayout?.approvalStatus === "rejected"
                            ? "Revision draft"
                            : "Arrangement draft",
                      savedLabel: "Published arrangement",
                      saveLabel: workspaceMode === "publish" ? "Approve & publish" : "Submit for approval",
                      onPublish: publishOperatingViewLayout,
                      onDiscard: discardOperatingViewDraft,
                      onReset: resetOperatingViewLayout,
                    }
                  : undefined
              }
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
        canEdit={canEdit}
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
        onZoomFit={() => fitVisiblePeopleRef.current({ padding: 0.25, duration: 300, reason: "fit" })}
        onToggleGrid={() => toggleGrid(lens)}
        onToggleSnap={() => toggleSnap(lens)}
      />
    </ContextMenu.Root>
  );
}

const CanvasContextMenu = ({
  open,
  lens,
  canEdit,
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
  canEdit: boolean;
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
        {canEdit ? (
          <>
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
          </>
        ) : (
          <>
            <ContextMenu.Label className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Explore mode protects this map
            </ContextMenu.Label>
            <MenuSeparator />
          </>
        )}
        <MenuItem onSelect={onSelectAll}>Select all</MenuItem>
        <MenuItem onSelect={onDeselect}>Deselect</MenuItem>
        <MenuItem onSelect={onZoomFit}>Zoom to fit</MenuItem>
        {canEdit && (
          <>
            <MenuSeparator />
            <MenuItem onSelect={onToggleGrid}>Toggle grid</MenuItem>
            <MenuItem onSelect={onToggleSnap}>Toggle snap-to-grid</MenuItem>
          </>
        )}
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
  onAction: (action: RelationshipType | "delete") => void;
}) => {
  if (!edgeMenu?.edge) return null;
  const relationshipOptions: Array<{ type: RelationshipType; label: string }> = [
    { type: "manager", label: "Convert to Reports to" },
    { type: "dedicated", label: "Convert to Dedicated to" },
    { type: "support", label: "Convert to Supports" },
    { type: "shared-service", label: "Convert to Shared service" },
    { type: "dotted", label: "Convert to Dotted line" },
  ];
  
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
          {relationshipOptions.map((option) => (
            <button
              key={option.type}
              onClick={() => {
                onAction(option.type);
                onClose();
              }}
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100 focus:outline-none dark:text-slate-200 dark:hover:bg-white/10"
            >
              {option.label}
            </button>
          ))}
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

const MATRIX_RELATIONSHIP_OPTIONS: Array<{
  mode: MatrixRelationshipMode;
  label: string;
  detail: string;
}> = [
  {
    mode: "reporting",
    label: "Reporting",
    detail: "Manager chain and selected-person context",
  },
  {
    mode: "matrix",
    label: "Support",
    detail: "Dedicated, shared-service, and dotted-line context",
  },
  {
    mode: "all",
    label: "All",
    detail: "Every visible relationship in this view",
  },
];

const MatrixRelationshipControls = ({
  mode,
  onModeChange,
  mirrorLanes,
  onToggleMirrorLanes,
}: {
  mode: MatrixRelationshipMode;
  onModeChange: (mode: MatrixRelationshipMode) => void;
  mirrorLanes: boolean;
  onToggleMirrorLanes: () => void;
}) => {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="motion-stage-in absolute left-6 top-6 z-30 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-700 shadow-sm ring-1 ring-slate-100 backdrop-blur transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-200 dark:ring-white/10"
          title="Relationship lines and lane display"
          aria-label="Relationship lines and lane display"
        >
          <MixerHorizontalIcon className="h-3.5 w-3.5" aria-hidden />
          {mirrorLanes && (
            <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-sky-500 ring-2 ring-white dark:ring-slate-900" />
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="z-50 w-72 rounded-2xl border border-slate-200 bg-white/95 p-2 text-xs text-slate-700 shadow-2xl ring-1 ring-slate-100 backdrop-blur dark:border-white/10 dark:bg-slate-900/95 dark:text-slate-200 dark:ring-white/10"
          sideOffset={10}
          side="bottom"
          align="start"
        >
          <div className="grid gap-1">
            {MATRIX_RELATIONSHIP_OPTIONS.map((option) => (
              <button
                key={option.mode}
                type="button"
                onClick={() => onModeChange(option.mode)}
                aria-pressed={mode === option.mode}
                className={[
                  "rounded-xl px-3 py-2 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300",
                  mode === option.mode
                    ? "bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950"
                    : "hover:bg-slate-100 dark:hover:bg-white/10",
                ].join(" ")}
              >
                <span className="block font-semibold">{option.label}</span>
                <span
                  className={[
                    "mt-0.5 block text-[11px]",
                    mode === option.mode ? "text-white/70 dark:text-slate-600" : "text-slate-500 dark:text-slate-400",
                  ].join(" ")}
                >
                  {option.detail}
                </span>
              </button>
            ))}
          </div>
          <div className="my-2 h-px bg-slate-200 dark:bg-white/10" />
          <button
            type="button"
            onClick={onToggleMirrorLanes}
            aria-pressed={mirrorLanes}
            className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 font-semibold transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 dark:hover:bg-white/10"
          >
            <span>All assigned lanes</span>
            <span
              className={[
                "rounded-full px-2 py-0.5 text-[10px] font-bold",
                mirrorLanes
                  ? "bg-sky-50 text-sky-800 ring-1 ring-sky-100"
                  : "bg-slate-100 text-slate-500 ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-300 dark:ring-white/10",
              ].join(" ")}
            >
              {mirrorLanes ? "On" : "Off"}
            </span>
          </button>
          <Popover.Arrow className="fill-white dark:fill-slate-900" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

const CanvasToolsMenu = ({
  healthOpen,
  truthAuditVisible,
  truthAuditCount,
  onOpenHelp,
  onToggleHealth,
  onToggleTruthAudit,
  onOpenSharedServices,
  onCleanup,
}: {
  healthOpen: boolean;
  truthAuditVisible: boolean;
  truthAuditCount: number;
  onOpenHelp: () => void;
  onToggleHealth: () => void;
  onToggleTruthAudit: () => void;
  onOpenSharedServices: () => void;
  onCleanup: (mode: "compact" | "spacious") => void;
}) => {
  const [open, setOpen] = useState(false);

  const runAndClose = (action: () => void) => {
    action();
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="motion-stage-in absolute right-6 top-6 z-30 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-700 shadow-sm ring-1 ring-slate-100 backdrop-blur transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-200 dark:ring-white/10"
          title="Canvas tools"
          aria-label="Canvas tools"
        >
          <MixerHorizontalIcon className="h-3.5 w-3.5" aria-hidden />
          {(healthOpen || truthAuditVisible || truthAuditCount > 0) && (
            <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
          )}
        </button>
      </Popover.Trigger>
      
      <Popover.Portal>
        <Popover.Content
          className="z-50 w-72 rounded-2xl border border-slate-200 bg-white/95 p-2 text-xs text-slate-700 shadow-2xl ring-1 ring-slate-100 backdrop-blur dark:border-white/10 dark:bg-slate-900/95 dark:text-slate-200 dark:ring-white/10"
          sideOffset={10}
          side="bottom"
          align="end"
        >
          <div className="grid gap-1">
            <button
              type="button"
              onClick={() => runAndClose(onOpenHelp)}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-left font-semibold transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 dark:hover:bg-white/10"
            >
              <QuestionMarkCircledIcon className="h-3.5 w-3.5" aria-hidden />
              Help
            </button>
            <button
              type="button"
              onClick={() => runAndClose(onToggleHealth)}
              aria-pressed={healthOpen}
              className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-left font-semibold transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 dark:hover:bg-white/10"
            >
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                Health
              </span>
              {healthOpen && <span className="text-[10px] font-bold uppercase text-emerald-600">Open</span>}
            </button>
            <button
              type="button"
              onClick={() => runAndClose(onToggleTruthAudit)}
              aria-pressed={truthAuditVisible}
              className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-left font-semibold transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 dark:hover:bg-white/10"
            >
              <span className="flex items-center gap-2">
                <span
                  className={[
                    "h-2 w-2 rounded-full",
                    truthAuditCount > 0 ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-600",
                  ].join(" ")}
                  aria-hidden
                />
                Audit
              </span>
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-300 dark:ring-white/10">
                {truthAuditCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => runAndClose(onOpenSharedServices)}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-left font-semibold text-violet-700 transition hover:bg-violet-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 dark:text-violet-300 dark:hover:bg-violet-500/10"
            >
              <span className="h-2 w-2 rounded-full bg-violet-500" aria-hidden />
              Services
            </button>
          </div>
          <div className="my-2 h-px bg-slate-200 dark:bg-white/10" />
          <div className="grid gap-1">
            <button
              type="button"
              onClick={() => runAndClose(() => onCleanup("compact"))}
              className="rounded-xl px-3 py-2 text-left font-semibold transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 dark:hover:bg-white/10"
            >
              Compact layout
            </button>
            <button
              type="button"
              onClick={() => runAndClose(() => onCleanup("spacious"))}
              className="rounded-xl px-3 py-2 text-left font-semibold transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 dark:hover:bg-white/10"
            >
              Spacious layout
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

const DEPARTMENT_OWNER_COLORS: Record<string, string> = {
  [DEPARTMENT_SUPER_ROOT_ID]: "#334155",
  "person-pat-mcgaughan": "#475569",
  "person-rob-roland": "#2563eb",
  "person-jason-sloan": "#0ea5e9",
  "person-michael-sonntag": "#0d9488",
  "person-derick-dahl": "#4f46e5",
  "person-grace-dryer": "#db2777",
  "person-jorge-notni": "#ea580c",
};

const LANE_PAD_X = 70;
const LANE_PAD_TOP = 430;
const DEPARTMENT_LANE_PAD_TOP = 92;
const LANE_PAD_BOTTOM = 70;
const LANE_MIN_WIDTH: Record<LensDimension, number> = {
  brand: 1240,
  channel: 980,
  department: 720,
};
const CONTEXT_CARD_HEIGHT = 122;
const CONTEXT_CARD_GAP = 32;
const CONTEXT_ROW_TOP = 72;
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
  edges: GraphEdge[],
  positions: Record<string, { x: number; y: number }>,
  dimension: LensDimension,
  showMirrors: boolean,
  onOpenSharedServiceGroup: (ids: string[], label: string) => void,
  onSelectPerson: (id: string) => void,
  focusSet: Set<string> | null,
  zoom: number,
  contextOnlyPersonIds: Set<string> = new Set(),
): Node[] => {
  const personById = new Map(people.map((person) => [person.id, person]));
  const lanePeople =
    dimension === "department"
      ? people.filter((person) => !isDepartmentExecutiveContextId(person.id))
      : people.filter((person) => !contextOnlyPersonIds.has(person.id));
  const groups = groupNodesByDimension(lanePeople, dimension);
  const departmentOwnerByKey =
    dimension === "department" ? buildDepartmentOwnerByKey(people, edges) : new Map<string, string>();
  const laneNodes: Node[] = [];
  const mirrorNodes: Node[] = [];
  const laneRects: Array<{ key: string; minX: number; maxX: number; minY: number; count: number }> = [];
  const channelTemplateLabel = (key: string) => {
    if (key === "All Channels" || key.startsWith("All ")) return "Both Channels";
    const group = channelTopGroup(key);
    if (group === "Commercial") return "Professional";
    return group;
  };
  const channelTemplateDetail = (label: string) => {
    if (label === "Residential") return "Dedicated residential channels";
    if (label === "Both Channels") return "Shared channel backbone";
    if (label === "Professional") return "Professional + enterprise channels";
    return undefined;
  };
  const channelLaneDetail = (key: string) => {
    if (key === "All Channels" || key.startsWith("All ")) return "Shared channel backbone";
    if (key === "Enterprise") return "Enterprise channel";
    if (channelTopGroup(key) === "Residential") return "Residential channel";
    if (channelTopGroup(key) === "Commercial" || channelSubGroup(key) === "Professional") {
      return "Professional channel";
    }
    return undefined;
  };

  const resolveContextPeople = (key: string) => {
    if (dimension === "brand") {
      return (BRAND_CONTEXT_BY_BRAND[key] ?? []).flatMap((id) => {
        const person = personById.get(id);
        return person ? [person] : [];
      });
    }
    if (dimension === "channel") {
      const contextKeys = [
        key,
        channelSubGroup(key),
        channelTopGroup(key),
      ].filter((value): value is string => Boolean(value));
      const ids = new Set<string>();
      contextKeys.forEach((contextKey) => {
        (CHANNEL_CONTEXT_BY_KEY[contextKey] ?? []).forEach((id) => ids.add(id));
      });
      return [...ids].flatMap((id) => {
        const person = personById.get(id);
        return person ? [person] : [];
      });
    }
    return [];
  };

  groups.forEach((members, key) => {
    const points = members
      .map((member) => positions[member.id])
      .filter((point): point is { x: number; y: number } => Boolean(point));
    if (points.length === 0) return;
    let minX = Math.min(...points.map((p) => p.x)) - LANE_PAD_X;
    let maxX = Math.max(...points.map((p) => p.x)) + NODE_WIDTH + LANE_PAD_X;
    const lanePadTop = dimension === "department" ? DEPARTMENT_LANE_PAD_TOP : LANE_PAD_TOP;
    const minY = Math.min(...points.map((p) => p.y)) - lanePadTop;
    let maxY = Math.max(...points.map((p) => p.y)) + NODE_HEIGHT + LANE_PAD_BOTTOM;
    const contextPeople = resolveContextPeople(key);
    const contextCols = Math.max(1, Math.min(contextPeople.length, 4));
    const contextRows = Math.ceil(contextPeople.length / Math.max(contextCols, 1));
    const contextWidth =
      contextPeople.length > 0
        ? contextCols * NODE_WIDTH + (contextCols - 1) * CONTEXT_CARD_GAP + 2 * LANE_PAD_X
        : 0;
    const targetWidth = Math.max(maxX - minX, LANE_MIN_WIDTH[dimension], contextWidth);
    if (targetWidth > maxX - minX) {
      const center = (minX + maxX) / 2;
      minX = center - targetWidth / 2;
      maxX = center + targetWidth / 2;
    }

    if (contextPeople.length > 0) {
      const rowWidth = contextCols * NODE_WIDTH + (contextCols - 1) * CONTEXT_CARD_GAP;
      const startX = minX + (maxX - minX - rowWidth) / 2;
      const contextTop = minY + CONTEXT_ROW_TOP;
      contextPeople.forEach((person, index) => {
        const row = Math.floor(index / contextCols);
        const col = index % contextCols;
        const data: MirrorNodeData = {
          node: person,
          accentColor: getLaneColor(key, dimension),
          homeLane: getGroupKey(person, dimension),
          targetLane: key,
          roleLabel:
            dimension === "brand"
              ? BRAND_CONTEXT_LABEL_BY_ID[person.id] ?? "Brand context"
              : CHANNEL_CONTEXT_LABEL_BY_ID[person.id] ?? "Channel owner",
          variant: "context",
          onSelect: onSelectPerson,
        };
        mirrorNodes.push({
          id: `context:${dimension}:${key}:${person.id}`,
          type: "mirrorNode",
          position: {
            x: startX + col * (NODE_WIDTH + CONTEXT_CARD_GAP),
            y: contextTop + row * (CONTEXT_CARD_HEIGHT + CONTEXT_CARD_GAP),
          },
          data,
          draggable: false,
          focusable: false,
          selectable: false,
          zIndex: 4,
        });
      });
      maxY = Math.max(
        maxY,
        minY + CONTEXT_ROW_TOP + contextRows * CONTEXT_CARD_HEIGHT + (contextRows - 1) * CONTEXT_CARD_GAP + LANE_PAD_BOTTOM,
      );
    }

    // Mirror cards: people whose secondary assignments include this lane,
    // stacked in a grid below the lane's primary members
    if (showMirrors) {
      const supportNameHints =
        dimension === "channel"
          ? (CHANNEL_SUPPORT_NAME_HINTS[key] ?? []).map((hint) => hint.toLowerCase())
          : [];
      const mirrors = people.filter(
        (person) => {
          if (person.attributes.tier === "c-suite") return false;
          if (getGroupKey(person, dimension) === key) return false;
          const assignedToLane = getAssignments(person, dimension).includes(key);
          const explicitlySupportsLane =
            supportNameHints.length > 0 &&
            supportNameHints.some((hint) => person.name.toLowerCase().includes(hint));
          return assignedToLane || explicitlySupportsLane;
        },
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
      detail: dimension === "channel" ? channelLaneDetail(key) : undefined,
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
      const g = channelTemplateLabel(r.key);
      if (!g) return; // unassigned / unknown channels do not get a top territory band
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
        data: {
          label,
          count: span.count,
          width: span.maxX - span.minX,
          detail: channelTemplateDetail(label),
          align: label === "Professional" ? "start" : "center",
          color: label === "Both Channels"
            ? CHANNEL_COLORS["All Channels"]
            : CHANNEL_GROUP_COLORS[label] ?? UNASSIGNED_LANE_COLOR,
          zoom,
          variant: "channel-template",
        },
        style: { width: span.maxX - span.minX, height: 120 },
        zIndex: -1,
        draggable: false,
        selectable: false,
        focusable: false,
      });
    });
  } else if (dimension === "department") {
    const byOwner = new Map<
      string,
      { minX: number; maxX: number; minY: number; count: number }
    >();
    laneRects.forEach((r) => {
      const ownerId = departmentOwnerByKey.get(r.key) ?? DEPARTMENT_SUPER_ROOT_ID;
      const cur = byOwner.get(ownerId);
      if (cur) {
        cur.minX = Math.min(cur.minX, r.minX);
        cur.maxX = Math.max(cur.maxX, r.maxX);
        cur.minY = Math.min(cur.minY, r.minY);
        cur.count += r.count;
      } else {
        byOwner.set(ownerId, { minX: r.minX, maxX: r.maxX, minY: r.minY, count: r.count });
      }
    });

    byOwner.forEach((span, ownerId) => {
      const label = DEPARTMENT_OWNER_LABELS[ownerId] ?? "SLT";
      const color = DEPARTMENT_OWNER_COLORS[ownerId] ?? UNASSIGNED_LANE_COLOR;
      groupBandNodes.push({
        id: `deptowner:${ownerId}`,
        type: "gridGroupNode",
        position: { x: span.minX, y: span.minY - 132 },
        data: {
          label,
          count: span.count,
          width: span.maxX - span.minX,
          color,
          zoom,
          variant: "owner-band",
        },
        style: { width: span.maxX - span.minX, height: 86 },
        zIndex: -2,
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
  if (handle.includes("support") || handle.includes("sponsor")) return "support";
  if (handle.includes("dotted")) return "dotted";
  return "manager";
};

const offsetPosition = (position: { x: number; y: number }, delta: { x: number; y: number }) => ({
  x: position.x + delta.x,
  y: position.y + delta.y,
});
