'use client';

import { useMemo } from "react";
import { Cross2Icon } from "@radix-ui/react-icons";
import { useGraphStore } from "@/store/graph-store";
import { computeOrgMetrics } from "@/lib/graph/org-metrics";

type OrgHealthPanelProps = {
  open: boolean;
  onClose: () => void;
};

const Stat = ({ label, value, tone }: { label: string; value: string | number; tone?: string }) => (
  <div className="flex flex-col rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-slate-900/60">
    <span className={`text-xl font-bold ${tone ?? "text-slate-900 dark:text-white"}`}>{value}</span>
    <span className="text-[10px] uppercase tracking-wide text-slate-400">{label}</span>
  </div>
);

export function OrgHealthPanel({ open, onClose }: OrgHealthPanelProps) {
  const nodes = useGraphStore((state) => state.document.nodes);
  const edges = useGraphStore((state) => state.document.edges);
  const lens = useGraphStore((state) => state.document.lens);
  const setLensFilters = useGraphStore((state) => state.setLensFilters);

  const metrics = useMemo(() => computeOrgMetrics(nodes, edges), [nodes, edges]);

  const highlight = (ids: string[]) => {
    if (ids.length === 0) return;
    setLensFilters(lens, { focusIds: ids });
  };
  const clearHighlight = () => setLensFilters(lens, { focusIds: [] });

  if (!open) return null;

  const findings: Array<{
    key: string;
    label: string;
    detail: string;
    count: number;
    ids: string[];
    tone: string;
  }> = [
    {
      key: "overloaded",
      label: "Overloaded managers",
      detail: `More than 8 direct reports — span outliers (max ${metrics.spanMax})`,
      count: metrics.overloadedManagers.length,
      ids: metrics.overloadedManagers.map((m) => m.id),
      tone: "text-rose-600",
    },
    {
      key: "heavy",
      label: "Heavy matrix load",
      detail: "In 2+ brands and 2+ channels — conflicting-priorities / burnout risk",
      count: metrics.heavyMatrix.length,
      ids: metrics.heavyMatrix,
      tone: "text-amber-600",
    },
    {
      key: "thin",
      label: "Single-report managers",
      detail: "Exactly one report — candidate layers to flatten",
      count: metrics.thinManagers.length,
      ids: metrics.thinManagers.map((m) => m.id),
      tone: "text-indigo-600",
    },
    {
      key: "deep",
      label: "Deepest reports",
      detail: `Six or more levels below the CEO (org is ${metrics.maxDepth} deep)`,
      count: metrics.deepReports.length,
      ids: metrics.deepReports,
      tone: "text-slate-600 dark:text-slate-300",
    },
  ];

  return (
    <div className="absolute right-4 top-4 bottom-4 z-40 flex w-[360px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-white/10">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          Org Health X-ray
        </h3>
        <button
          onClick={onClose}
          aria-label="Close"
          className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
        >
          <Cross2Icon className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="People" value={metrics.totalPeople} />
          <Stat label="Managers" value={metrics.managerCount} />
          <Stat label="Median span" value={metrics.spanMedian} />
        </div>

        <p className="mt-5 mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Findings — click to isolate on canvas
        </p>
        <div className="flex flex-col gap-2">
          {findings.map((finding) => (
            <button
              key={finding.key}
              type="button"
              disabled={finding.count === 0}
              onClick={() => highlight(finding.ids)}
              className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left transition hover:border-sky-300 hover:bg-sky-50/60 disabled:cursor-default disabled:opacity-50 dark:border-white/10 dark:bg-slate-900/50 dark:hover:border-sky-400/40 dark:hover:bg-sky-500/10"
            >
              <span className={`mt-0.5 min-w-[2rem] text-2xl font-bold tabular-nums ${finding.tone}`}>
                {finding.count}
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {finding.label}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{finding.detail}</span>
              </span>
            </button>
          ))}
        </div>

        {/* Coverage gaps — empty brand × channel intersections */}
        <p className="mt-5 mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Coverage gaps — brand × channel with nobody
        </p>
        {metrics.coverageGaps.length === 0 ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300">
            Every brand × channel intersection has coverage.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {metrics.coverageGaps.map((gap) => (
              <span
                key={`${gap.brand}-${gap.channel}`}
                className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-medium text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300"
              >
                {gap.brand} × {gap.channel}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 px-4 py-3 dark:border-white/10">
        <button
          type="button"
          onClick={clearHighlight}
          className="w-full rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20"
        >
          Clear highlight
        </button>
      </div>
    </div>
  );
}
