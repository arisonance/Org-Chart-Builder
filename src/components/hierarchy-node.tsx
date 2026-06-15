'use client';

import { memo, useMemo, type ReactNode } from "react";
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
  addSponsor: (nodeId: string) => void;
  addDotted: (nodeId: string) => void;
  convertToGroup: (nodeId: string) => void;
  duplicate: (nodeId: string) => void;
  copy: (nodeId: string) => void;
  delete: (nodeId: string) => void;
  lockToggle: (nodeId: string) => void;
  colorTag: (nodeId: string, token: string) => void;
  openEditor: (nodeId: string) => void;
  copySettings: (nodeId: string) => void;
  pasteSettings: (nodeId: string) => void;
};

export type HierarchyNodeData = {
  node: PersonNode;
  lens: LensId;
  accentColor: string;
  emphasisLabel?: string;
  isSelected: boolean;
  highlightTokens: string[];
  actions: NodeActions;
  onSelect: (id: string, additive?: boolean) => void;
  zoom?: number; // Current zoom level for LOD rendering
  // Hierarchy view: subtree fold chip (People Finder style)
  reportCount?: number; // direct reports
  hiddenCount?: number; // all descendants (shown when collapsed)
  isCollapsed?: boolean;
  onToggleCollapse?: (id: string) => void;
  // When set, this node anchors a facility / shared service and renders as a container
  unit?: UnitDef;
};

// Tier badges configuration
const TIER_BADGES: Record<string, { label: string; className: string }> = {
  "c-suite": { label: "C-Suite", className: "bg-amber-100 text-amber-800" },
  vp: { label: "VP", className: "bg-indigo-100 text-indigo-700" },
  director: { label: "Director", className: "bg-teal-100 text-teal-700" },
  manager: { label: "Manager", className: "bg-sky-100 text-sky-700" },
  ic: { label: "Individual Contributor", className: "bg-slate-100 text-slate-600" },
};

const UNIT_CONTAINER_STYLE = {
  facility: { glyph: "🏭", accent: "#0f766e", chip: "bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-200" },
  "shared-service": { glyph: "🔗", accent: "#7c3aed", chip: "bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200" },
} as const;

