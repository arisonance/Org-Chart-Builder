'use client';

import { useMemo } from "react";
import { useGraphStore } from "@/store/graph-store";
import { LENS_BY_ID } from "@/lib/schema/lenses";

/**
 * Top-center "you are here" strip. Two modes, mutually exclusive:
 *  - A single selected person → a clickable manager-chain breadcrumb
 *    (CEO › VP › … › Person) so you always know where they sit, with an Exit.
 *  - An active view subset (search / filter / focus presets) → a chip that
 *    names what's narrowing the canvas, plus one-click Reset view.
 * When neither applies it renders nothing, keeping the resting canvas clean.
 */
export function CanvasContextBar({ onResetView }: { onResetView: () => void }) {
  const lens = useGraphStore((s) => s.document.lens);
  const nodes = useGraphStore((s) => s.document.nodes);
  const edges = useGraphStore((s) => s.document.edges);
  const selection = useGraphStore((s) => s.selection);
  const filters = useGraphStore((s) => s.document.lens_state[s.document.lens]?.filters);
  const selectNode = useGraphStore((s) => s.selectNode);
  const clearSelection = useGraphStore((s) => s.clearSelection);

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    nodes.forEach((node) => {
      if (node.kind === "person") map.set(node.id, node.name);
    });
    return map;
  }, [nodes]);

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

  const focusedId = selection.nodeIds.length === 1 ? selection.nodeIds[0] : null;

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

  const focusIds = filters?.focusIds ?? [];
  const activeTokens = filters?.activeTokens ?? [];
  const hiddenIds = filters?.hiddenIds ?? [];

  // A single-person selection drives focus highlighting (the breadcrumb), not a
  // subset filter — so only treat focusIds as a "subset" when nothing's selected.
  const descriptors: string[] = [];
  if (focusIds.length > 0 && !focusedId) {
    descriptors.push(`Showing ${focusIds.length} ${focusIds.length === 1 ? "person" : "people"}`);
  }
  if (activeTokens.length > 0) descriptors.push(`Filtered: ${activeTokens.join(", ")}`);
  if (hiddenIds.length > 0) descriptors.push(`${hiddenIds.length} hidden`);
  const subsetActive = descriptors.length > 0;

  if (!focusedId && !subsetActive) return null;

  return (
    <div className="pointer-events-none absolute left-1/2 top-4 z-30 flex max-w-[88vw] -translate-x-1/2 flex-col items-center gap-2">
      {focusedId && (
        <nav
          aria-label="Reporting chain"
          className="pointer-events-auto flex max-w-[88vw] items-center gap-1 overflow-x-auto rounded-full border border-sky-200 bg-white px-3 py-1.5 text-xs shadow-lg ring-1 ring-sky-100 dark:border-sky-400/20 dark:bg-slate-900 dark:ring-sky-400/10"
        >
          <span className="inline-flex h-2 w-2 flex-shrink-0 animate-pulse rounded-full bg-sky-500" />
          {chain.map((id, index) => {
            const isLast = index === chain.length - 1;
            return (
              <span key={id} className="flex flex-shrink-0 items-center gap-1">
                {index > 0 && <span className="text-slate-300 dark:text-slate-600">›</span>}
                <button
                  type="button"
                  onClick={() => selectNode(id)}
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

      {subsetActive && (
        <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs shadow-lg dark:border-amber-400/20 dark:bg-amber-500/10">
          <span className="font-semibold text-amber-700 dark:text-amber-200">
            {LENS_BY_ID[lens].label}
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
