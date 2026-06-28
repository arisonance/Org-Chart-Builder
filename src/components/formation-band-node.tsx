'use client';

import { memo } from "react";

export type FormationBandNodeData = {
  label: string;
  count: number;
  color: string;
};

function Component({ data }: { data: FormationBandNodeData }) {
  const { label, count, color } = data;

  return (
    <div
      className="lane-fade-in pointer-events-none h-full w-full rounded-2xl border border-dashed"
      style={{ borderColor: `${color}44`, background: `${color}0a` }}
    >
      <div className="flex items-center gap-2 px-4 py-2">
        <span className="h-2 w-2 rounded-full" style={{ background: color }} aria-hidden />
        <span className="text-[12px] font-bold uppercase tracking-wide" style={{ color }}>
          {label}
        </span>
        <span className="rounded-full bg-white/85 px-2 py-0.5 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200 dark:bg-slate-950/85 dark:text-slate-300 dark:ring-white/10">
          {count}
        </span>
      </div>
    </div>
  );
}

export const FormationBandNode = memo(Component);
