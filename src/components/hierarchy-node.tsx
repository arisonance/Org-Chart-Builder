'use client';

import { memo, useEffect, useMemo, useRef, type ReactNode } from "react";
import { Handle, Position } from "@xyflow/react";
import * as ContextMenu from "@radix-ui/react-context-menu";
import { ChevronRightIcon, CopyIcon, LockClosedIcon, LockOpen1Icon } from "@radix-ui/react-icons";
import type { LensId } from "@/lib/schema/lenses";
import type { PersonNode } from "@/lib/schema/types";
import type { UnitDef } from "@/lib/graph/org-units";

// Extract static styles as constants for better performance
const HANDLE_BASE_CLASS = "h-3 w-3 rounded-full border border-white shadow-sm transition-transform hover:scale-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-sky-400";
const BADGE_BASE_CLASS = "inline-flex items-center rounded-full border border-slate-200 bg-white/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:border-white/10 dark:bg-white/10 dark:text-slate-300";

type NodeActions = {
  addDirectReport: (managerId: string) => void;
  addManager: (nodeId: string) => void;
  addDotted: (nodeId: string) => void;
  convertToGroup: (nodeId: string) => void;
  duplicate: (nodeId: string) => void;
  copy: (nodeId: string) => void;
  delete: (nodeId: string) => void;
  lockToggle: (nodeId: string) => void;
  colorTag: (nodeId: string, token: string) => void;
  openEditor: (nodeId: string) => void;
  openOrg: (nodeId: string) => void;
  copySettings: (nodeId: string) => void;
  pasteSettings: (nodeId: string) => void;
};

export type HierarchyNodeData = {
  node: PersonNode;
  lens: LensId;
  accentColor: string;
  emphasisLabel?: string;
  relationshipRole?: {
    label: string;
    detail?: string;
    tone: "selected" | "manager" | "report" | "downstream" | "peer" | "matrix";
  };
  isSelected: boolean;
  highlightTokens: string[];
  actions: NodeActions;
  onSelect: (id: string, additive?: boolean) => void;
  readOnly?: boolean;
  zoom?: number; // Current zoom level for LOD rendering
  // Hierarchy view: subtree fold chip (People Finder style)
  reportCount?: number; // direct reports
  hiddenCount?: number; // all descendants (shown when collapsed)
  isCollapsed?: boolean;
  onToggleCollapse?: (id: string) => void;
  hideReportToggle?: boolean;
  // When set, this node anchors a facility / shared service and renders as a container
  unit?: UnitDef;
};

// Tier badges configuration
const UNIT_CONTAINER_STYLE = {
  facility: { glyph: "FAC", accent: "#0f766e", chip: "bg-teal-100 text-teal-800" },
  "shared-service": { glyph: "SS", accent: "#7c3aed", chip: "bg-violet-100 text-violet-800" },
} as const;

