'use client';

import { memo } from "react";

export type LaneNodeData = {
  label: string;
  color: string;
  count: number;
};

function Component({ data }: { data: LaneNodeData }) {
  const { label, color, count } = data;
  return (
    <div
      className="lane-fade-in pointer-events-none h-full w-full rounded-3xl border-2 border-dashed"
      style={{
        borderColor: `${color}55`,
        background: `${color}0d`,
      }}
    >
      <div className="flex items-center gap-2 px-6 pt-4">
        <span
          className="h-3 w-3 rounded-full"
          style={{ background: color }}
        />
        <span
          className="text-lg font-bold uppercase tracking-wide"
          style={{ color }}
        >
          {label}
        </span>
        <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-semibold text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900/80 dark:text-slate-300 dark:ring-white/10">
          {count} {count === 1 ? "person" : "people"}
        </span>
      </div>
    </div>
  );
}

export const LaneNode = memo(Component);
