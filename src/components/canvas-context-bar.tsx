'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import { useGraphStore } from "@/store/graph-store";
import { LENS_BY_ID } from "@/lib/schema/lenses";
import type { PersonNode } from "@/lib/schema/types";
import { getSharedServiceGroupForPerson } from "@/lib/graph/shared-service-groups";

type ViewContext = {
  kind: "support-pod" | "shared-services" | "unit" | "lens-group" | "operating-view";
  label: string;
  count: number;
  owner?: string;
  description?: string;
  publishedBy?: string;
  publishedAt?: string;
  dimension?: "brand" | "channel" | "department";
  value?: string;
};

const EMPTY_IDS: string[] = [];
const EMPTY_TOKENS: string[] = [];

/**
 * Top-center "you are here" strip. Two modes, mutually exclusive:
 *  - A single selected person → a clickable manager-chain breadcrumb
 *    (CEO › VP › … › Person) so you always know where they sit, with an Exit.
 *  - An active view subset (search / filter / focus presets) → a chip that
 *    names what's narrowing the canvas, plus one-click Reset view.
 * When neither applies it renders nothing, keeping the resting canvas clean.
 */
export function CanvasContextBar({
  onResetView,
  onOpenTeamTree,
  teamTreeRootId,
  onExitTeamTree,
  teamLayoutControls,
  officialLayoutControls,
  viewContext,
}: {
  onResetView: () => void;
  onOpenTeamTree: (nodeId: string) => void;
  teamTreeRootId: string | null;
  onExitTeamTree: () => void;
  teamLayoutControls?: {
    dirty: boolean;
    saved: boolean;
    onSave: () => void;
    onReset: () => void;
  };
  officialLayoutControls?: {
    dirty: boolean;
    saved: boolean;
    canManage: boolean;
    publishedAt?: string;
    publishedBy?: string;
    onPublish: () => void;
    onDiscard: () => void;
    onReset: () => void;
  };
  viewContext: ViewContext | null;
}) {
  const lens = useGraphStore((s) => s.document.lens);
  const nodes = useGraphStore((s) => s.document.nodes);
  const edges = useGraphStore((s) => s.document.edges);
  const selection = useGraphStore((s) => s.selection);
  const filters = useGraphStore((s) => s.document.lens_state[s.document.lens]?.filters);
  const selectNode = useGraphStore((s) => s.selectNode);
  const clearSelection = useGraphStore((s) => s.clearSelection);
  const openEditor = useGraphStore((s) => s.openEditor);
  const [expandedReportFocusId, setExpandedReportFocusId] = useState<string | null>(null);

  const nodeById = useMemo(() => {
    const map = new Map<string, PersonNode>();
    nodes.forEach((node) => {
      if (node.kind === "person") {
        map.set(node.id, node);
      }
    });
    return map;
  }, [nodes]);

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    nodeById.forEach((node, id) => map.set(id, node.name));
    return map;
  }, [nodeById]);

  // Direct manager of each person, for walking the reporting chain upward
  const parentMap = useMemo(() => {
    const map: Record<string, string> = {};
    edges.forEach((edge) => {
      if (edge.metadata.type === "manager" && !(edge.target in map)) {
        map[edge.target] = edge.source;
      }
    });
    return map;
  }, [edges]);

  const childMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    edges.forEach((edge) => {
      if (edge.metadata.type !== "manager") return;
      if (!map[edge.source]) map[edge.source] = [];
      map[edge.source].push(edge.target);
    });
    return map;
  }, [edges]);

  const focusedId =
    selection.nodeIds.length === 1 && nodeById.has(selection.nodeIds[0])
      ? selection.nodeIds[0]
      : null;
  const teamTreeRoot = teamTreeRootId ? nodeById.get(teamTreeRootId) : null;

  // Root → focused person, following manager edges
  const chain = useMemo(() => {
    if (!focusedId) return [] as string[];
    const out: string[] = [];
    const seen = new Set<string>();
    let cur: string | undefined = focusedId;
    while (cur && !seen.has(cur)) {
      out.unshift(cur);
      seen.add(cur);
      cur = parentMap[cur];
    }
    return out;
  }, [focusedId, parentMap]);

  const directReportIds = focusedId ? childMap[focusedId] ?? [] : [];
  const reportsExpanded = focusedId !== null && expandedReportFocusId === focusedId;
  const focusedPerson = focusedId ? nodeById.get(focusedId) ?? null : null;
  const focusedName = focusedId ? nameById.get(focusedId) ?? "Selected" : "";
  const managerId = focusedId ? parentMap[focusedId] : undefined;
  const managerName = managerId ? nameById.get(managerId) : null;
  const peerIds = managerId
    ? (childMap[managerId] ?? []).filter((id) => id !== focusedId)
    : [];
  const matrixRelationships = focusedId
    ? edges
        .filter(
          (edge) =>
            edge.metadata.type !== "manager" &&
            (edge.source === focusedId || edge.target === focusedId),
        )
        .map((edge) => {
          const otherId = edge.source === focusedId ? edge.target : edge.source;
          const otherName = nameById.get(otherId) ?? "Unknown";
          const type =
            edge.metadata.type === "dotted"
              ? "Dotted"
              : edge.metadata.type === "sponsor"
                ? "Sponsor"
                : edge.metadata.type;
          return { id: edge.id, type, otherId, otherName };
        })
    : [];
  const supportPod =
    focusedPerson && focusedPerson.attributes.tier !== "c-suite"
      ? getSharedServiceGroupForPerson(focusedPerson)
      : null;
  const openPerson = useCallback(
    (id: string) => {
      if (id === focusedId && (childMap[id]?.length ?? 0) > 0) {
        onOpenTeamTree(id);
        return;
      }
      selectNode(id);
    },
    [childMap, focusedId, onOpenTeamTree, selectNode],
  );
  const descendantIds = useMemo(() => {
    if (!focusedId) return [] as string[];
    const out: string[] = [];
    const seen = new Set<string>([focusedId]);
    const queue = [...(childMap[focusedId] ?? [])];
    while (queue.length) {
      const id = queue.shift()!;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(id);
      queue.push(...(childMap[id] ?? []));
    }
    return out;
  }, [focusedId, childMap]);
  const directReportSummary =
    directReportIds.length > 0
      ? `${directReportIds.length} direct ${directReportIds.length === 1 ? "report" : "reports"}`
      : "No direct reports";
  const orgSizeSummary =
    descendantIds.length > directReportIds.length
      ? `${descendantIds.length + 1} total people`
      : null;
  const directReportPreviewIds = directReportIds.slice(0, reportsExpanded ? 12 : 4);
  const remainingDirectReports = Math.max(0, directReportIds.length - directReportPreviewIds.length);

  useEffect(() => {
    setExpandedReportFocusId(null);
  }, [focusedId]);

  const focusIds = filters?.focusIds ?? EMPTY_IDS;
  const activeTokens = filters?.activeTokens ?? EMPTY_TOKENS;
  const hiddenIds = filters?.hiddenIds ?? EMPTY_IDS;
  const contextTitle =
    viewContext?.kind === "support-pod"
      ? "Support pod"
      : viewContext?.kind === "shared-services"
        ? "Shared services"
        : viewContext?.kind === "unit"
          ? "Unit view"
          : viewContext?.kind === "operating-view"
            ? "Official view"
            : viewContext?.kind === "lens-group"
            ? "Focused group"
            : LENS_BY_ID[lens].label;

  const operatingViewSummary = useMemo(() => {
    if (viewContext?.kind !== "operating-view" || viewContext.dimension !== "channel" || !viewContext.value) {
      return null;
    }
    const people = Array.from(nodeById.values()).filter((person) =>
      person.attributes.channels.includes(viewContext.value ?? ""),
    );
    const dedicated = people.filter((person) => person.attributes.primaryChannel === viewContext.value);
    const broadSupport = people.filter((person) => person.attributes.primaryChannel !== viewContext.value);
    const podKeys = new Set(
      broadSupport.map((person) => {
        const pod = getSharedServiceGroupForPerson(person);
        return `${pod.service}:${pod.label}`;
      }),
    );
    return {
      dedicatedCount: dedicated.length,
      broadSupportCount: broadSupport.length,
      podCount: podKeys.size,
    };
  }, [nodeById, viewContext]);

  // A single-person selection drives focus highlighting (the breadcrumb), not a
  // subset filter — so only treat focusIds as a "subset" when nothing's selected.
  const descriptors: string[] = [];
  if (focusIds.length > 0 && !focusedId) {
    if (viewContext) descriptors.push(viewContext.label);
    descriptors.push(`Showing ${focusIds.length} ${focusIds.length === 1 ? "person" : "people"}`);
  }
  if (activeTokens.length > 0) descriptors.push(`Filtered: ${activeTokens.join(", ")}`);
  if (hiddenIds.length > 0) descriptors.push(`${hiddenIds.length} hidden`);
  const subsetActive = descriptors.length > 0;

  if (!focusedId && !subsetActive && !teamTreeRoot) return null;

  const TruthPill = ({
    label,
    value,
    tone = "slate",
    onClick,
  }: {
    label: string;
    value: string;
    tone?: "slate" | "sky" | "emerald" | "violet" | "amber";
    onClick?: () => void;
  }) => {
    const toneClass =
      tone === "sky"
        ? "bg-sky-50 text-sky-800 ring-sky-100 dark:bg-sky-50 dark:text-sky-800 dark:ring-sky-100"
        : tone === "emerald"
          ? "bg-emerald-50 text-emerald-800 ring-emerald-100 dark:bg-emerald-50 dark:text-emerald-800 dark:ring-emerald-100"
          : tone === "violet"
            ? "bg-violet-50 text-violet-800 ring-violet-100 dark:bg-violet-50 dark:text-violet-800 dark:ring-violet-100"
            : tone === "amber"
              ? "bg-amber-50 text-amber-800 ring-amber-100 dark:bg-amber-50 dark:text-amber-800 dark:ring-amber-100"
              : "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-100 dark:text-slate-700 dark:ring-slate-200";
    const className = `inline-flex max-w-[14rem] items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${toneClass}`;
    const content = (
      <>
        <span className="text-[9px] uppercase tracking-wide opacity-60">{label}</span>
        <span className="truncate">{value}</span>
      </>
    );
    if (!onClick) return <span className={className}>{content}</span>;
    return (
      <button type="button" onClick={onClick} className={`${className} transition hover:brightness-95`}>
        {content}
      </button>
    );
  };

  return (
    <div className="pointer-events-none absolute left-1/2 top-4 z-30 flex max-w-[88vw] -translate-x-1/2 flex-col items-center gap-2">
      {focusedId && !teamTreeRoot && (
        <nav
          aria-label="Reporting chain"
          className="motion-context-bar pointer-events-auto flex max-w-[88vw] items-center gap-1 overflow-x-auto rounded-full border border-sky-200 bg-white px-3 py-1.5 text-xs shadow-lg ring-1 ring-sky-100 dark:border-sky-400/20 dark:bg-slate-900 dark:ring-sky-400/10"
        >
          <span className="inline-flex h-2 w-2 flex-shrink-0 animate-pulse rounded-full bg-sky-500" />
          {chain.map((id, index) => {
            const isLast = index === chain.length - 1;
            return (
              <span key={id} className="flex flex-shrink-0 items-center gap-1">
                {index > 0 && <span className="text-slate-300 dark:text-slate-600">›</span>}
                <button
                  type="button"
                  onClick={() => openPerson(id)}
                  className={
                    isLast
                      ? "whitespace-nowrap font-semibold text-slate-900 dark:text-white"
                      : "whitespace-nowrap text-slate-500 transition hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-300"
                  }
                >
                  {nameById.get(id) ?? "Unknown"}
                </button>
              </span>
            );
          })}
          <button
            type="button"
            onClick={() => clearSelection()}
            className="ml-1 flex-shrink-0 rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600 transition hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20"
          >
            Exit
          </button>
        </nav>
      )}

      {focusedId && !teamTreeRoot && (
        <div
          aria-label={`${focusedName}'s relationship truth`}
          className="motion-context-bar pointer-events-auto flex max-w-[88vw] flex-wrap items-center justify-center gap-1.5 rounded-2xl border border-sky-200 bg-white/95 px-2.5 py-1.5 text-xs shadow-lg ring-1 ring-sky-100 backdrop-blur dark:border-sky-400/20 dark:bg-slate-900/95 dark:ring-sky-400/10"
        >
          <span className="whitespace-nowrap text-[10px] font-bold uppercase tracking-wide text-sky-700 dark:text-sky-200">
            Relationship
          </span>
          <span className="h-4 w-px flex-shrink-0 bg-sky-100 dark:bg-sky-400/20" />
          {directReportIds.length > 0 ? (
            <button
              type="button"
              onClick={() => openPerson(focusedId)}
              title={`Open ${focusedName}'s organization`}
              className="max-w-[12rem] truncate rounded-full px-2 py-0.5 font-semibold text-slate-900 transition hover:bg-sky-50 hover:text-sky-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 dark:text-white dark:hover:bg-sky-500/15 dark:hover:text-sky-100"
            >
              {focusedName}
            </button>
          ) : (
            <span className="max-w-[12rem] truncate font-semibold text-slate-900 dark:text-white">
              {focusedName}
            </span>
          )}
          <TruthPill
            label="Reports to"
            value={managerName ?? "Top of chain"}
            tone="sky"
            onClick={managerId ? () => openPerson(managerId) : undefined}
          />
          <TruthPill label="Directs" value={directReportSummary} tone="emerald" />
          {orgSizeSummary && (
            <TruthPill label="Org size" value={orgSizeSummary} tone="emerald" />
          )}
          {supportPod && (
            <TruthPill
              label="Pod"
              value={supportPod.service === supportPod.label ? supportPod.label : `${supportPod.service} / ${supportPod.label}`}
              tone="violet"
            />
          )}
          {peerIds.length > 0 && (
            <TruthPill label="Peers" value={`${peerIds.length} under ${managerName}`} tone="slate" />
          )}
          {matrixRelationships.length > 0 && (
            <TruthPill
              label="Support"
              value={`${matrixRelationships.length} dotted/sponsor`}
              tone="amber"
            />
          )}
          {directReportPreviewIds.map((id) => {
            const person = nodeById.get(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => openPerson(id)}
                title={
                  (childMap[id]?.length ?? 0) > 0
                    ? `Focus ${person?.name ?? "this person"}; click their name next to open their organization`
                    : person?.attributes.title
                }
                className="max-w-[9rem] truncate rounded-full bg-sky-50 px-2.5 py-1 font-semibold text-sky-800 transition hover:bg-sky-100 dark:bg-sky-500/15 dark:text-sky-100 dark:hover:bg-sky-500/25"
              >
                {person?.name ?? "Unknown"}
              </button>
            );
          })}
          {remainingDirectReports > 0 && (
            <button
              type="button"
              onClick={() => setExpandedReportFocusId(focusedId)}
              className="rounded-full bg-sky-100 px-2.5 py-1 font-semibold text-sky-900 transition hover:bg-sky-200 dark:bg-sky-500/20 dark:text-sky-100 dark:hover:bg-sky-500/30"
            >
              +{remainingDirectReports} more reports
            </button>
          )}
          {directReportIds.length > 0 && (
            <button
              type="button"
              onClick={() => onOpenTeamTree(focusedId)}
              className="rounded-full bg-slate-900 px-2.5 py-1 font-semibold text-white shadow-sm transition hover:bg-slate-700 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              {teamTreeRootId === focusedId ? "Refit org" : "Open org"}
            </button>
          )}
          <button
            type="button"
            onClick={() => openEditor(focusedId)}
            className="rounded-full bg-white px-2.5 py-1 font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 dark:bg-slate-950 dark:text-slate-100 dark:ring-white/10 dark:hover:bg-slate-800"
          >
            Edit details
          </button>
          {matrixRelationships.slice(0, 2).map((relationship) => (
            <button
              key={relationship.id}
              type="button"
              onClick={() => openPerson(relationship.otherId)}
              className="max-w-[10rem] truncate rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-800 ring-1 ring-amber-100 transition hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-100 dark:ring-amber-400/20 dark:hover:bg-amber-500/25"
            >
              {relationship.type}: {relationship.otherName}
            </button>
          ))}
          {matrixRelationships.length > 2 && (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-800 ring-1 ring-amber-100 dark:bg-amber-500/15 dark:text-amber-100 dark:ring-amber-400/20">
              +{matrixRelationships.length - 2} matrix
            </span>
          )}
        </div>
      )}

      {teamTreeRoot && (
        <div className="motion-context-bar pointer-events-auto flex max-w-[88vw] items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs shadow-lg ring-1 ring-emerald-100 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:ring-emerald-400/10">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
          <span className="font-semibold text-emerald-900 dark:text-emerald-100">
            {viewContext?.kind === "operating-view"
              ? "Official view"
              : viewContext?.kind === "unit"
              ? "Team view"
              : "Org view"}
          </span>
          <span className="text-emerald-700 dark:text-emerald-200/85">
            {viewContext?.kind === "operating-view"
              ? `${viewContext.label} · rooted at ${teamTreeRoot.name}`
              : viewContext?.kind === "unit"
              ? `${viewContext.label} team · rooted at ${teamTreeRoot.name}`
              : `Viewing organization for ${teamTreeRoot.name}`}
          </span>
          {viewContext?.kind === "operating-view" && viewContext.owner && (
            <span className="rounded-full bg-white/80 px-2 py-0.5 font-semibold text-emerald-800 ring-1 ring-emerald-100 dark:bg-slate-900 dark:text-emerald-100 dark:ring-emerald-400/20">
              Owner: {viewContext.owner}
            </span>
          )}
          {viewContext?.kind === "operating-view" && viewContext.publishedAt && (
            <span className="rounded-full bg-white/80 px-2 py-0.5 font-semibold text-emerald-800 ring-1 ring-emerald-100 dark:bg-slate-900 dark:text-emerald-100 dark:ring-emerald-400/20">
              Published {viewContext.publishedAt}
            </span>
          )}
          {teamLayoutControls?.dirty && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800 ring-1 ring-amber-200 dark:bg-amber-500/20 dark:text-amber-100 dark:ring-amber-300/20">
              Unsaved changes
            </span>
          )}
          {!teamLayoutControls?.dirty && teamLayoutControls?.saved && (
            <span className="rounded-full bg-white/80 px-2 py-0.5 font-semibold text-emerald-800 ring-1 ring-emerald-100 dark:bg-slate-900 dark:text-emerald-100 dark:ring-emerald-400/20">
              Saved layout
            </span>
          )}
          {teamLayoutControls?.dirty && (
            <button
              type="button"
              onClick={teamLayoutControls.onSave}
              className="rounded-full bg-slate-900 px-2.5 py-0.5 font-semibold text-white shadow-sm transition hover:bg-slate-700 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              Save changes
            </button>
          )}
          {(teamLayoutControls?.dirty || teamLayoutControls?.saved) && (
            <button
              type="button"
              onClick={teamLayoutControls.onReset}
              className="rounded-full bg-white px-2.5 py-0.5 font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-100 dark:bg-slate-900 dark:text-emerald-100 dark:hover:bg-slate-800"
            >
              Reset arrangement
            </button>
          )}
          <button
            type="button"
            onClick={onExitTeamTree}
            title="Return to the broader map"
            className="rounded-full bg-white px-2.5 py-0.5 font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-100 dark:bg-slate-900 dark:text-emerald-100 dark:hover:bg-slate-800"
          >
            Back to broader view
          </button>
        </div>
      )}

      {subsetActive && (
        <div className="motion-context-bar pointer-events-auto flex max-w-[88vw] flex-wrap items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/95 px-3 py-1.5 text-xs text-slate-700 shadow-lg ring-1 ring-slate-100 backdrop-blur dark:border-white/10 dark:bg-white/95 dark:text-slate-700 dark:ring-slate-200">
          <span className="font-semibold text-slate-950 dark:text-slate-950">{contextTitle}</span>
          <span className="text-slate-500 dark:text-slate-500">{descriptors.join(" · ")}</span>
          {viewContext?.owner && (
            <TruthPill label="Owner" value={viewContext.owner} tone="emerald" />
          )}
          {viewContext?.publishedAt && (
            <TruthPill label="Published" value={viewContext.publishedAt} tone="emerald" />
          )}
          {operatingViewSummary && (
            <>
              <TruthPill label="Core team" value={`${operatingViewSummary.dedicatedCount} primary`} tone="sky" />
              <TruthPill label="Shared support" value={`${operatingViewSummary.broadSupportCount} supporting`} tone="violet" />
              <TruthPill label="Pods" value={`${operatingViewSummary.podCount} support pods`} tone="violet" />
            </>
          )}
          {viewContext?.kind === "operating-view" && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-100 dark:text-slate-700 dark:ring-slate-200">
              Reporting lines stay formal
            </span>
          )}
          {viewContext?.kind === "operating-view" && officialLayoutControls?.canManage && officialLayoutControls.dirty && (
            <span className="rounded-full bg-white px-2.5 py-1 font-bold text-amber-800 ring-1 ring-amber-200 dark:bg-slate-950 dark:text-amber-100 dark:ring-amber-400/20">
              Unsaved changes
            </span>
          )}
          {viewContext?.kind === "operating-view" && !officialLayoutControls?.dirty && officialLayoutControls?.saved && (
            <span className="rounded-full bg-white px-2.5 py-1 font-bold text-emerald-800 ring-1 ring-emerald-100 dark:bg-slate-950 dark:text-emerald-100 dark:ring-emerald-400/20">
              Saved layout{officialLayoutControls.publishedAt ? ` · ${officialLayoutControls.publishedAt}` : ""}
            </span>
          )}
          {viewContext?.kind === "operating-view" && officialLayoutControls?.canManage && officialLayoutControls.dirty && (
            <>
              <button
                type="button"
                onClick={officialLayoutControls.onPublish}
                className="rounded-full bg-slate-900 px-2.5 py-1 font-semibold text-white shadow-sm transition hover:bg-slate-700 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                Save changes
              </button>
              <button
                type="button"
                onClick={officialLayoutControls.onDiscard}
                className="rounded-full bg-white px-2.5 py-1 font-semibold text-amber-700 shadow-sm ring-1 ring-amber-100 transition hover:bg-amber-100 dark:bg-slate-900 dark:text-amber-200 dark:ring-amber-400/20 dark:hover:bg-slate-800"
              >
                Discard draft
              </button>
            </>
          )}
          {viewContext?.kind === "operating-view" && officialLayoutControls?.canManage && (officialLayoutControls.dirty || officialLayoutControls.saved) && (
            <button
              type="button"
              onClick={officialLayoutControls.onReset}
              className="rounded-full bg-white px-2.5 py-1 font-semibold text-amber-700 shadow-sm ring-1 ring-amber-100 transition hover:bg-amber-100 dark:bg-slate-900 dark:text-amber-200 dark:ring-amber-400/20 dark:hover:bg-slate-800"
            >
              Reset arrangement
            </button>
          )}
          <button
            type="button"
            onClick={onResetView}
            className="rounded-full bg-slate-950 px-2.5 py-0.5 font-semibold text-white shadow-sm transition hover:bg-slate-700 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            Reset view
          </button>
        </div>
      )}
    </div>
  );
}
