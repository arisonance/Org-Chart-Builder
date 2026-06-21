'use client';

import { memo } from "react";
import { useStore } from "@xyflow/react";

export type LaneNodeData = {
  label: string;
  color: string;
  count: number;
  crossAssigned: number;
  vacancies: number;
  tiers: { label: string; count: number }[];
};

function Component({ data }: { data: LaneNodeData }) {
  const { label, color, count, crossAssigned, vacancies, tiers } = data;

  // Read live zoom from the store so counter-scaling re-renders only this
  // (memoized) lane, never the whole Node[] array.
  const zoom = useStore((s) => s.transform[2]);
  // Counter-scale the header so lane names stay readable when zoomed out
  const safeZoom = Math.max(zoom || 1, 0.15);
  const headerFont = Math.min(76, 20 / safeZoom);
  const chipFont = Math.min(42, 11 / safeZoom);
  const tierFont = Math.min(38, 12 / safeZoom);
  const dotSize = Math.min(40, 12 / safeZoom);

  return (
    <div
      className="lane-fade-in pointer-events-none h-full w-full rounded-3xl border-2 border-dashed"
      style={{
        borderColor: `${color}55`,
        background: `${color}0d`,
      }}
    >
      <div className="flex flex-wrap items-center gap-3 px-6 pt-4">
        <span
          className="rounded-full"
          style={{ background: color, width: dotSize, height: dotSize }}
        />
        <span
          className="font-bold uppercase tracking-wide"
          style={{ color, fontSize: headerFont, lineHeight: 1.1 }}
        >
          {label}
        </span>
        <span
          className="rounded-full bg-white/85 px-3 py-1 font-semibold text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900/80 dark:text-slate-300 dark:ring-white/10"
          style={{ fontSize: chipFont }}
        >
          {count} {count === 1 ? "person" : "people"}
        </span>
        {crossAssigned > 0 && (
          <span
            className="rounded-full bg-indigo-50/90 px-3 py-1 font-semibold text-indigo-600 ring-1 ring-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-indigo-400/20"
            style={{ fontSize: chipFont }}
          >
            {crossAssigned} cross-assigned
          </span>
        )}
        {vacancies > 0 && (
          <span
            className="rounded-full bg-amber-50/90 px-3 py-1 font-semibold text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-400/20"
            style={{ fontSize: chipFont }}
          >
            {vacancies} open {vacancies === 1 ? "role" : "roles"}
          </span>
        )}
      </div>
      {/* Tier mix: the lane's leadership shape at a glance */}
      {tiers.length > 0 && (
        <div
          className="flex flex-wrap items-center gap-x-2 gap-y-1 px-6 pt-2 font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
          style={{ fontSize: tierFont }}
        >
          {tiers.map((tier, i) => (
            <span key={tier.label} className="flex items-center gap-2">
              {i > 0 && <span className="text-slate-300 dark:text-slate-600">·</span>}
              <span style={{ color }}>{tier.count}</span> {tier.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export const LaneNode = memo(Component);