function Component({ data }: { data: HierarchyNodeData }) {
  const {
    node, accentColor, emphasisLabel, isSelected, highlightTokens, actions, onSelect, zoom = 1,
    reportCount = 0, hiddenCount = 0, isCollapsed = false, onToggleCollapse, unit,
  } = data;

  // Facility / shared-service container: stands in for a whole group of people
  const isContainer = !!unit && isCollapsed && hiddenCount > 0;
  const containerStyle = unit ? UNIT_CONTAINER_STYLE[unit.type] : null;
  const containerCount = hiddenCount + 1;

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

  const tierBadge = node.attributes.tier ? TIER_BADGES[node.attributes.tier] : undefined;

  // Matrix load: how many brands + channels this person straddles. People living
  // in 2+ brands AND 2+ channels carry conflicting-priorities risk (see Org Health X-ray).
  const brandCount = node.attributes.brands.length;
  const channelCount = node.attributes.channels.length;
  const matrixLoad = brandCount + channelCount;
  const isHeavyMatrix = brandCount >= 2 && channelCount >= 2;
  const matrixSevere = matrixLoad >= 6;

  // Level of detail based on zoom - less aggressive for better initial render
  const lodLevel = getLodLevel(zoom);

  // Connection affordances (handle dots + the Dotted/Sponsor labels) are only
  // useful when you're close enough to actually wire a relationship. Hide them
  // when zoomed out so they don't turn into noise on every card; at full zoom
  // reveal them on hover or when the card is selected. Handles stay mounted
  // either way (opacity only) so existing edges keep attaching.
  const connectorClass = `transition-opacity duration-150 ${
    lodLevel !== "full"
      ? "opacity-0"
      : isSelected
        ? "opacity-100"
        : "opacity-0 group-hover:opacity-100"
  }`;

  const handleSelect = (event: React.MouseEvent | React.KeyboardEvent, additive = false) => {
    event.stopPropagation();
    onSelect(node.id, additive || event.metaKey || event.ctrlKey || event.shiftKey);
  };

  const primaryContextBadge =
    emphsizedLabelOrFirst([
      emphasisLabel,
      node.attributes.primaryBrand,
      node.attributes.primaryDepartment,
      node.attributes.primaryChannel,
    ]) ?? undefined;

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
            className={[
              "relative flex w-[16rem] flex-col items-center gap-3 rounded-2xl border bg-white px-5 py-5 text-center shadow-lg ring-1 transition focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 dark:bg-slate-950",
              isContainer
                ? "border-2 border-dashed ring-slate-200 dark:ring-white/10"
                : "border-slate-200 ring-slate-200 dark:border-white/10 dark:ring-white/10",
              isSelected
                ? "border-sky-500 ring-2 ring-sky-300/80 shadow-xl"
                : "hover:-translate-y-1 hover:shadow-xl",
            ].join(" ")}
            style={isContainer && containerStyle ? { borderColor: containerStyle.accent } : undefined}
          >
            {isContainer && (
              <>
                <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 translate-x-1.5 translate-y-1.5 rounded-2xl border border-slate-300 bg-white dark:border-white/15 dark:bg-slate-900" />
                <span aria-hidden className="pointer-events-none absolute inset-0 -z-20 translate-x-3 translate-y-3 rounded-2xl border border-slate-300 bg-white dark:border-white/10 dark:bg-slate-900" />
              </>
            )}
            <span
              className="pointer-events-none absolute inset-x-6 top-0 h-1.5 rounded-full"
              style={{ background: isContainer && containerStyle ? containerStyle.accent : accentColor }}
            />
            {isContainer && containerStyle && unit ? (
              <div className="flex min-h-[6.5rem] flex-col items-center justify-center gap-1.5">
                <span className="text-3xl leading-none" aria-hidden>{containerStyle.glyph}</span>
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${containerStyle.chip}`}>
                  {unit.type === "facility" ? "Facility" : "Shared service"}
                </span>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-50">{unit.label}</p>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{containerCount} people</p>
                <p className="text-[10px] text-slate-400">{unit.serves}</p>
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
                  {tierBadge ? (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tierBadge.className}`}>
                      {tierBadge.label}
                    </span>
                  ) : null}
                  {/* Matrix-load badge: flag people straddling many brands/channels */}
                  {lodLevel === 'full' && isHeavyMatrix ? (
                    <span
                      title={`Matrix load ${matrixLoad}: in ${brandCount} brands and ${channelCount} channels — conflicting-priorities risk`}
                      className={[
                        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        matrixSevere
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
                      ].join(" ")}
                    >
                      ⚡ Matrix ×{matrixLoad}
                    </span>
                  ) : null}
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
          <div className="pointer-events-none absolute left-[-18px] top-1/2 flex flex-col items-center gap-1">
            <Handle
              type="source"
              position={Position.Left}
              id={`${node.id}-dotted-source`}
              data-handle-type="dotted"
              className={`${HANDLE_BASE_CLASS} ${connectorClass} !bg-indigo-400 dark:!bg-indigo-500`}
            />
            <span className={`${connectorClass} text-[9px] font-medium uppercase tracking-wide text-indigo-500 dark:text-indigo-300`}>
              Dotted
            </span>
          </div>
          <div className="pointer-events-none absolute right-[-18px] top-1/2 flex flex-col items-center gap-1">
            <Handle
              type="source"
              position={Position.Right}
              id={`${node.id}-sponsor-source`}
              data-handle-type="sponsor"
              className={`${HANDLE_BASE_CLASS} ${connectorClass} !bg-amber-400 dark:!bg-amber-500`}
            />
            <span className={`${connectorClass} text-[9px] font-medium uppercase tracking-wide text-amber-500 dark:text-amber-300`}>
              Sponsor
            </span>
          </div>

          <Handle
            type="source"
            position={Position.Bottom}
            id={`${node.id}-manager-source`}
            data-handle-type="manager"
            className={`${HANDLE_BASE_CLASS} ${connectorClass} !bg-sky-500 hover:!bg-sky-600 dark:!bg-sky-400`}
          />

          {/* Subtree fold chip, People Finder style: "6 ⌄" expanded, "+12 ▸" collapsed */}
          {reportCount > 0 && onToggleCollapse && (
            <button
              type="button"
              data-testid={`collapse-chip-${node.id}`}
              aria-label={
                isCollapsed
                  ? `Show ${hiddenCount} hidden ${hiddenCount === 1 ? "report" : "reports"}`
                  : `Hide reports of ${node.name}`
              }
              onClick={(event) => {
                event.stopPropagation();
                onToggleCollapse(node.id);
              }}
              className={[
                "absolute -bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300",
                isCollapsed
                  ? "border-sky-300 bg-sky-500 text-white hover:bg-sky-600"
                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-100 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
              ].join(" ")}
            >
              {isCollapsed ? `+${hiddenCount} ▸` : `${reportCount} ⌄`}
            </button>
          )}
        </div>
      </ContextMenu.Trigger>
      <ContextMenu.Content className="z-50 min-w-[220px] rounded-xl border border-slate-200 bg-white/95 p-1 text-sm shadow-xl backdrop-blur dark:border-white/10 dark:bg-slate-900/90">
        <MenuLabel text={node.name} />
        <MenuItem onSelect={() => actions.openEditor(node.id)}>Edit person…</MenuItem>
        <MenuSeparator />
        <MenuItem onSelect={() => actions.addDirectReport(node.id)}>Add direct report</MenuItem>
        <MenuItem onSelect={() => actions.addManager(node.id)}>Add manager</MenuItem>
        <MenuItem onSelect={() => actions.addSponsor(node.id)}>Add executive sponsor</MenuItem>
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
        <MenuItem onSelect={() => actions.copy(node.id)} icon={<CopyIcon className="h-3.5 w-3.5" />}>
          Copy
        </MenuItem>
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
  return values.find((value) => value && value.trim().length > 0);
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