function Component({ data }: { data: HierarchyNodeData }) {
  const {
    node, accentColor, emphasisLabel, isSelected, highlightTokens, actions, onSelect, readOnly = false, zoom = 1,
    relationshipRole, reportCount = 0, hiddenCount = 0, isCollapsed = false, onToggleCollapse, hideReportToggle = false, unit,
  } = data;

  // Facility / shared-service container: stands in for a whole group of people
  const isContainer = !!unit && isCollapsed && hiddenCount > 0;
  const containerStyle = unit ? UNIT_CONTAINER_STYLE[unit.type] : null;
  const containerCount = hiddenCount + 1;
  const opensOrgView = reportCount > 0 || hiddenCount > 0 || isContainer;

  const initials = useMemo(
    () =>
      node.name
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase(),
    [node.name],
  );

  // Level of detail based on zoom - less aggressive for better initial render
  const lodLevel = getLodLevel(zoom);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastClickAtRef = useRef(0);

  useEffect(
    () => () => {
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    },
    [],
  );

  // Connection affordances (handle dots + the Dotted/Sponsor labels) are only
  // useful when you're close enough to actually wire a relationship. Hide them
  // when zoomed out so they don't turn into noise on every card; at full zoom
  // reveal them on hover or when the card is selected. Handles stay mounted
  // either way (opacity only) so existing edges keep attaching.
  const connectorClass = `transition-opacity duration-150 ${
    readOnly
      ? "opacity-0"
      : lodLevel !== "full"
      ? "opacity-0"
      : isSelected
        ? "opacity-100"
        : "opacity-0 group-hover:opacity-100"
  }`;

  const handleSelect = (event: React.MouseEvent | React.KeyboardEvent, additive = false) => {
    event.stopPropagation();
    const now = Date.now();
    const isRapidSecondClick = now - lastClickAtRef.current < 340;
    if (("detail" in event && event.detail > 1) || isRapidSecondClick) {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
      lastClickAtRef.current = 0;
      if (opensOrgView) {
        actions.openOrg(node.id);
      } else {
        actions.openEditor(node.id);
      }
      return;
    }
    lastClickAtRef.current = now;
    const shouldAdd = additive || event.metaKey || event.ctrlKey || event.shiftKey;
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(
      () => {
        onSelect(node.id, shouldAdd);
        clickTimerRef.current = null;
      },
      shouldAdd ? 0 : 180,
    );
  };

  const handleOpenDetailsOrOrg = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    if (opensOrgView) {
      actions.openOrg(node.id);
    } else {
      actions.openEditor(node.id);
    }
  };

  const primaryContextBadge =
    emphsizedLabelOrFirst([
      emphasisLabel,
      node.attributes.primaryBrand,
      node.attributes.primaryDepartment,
      node.attributes.primaryChannel,
    ]) ?? undefined;

  const relationshipRoleClass =
    relationshipRole?.tone === "selected"
      ? "bg-slate-900 text-white ring-slate-900/10 dark:bg-white dark:text-slate-950 dark:ring-white/20"
      : relationshipRole?.tone === "manager"
        ? "bg-sky-50 text-sky-800 ring-sky-100 dark:bg-sky-500/15 dark:text-sky-100 dark:ring-sky-400/20"
        : relationshipRole?.tone === "report"
          ? "bg-emerald-50 text-emerald-800 ring-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-100 dark:ring-emerald-400/20"
          : relationshipRole?.tone === "downstream"
            ? "bg-teal-50 text-teal-800 ring-teal-100 dark:bg-teal-500/15 dark:text-teal-100 dark:ring-teal-400/20"
            : relationshipRole?.tone === "peer"
              ? "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10"
              : "bg-amber-50 text-amber-800 ring-amber-100 dark:bg-amber-500/15 dark:text-amber-100 dark:ring-amber-400/20";

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <div className="group relative flex flex-col items-center">
          <Handle
            type="target"
            position={Position.Top}
            id={`${node.id}-manager-target`}
            data-handle-type="manager"
            className={`${HANDLE_BASE_CLASS} ${connectorClass} !bg-slate-400 dark:!bg-slate-600`}
          />
          <button
            type="button"
            onClick={(event) => handleSelect(event, event.shiftKey)}
            onDoubleClick={handleOpenDetailsOrOrg}
            title={isContainer ? `Double-click to open ${unit.label}'s team view` : undefined}
            className={[
              "relative flex w-[16rem] flex-col items-center gap-3 rounded-2xl border bg-white px-5 py-5 text-center shadow-lg ring-1 transition focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 dark:bg-slate-950",
              isContainer
                ? "border-slate-200 !bg-white ring-slate-200 dark:!border-slate-200 dark:!bg-white dark:!text-slate-900 dark:!ring-slate-200"
                : "border-slate-200 ring-slate-200 dark:border-white/10 dark:ring-white/10",
              isSelected
                ? "border-sky-500 ring-2 ring-sky-300/80 shadow-xl"
                : "hover:-translate-y-1 hover:shadow-xl",
            ].join(" ")}
            style={isContainer && containerStyle ? { borderColor: containerStyle.accent } : undefined}
          >
            <span
              className="pointer-events-none absolute inset-x-6 top-0 h-1.5 rounded-full"
              style={{ background: isContainer && containerStyle ? containerStyle.accent : accentColor }}
            />
            {relationshipRole && lodLevel !== "compact" && (
              <span
                className={`absolute left-3 top-3 max-w-[9.5rem] truncate rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${relationshipRoleClass}`}
                title={relationshipRole.detail ?? relationshipRole.label}
              >
                {relationshipRole.label}
              </span>
            )}
            {isContainer && containerStyle && unit ? (
              <div className="flex min-h-[6.5rem] flex-col items-center justify-center gap-1.5">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold tracking-wide text-white shadow-sm"
                  aria-hidden
                >
                  {containerStyle.glyph}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${containerStyle.chip}`}>
                  {unit.type === "facility" ? "Facility" : "Shared service"}
                </span>
                <p className="text-sm font-bold text-slate-900">{unit.label}</p>
                <p className="text-xs font-semibold text-slate-700">{containerCount} people</p>
                <p className="text-[10px] text-slate-500">{unit.serves}</p>
              </div>
            ) : lodLevel === 'compact' ? (
              /* Zoomed way out: counter-scale the name so cards stay legible as chips */
              <div className="flex min-h-[7rem] flex-col items-center justify-center gap-1 overflow-hidden">
                <p
                  className="line-clamp-2 font-bold tracking-tight text-slate-900 dark:text-slate-50"
                  style={{ fontSize: Math.min(40, 14 / Math.max(zoom, 0.1)), lineHeight: 1.05 }}
                >
                  {node.name}
                </p>
                {zoom >= 0.25 && (
                  <p
                    className="line-clamp-1 text-slate-500 dark:text-slate-300"
                    style={{ fontSize: Math.min(18, 7 / Math.max(zoom, 0.1)) }}
                  >
                    {node.attributes.title}
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className="relative mt-1 flex h-14 w-14 items-center justify-center rounded-full bg-slate-900/90 text-sm font-semibold uppercase tracking-tight text-white shadow-md dark:bg-slate-200/50 dark:text-white">
                  {initials}
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{node.name}</p>
                  <p className="text-xs leading-snug text-slate-500 dark:text-slate-300">
                    {node.attributes.title}
                  </p>
                  {/* Hide job description at medium zoom for performance */}
                  {lodLevel === 'full' && node.attributes.jobDescription && (
                    <p className="mt-1 text-[10px] leading-relaxed text-slate-400 dark:text-slate-400 line-clamp-2">
                      {node.attributes.jobDescription}
                    </p>
                  )}
                </div>
                {lodLevel === 'full' && (
                <div className="flex flex-wrap items-center justify-center gap-1">
                  {/* Show context badge only at full zoom */}
                  {lodLevel === 'full' && primaryContextBadge ? (
                    <span className={`${BADGE_BASE_CLASS} border-transparent bg-slate-900/10 text-[10px]`}>
                      {primaryContextBadge}
                    </span>
                  ) : null}
                  {/* Show highlight tokens only at full zoom */}
                  {lodLevel === 'full' && highlightTokens.map((token) => (
                    <span key={token} className={`${BADGE_BASE_CLASS} border-transparent bg-sky-100 text-sky-700`}>
                      {token}
                    </span>
                  ))}
                </div>
                )}
              </>
            )}
          </button>
          {/* Dotted-line connector: a subtle dot at the left edge, revealed on
              hover. No protruding text label (it bled past the card), and the
              Sponsor connector has been removed. */}
          <Handle
            type="source"
            position={Position.Left}
            id={`${node.id}-dotted-source`}
            data-handle-type="dotted"
            className={`${HANDLE_BASE_CLASS} ${connectorClass} !bg-indigo-400 dark:!bg-indigo-500`}
          />

          <Handle
            type="source"
            position={Position.Bottom}
            id={`${node.id}-manager-source`}
            data-handle-type="manager"
            className={`${HANDLE_BASE_CLASS} ${hideReportToggle ? "opacity-0" : connectorClass} !bg-sky-500 hover:!bg-sky-600 dark:!bg-sky-400`}
            style={{ bottom: hideReportToggle ? -5 : undefined }}
          />

          {/* Subtree fold chip, People Finder style. Collapsed unit cards open
              their dedicated team view instead of expanding into a noisy canvas. */}
          {reportCount > 0 && onToggleCollapse && !hideReportToggle && (
            <button
              type="button"
              data-testid={`collapse-chip-${node.id}`}
              aria-label={
                isContainer && unit
                  ? `Open ${unit.label} team view, ${containerCount} people`
                  : isCollapsed
                  ? `Show ${hiddenCount} hidden ${hiddenCount === 1 ? "report" : "reports"}`
                  : `Hide reports of ${node.name}`
              }
              onClick={(event) => {
                event.stopPropagation();
                if (isContainer) {
                  actions.openOrg(node.id);
                  return;
                }
                onToggleCollapse(node.id);
              }}
              onDoubleClick={(event) => {
                event.stopPropagation();
                actions.openOrg(node.id);
              }}
              className={[
                "absolute -bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300",
                isContainer
                  ? "border-violet-200 bg-white text-violet-700 hover:bg-violet-50 dark:border-violet-200 dark:bg-white dark:text-violet-700"
                  : isCollapsed
                  ? "border-sky-300 bg-sky-500 text-white hover:bg-sky-600"
                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-100 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
              ].join(" ")}
            >
              {isContainer ? `${containerCount} people ▸` : isCollapsed ? `+${hiddenCount} ▸` : `${reportCount} ⌄`}
            </button>
          )}
        </div>
      </ContextMenu.Trigger>
      <ContextMenu.Content className="z-50 min-w-[220px] rounded-xl border border-slate-200 bg-white/95 p-1 text-sm shadow-xl backdrop-blur dark:border-white/10 dark:bg-slate-900/90">
        <MenuLabel text={node.name} />
        {opensOrgView && (
          <MenuItem onSelect={() => actions.openOrg(node.id)}>
            {isContainer && unit ? `Open ${unit.label} team` : "Open org view"}
          </MenuItem>
        )}
        <MenuItem onSelect={() => actions.openEditor(node.id)}>
          {readOnly ? "Switch to edit…" : "Edit person…"}
        </MenuItem>
        {readOnly ? (
          <>
            <MenuSeparator />
            <MenuLabel text="Explore mode protects org data and layouts" />
          </>
        ) : (
          <>
            <MenuSeparator />
            <MenuItem onSelect={() => actions.addDirectReport(node.id)}>Add direct report</MenuItem>
            <MenuItem onSelect={() => actions.addManager(node.id)}>Add manager</MenuItem>
            <MenuItem onSelect={() => actions.addDotted(node.id)}>Add dotted-line</MenuItem>
            <MenuSeparator />
            <MenuItem onSelect={() => actions.copySettings(node.id)} icon={<CopyIcon className="h-3.5 w-3.5" />}>
              Copy settings
            </MenuItem>
            <MenuItem onSelect={() => actions.pasteSettings(node.id)}>Paste settings</MenuItem>
            <MenuSeparator />
            <ContextMenu.Sub>
              <ContextMenu.SubTrigger className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-slate-600 hover:bg-slate-100 focus:outline-none dark:text-slate-300 dark:hover:bg-white/10">
                Color tag
                <ChevronRightIcon className="h-4 w-4" />
              </ContextMenu.SubTrigger>
              <ContextMenu.SubContent className="min-w-[200px] rounded-xl border border-slate-200 bg-white/95 p-1 shadow-xl backdrop-blur dark:border-white/10 dark:bg-slate-900/90">
                {["Brand", "Channel", "Department"].map((token) => (
                  <MenuItem key={token} onSelect={() => actions.colorTag(node.id, token)}>
                    {token}
                  </MenuItem>
                ))}
              </ContextMenu.SubContent>
            </ContextMenu.Sub>
            <MenuItem onSelect={() => actions.convertToGroup(node.id)}>Convert to group node</MenuItem>
            <MenuSeparator />
          </>
        )}
        <MenuItem onSelect={() => actions.copy(node.id)} icon={<CopyIcon className="h-3.5 w-3.5" />}>
          Copy
        </MenuItem>
        {!readOnly && (
          <>
            <MenuItem onSelect={() => actions.duplicate(node.id)}>Duplicate</MenuItem>
            <MenuItem
              onSelect={() => actions.lockToggle(node.id)}
              icon={
                node.locked ? (
                  <LockClosedIcon className="h-3.5 w-3.5" />
                ) : (
                  <LockOpen1Icon className="h-3.5 w-3.5" />
                )
              }
            >
              {node.locked ? "Unlock position" : "Lock position"}
            </MenuItem>
            <MenuSeparator />
            <MenuItem destructive onSelect={() => actions.delete(node.id)}>
              Remove person
            </MenuItem>
          </>
        )}
      </ContextMenu.Content>
    </ContextMenu.Root>
  );
}

const MenuItem = ({
  children,
  onSelect,
  icon,
  destructive,
}: {
  children: ReactNode;
  onSelect: () => void;
  icon?: React.ReactNode;
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
    {icon ? <span className="text-slate-400">{icon}</span> : null}
    <span>{children}</span>
  </ContextMenu.Item>
);

const MenuSeparator = () => <ContextMenu.Separator className="my-1 h-px w-full bg-slate-200 dark:bg-white/10" />;

const MenuLabel = ({ text }: { text: string }) => (
  <ContextMenu.Label className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
    {text}
  </ContextMenu.Label>
);

const emphsizedLabelOrFirst = (values: Array<string | undefined | null>) => {
  // Skip empties and generic "All Brands" / "All Channels" buckets — they mean
  // "not specialized" and just add noise. Only surface a specific affiliation.
  return values.find(
    (value) => value && value.trim().length > 0 && !/^all\s/i.test(value.trim()),
  );
};

// Level of detail buckets: full cards zoomed in, no badges at medium zoom,
// oversized name-only chips when zoomed way out
const getLodLevel = (zoom: number): 'full' | 'medium' | 'compact' => {
  if (zoom > 0.6) return 'full';
  if (zoom >= 0.45) return 'medium';
  return 'compact';
};

// Custom comparison function for better memoization
function arePropsEqual(prevProps: { data: HierarchyNodeData }, nextProps: { data: HierarchyNodeData }): boolean {
  const prev = prevProps.data;
  const next = nextProps.data;

  // Re-render whenever the zoom crosses an LOD boundary
  const prevLod = getLodLevel(prev.zoom ?? 1);
  const nextLod = getLodLevel(next.zoom ?? 1);
  if (prevLod !== nextLod) {
    return false;
  }
  // Compact cards counter-scale their text with zoom, so track it continuously there
  if (nextLod === 'compact' && Math.abs((prev.zoom ?? 1) - (next.zoom ?? 1)) > 0.01) {
    return false;
  }

  // Collapse chip state must always trigger a re-render
  if (
    prev.isCollapsed !== next.isCollapsed ||
    prev.reportCount !== next.reportCount ||
    prev.hiddenCount !== next.hiddenCount
  ) {
    return false;
  }

  // Fast path: if node reference is the same and selection hasn't changed, skip re-render
  if (prev.node === next.node &&
      prev.isSelected === next.isSelected &&
      prev.accentColor === next.accentColor &&
      prev.emphasisLabel === next.emphasisLabel &&
      prev.highlightTokens.length === next.highlightTokens.length) {
    return true;
  }

  // Deep comparison for critical fields
  return (
    prev.node.id === next.node.id &&
    prev.node.name === next.node.name &&
    prev.node.locked === next.node.locked &&
    prev.node.attributes.title === next.node.attributes.title &&
    prev.isSelected === next.isSelected &&
    prev.accentColor === next.accentColor &&
    prev.lens === next.lens &&
    prev.highlightTokens.join(',') === next.highlightTokens.join(',')
  );
}

export const HierarchyNode = memo(Component, arePropsEqual);
