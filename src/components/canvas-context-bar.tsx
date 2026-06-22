'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import { useGraphStore } from "@/store/graph-store";
import { LENS_BY_ID } from "@/lib/schema/lenses";
import type { PersonNode } from "@/lib/schema/types";
import { getSharedServiceGroupForPerson } from "@/lib/graph/shared-service-groups";

type ViewContext = {
  kind: "support-pod" | "shared-services" | "unit" | "lens-group";
  label: string;
  count: number;
};

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
  viewContext,
}: {
  onResetView: () => void;
  onOpenTeamTree: (nodeId: string) => void;
  teamTreeRootId: string | null;
  onExitTeamTree: () => void;
  viewContext: ViewContext | null;
}) {
  const lens = useGraphStore((s) => s.document.lens);
  const nodes = useGraphStore((s) => s.document.nodes);
  const edges = useGraphStore((s) => s.document.edges);
  const selection = useGraphStore((s) => s.selection);
  const filters = useGraphStore((s) => s.document.lens_state[s.document.lens]?.filters);
  const selectNode = useGraphStore((s) => s.selectNode);
  const clearSelection = useGraphStore((s) => s.clearSelection);
  const [relationshipDetailsOpen, setRelationshipDetailsOpen] = useState(false);

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
      if ((childMap[id]?.length ?? 0) > 0) {
        onOpenTeamTree(id);
        return;
      }
      selectNode(id);
    },
    [childMap, onOpenTeamTree, selectNode],
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
  const hasRelationshipDetails =
    directReportIds.length > 0 ||
    peerIds.length > 0 ||
    matrixRelationships.length > 0 ||
    Boolean(supportPod);

  const focusIds = filters?.focusIds ?? [];
  const activeTokens = filters?.activeTokens ?? [];
  const hiddenIds = filters?.hiddenIds ?? [];
  const contextTitle =
    viewContext?.kind === "support-pod"
      ? "Support pod"
      : viewContext?.kind === "shared-services"
        ? "Shared services"
        : viewContext?.kind === "unit"
          ? "Unit view"
          : viewContext?.kind === "lens-group"
            ? "Focused group"
            : LENS_BY_ID[lens].label;

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

  useEffect(() => {
    setRelationshipDetailsOpen(false);
  }, [focusedId]);

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
        ? "bg-sky-50 text-sky-800 ring-sky-100 dark:bg-sky-500/15 dark:text-sky-100 dark:ring-sky-400/20"
        : tone === "emerald"
          ? "bg-emerald-50 text-emerald-800 ring-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-100 dark:ring-emerald-400/20"
          : tone === "violet"
            ? "bg-violet-50 text-violet-800 ring-violet-100 dark:bg-violet-500/15 dark:text-violet-100 dark:ring-violet-400/20"
            : tone === "amber"
              ? "bg-amber-50 text-amber-800 ring-amber-100 dark:bg-amber-500/15 dark:text-amber-100 dark:ring-amber-400/20"
              : "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10";
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
      {focusedId && (
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

      {focusedId && (
        <div
          aria-label={`${focusedName}'s relationship truth`}
          className="motion-context-bar pointer-events-auto relative flex max-w-[88vw] items-center gap-1.5 overflow-visible rounded-full border border-sky-200 bg-white/95 px-2.5 py-1.5 text-xs shadow-lg ring-1 ring-sky-100 backdrop-blur dark:border-sky-400/20 dark:bg-slate-900/95 dark:ring-sky-400/10"
        >
          <span className="whitespace-nowrap text-[10px] font-bold uppercase tracking-wide text-sky-700 dark:text-sky-200">
            Relationship truth
          </span>
          <span className="h-4 w-px flex-shrink-0 bg-sky-100 dark:bg-sky-400/20" />
          <span className="max-w-[12rem] truncate font-semibold text-slate-900 dark:text-white">
            {focusedName}
          </span>
          <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto">
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
            {directReportIds.length > 0 && (
              <button
                type="button"
                onClick={() => onOpenTeamTree(focusedId)}
                className="rounded-full bg-slate-900 px-2.5 py-1 font-semibold text-white shadow-sm transition hover:bg-slate-700 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                {teamTreeRootId === focusedId ? "Refit org view" : "Open org view"}
              </button>
            )}
            {hasRelationshipDetails && (
              <button
                type="button"
                aria-expanded={relationshipDetailsOpen}
                onClick={() => setRelationshipDetailsOpen((open) => !open)}
                className="rounded-full bg-white px-2.5 py-1 font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 dark:bg-white/10 dark:text-slate-100 dark:ring-white/10 dark:hover:bg-white/15"
              >
                {relationshipDetailsOpen ? "Hide" : "More"}
              </button>
            )}
          </div>

          {relationshipDetailsOpen && (
            <div className="absolute left-1/2 top-[calc(100%+0.5rem)] z-10 flex w-[min(34rem,calc(100vw-2rem))] -translate-x-1/2 flex-col gap-2 rounded-xl border border-sky-100 bg-white/95 p-3 text-xs shadow-xl ring-1 ring-sky-100 backdrop-blur dark:border-sky-400/20 dark:bg-slate-900/95 dark:ring-sky-400/10">
              <div className="flex flex-wrap items-center gap-1.5">
                {supportPod && (
                  <TruthPill
                    label="Home pod"
                    value={supportPod.service === supportPod.label ? supportPod.label : `${supportPod.service} / ${supportPod.label}`}
                    tone="violet"
                  />
                )}
                {peerIds.length > 0 && (
                  <TruthPill label="Peers" value={`${peerIds.length} under ${managerName}`} tone="slate" />
                )}
                {matrixRelationships.length > 0 && (
                  <TruthPill
                    label="Matrix"
                    value={`${matrixRelationships.length} dotted/sponsor`}
                    tone="amber"
                  />
                )}
              </div>
              {directReportIds.length > 0 && (
                <div>
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Direct reports
                  </div>
                  <div className="flex max-h-20 flex-wrap gap-1.5 overflow-y-auto pr-1">
                    {directReportIds.map((id) => {
                      const person = nodeById.get(id);
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => {
                            setRelationshipDetailsOpen(false);
                            openPerson(id);
                          }}
                          title={
                            (childMap[id]?.length ?? 0) > 0
                              ? `Open ${person?.name ?? "this person"}'s org view`
                              : person?.attributes.title
                          }
                          className="rounded-full bg-sky-50 px-2.5 py-1 font-medium text-sky-800 transition hover:bg-sky-100 dark:bg-sky-500/15 dark:text-sky-100 dark:hover:bg-sky-500/25"
                        >
                          {person?.name ?? "Unknown"}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {(peerIds.length > 0 || matrixRelationships.length > 0) && (
                <div>
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Related people
                  </div>
                  <div className="flex max-h-20 flex-wrap gap-1.5 overflow-y-auto pr-1">
                    {peerIds.map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          setRelationshipDetailsOpen(false);
                          openPerson(id);
                        }}
                        className="rounded-full bg-slate-50 px-2.5 py-1 font-medium text-slate-600 ring-1 ring-slate-200 transition hover:bg-white dark:bg-white/10 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/15"
                      >
                        Peer: {nameById.get(id) ?? "Unknown"}
                      </button>
                    ))}
                    {matrixRelationships.map((relationship) => (
                      <button
                        key={relationship.id}
                        type="button"
                        onClick={() => {
                          setRelationshipDetailsOpen(false);
                          openPerson(relationship.otherId);
                        }}
                        className="rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-800 ring-1 ring-amber-100 transition hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-100 dark:ring-amber-400/20 dark:hover:bg-amber-500/25"
                      >
                        {relationship.type}: {relationship.otherName}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {teamTreeRoot && (
        <div className="motion-context-bar pointer-events-auto flex max-w-[88vw] items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs shadow-lg ring-1 ring-emerald-100 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:ring-emerald-400/10">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
          <span className="font-semibold text-emerald-900 dark:text-emerald-100">
            Org view
          </span>
          <span className="text-emerald-700 dark:text-emerald-200/85">
            {teamTreeRoot.name} is the temporary root
          </span>
          <button
            type="button"
            onClick={onExitTeamTree}
            className="rounded-full bg-white px-2.5 py-0.5 font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-100 dark:bg-slate-900 dark:text-emerald-100 dark:hover:bg-slate-800"
          >
            Exit org view
          </button>
        </div>
      )}

      {subsetActive && (
        <div className="motion-context-bar pointer-events-auto flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs shadow-lg dark:border-amber-400/20 dark:bg-amber-500/10">
          <span className="font-semibold text-amber-700 dark:text-amber-200">
            {contextTitle}
          </span>
          <span className="text-amber-600 dark:text-amber-300/80">{descriptors.join(" · ")}</span>
          <button
            type="button"
            onClick={onResetView}
            className="rounded-full bg-white px-2.5 py-0.5 font-semibold text-amber-700 shadow-sm transition hover:bg-amber-100 dark:bg-slate-900 dark:text-amber-200 dark:hover:bg-slate-800"
          >
            Reset view
          </button>
        </div>
      )}
    </div>
  );
}
