'use client';

import { useState } from "react";

export type OrientationChip = {
  id: string;
  label: string;
  detail?: string;
  count?: number;
  color?: string;
  onClick?: () => void;
};

export type OrientationAction = {
  id: string;
  label: string;
  onClick: () => void;
  tone?: "dark" | "light";
};

type CanvasOrientationMapProps = {
  title: string;
  detail: string;
  stats: string[];
  chips: OrientationChip[];
  actions: OrientationAction[];
  hidden?: boolean;
};

export function CanvasOrientationMap({
  title,
  detail,
  stats,
  chips,
  actions,
  hidden,
}: CanvasOrientationMapProps) {
  const [groupsOpen, setGroupsOpen] = useState(false);
  if (hidden) return null;

  return (
    <div className="pointer-events-none absolute left-1/2 top-5 z-30 w-[min(46rem,calc(100vw-2rem))] -translate-x-1/2">
      <div className="motion-context-bar pointer-events-auto relative rounded-full border border-slate-200 bg-white/92 px-2.5 py-1.5 shadow-md ring-1 ring-slate-100 backdrop-blur dark:border-white/10 dark:bg-slate-950/90 dark:ring-white/10">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-slate-900 dark:text-white">
              View map
            </span>
            <span className="shrink-0 text-xs font-semibold text-slate-700 dark:text-slate-200">
              {title}
            </span>
            <span className="hidden min-w-0 max-w-[18rem] truncate text-[11px] text-slate-400 2xl:block">
              {detail}
            </span>
            {stats.slice(0, 3).map((stat) => (
              <span
                key={stat}
                className="hidden shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 md:inline-flex dark:bg-white/10 dark:text-slate-300"
              >
                {stat}
              </span>
            ))}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {chips.length > 0 && (
              <button
                type="button"
                onClick={() => setGroupsOpen((open) => !open)}
                aria-expanded={groupsOpen}
                className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 dark:bg-slate-900 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-slate-800"
              >
                Groups
              </button>
            )}
            {actions.slice(0, 5).map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={action.onClick}
                className={[
                  "rounded-full px-2.5 py-1 text-[11px] font-bold shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300",
                  action.tone === "dark"
                    ? "bg-slate-900 text-white hover:bg-slate-700 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-slate-800",
                ].join(" ")}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
        {groupsOpen && chips.length > 0 && (
          <div className="absolute right-0 top-[calc(100%+0.5rem)] w-[min(30rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white/96 p-2 shadow-xl ring-1 ring-slate-100 backdrop-blur dark:border-white/10 dark:bg-slate-950/95 dark:ring-white/10">
            <div className="mb-1 flex items-center justify-between gap-2 px-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Focus a group
              </span>
              <button
                type="button"
                onClick={() => setGroupsOpen(false)}
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-200"
              >
                Close
              </button>
            </div>
            <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto pr-1">
            {chips.map((chip) => {
              const content = (
                <>
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: chip.color ?? "#64748b" }}
                    aria-hidden
                  />
                  <span className="truncate">{chip.label}</span>
                  {chip.count !== undefined && (
                    <span className="rounded-full bg-white/70 px-1.5 py-0 text-[9px] font-bold text-slate-500 ring-1 ring-slate-200 dark:bg-slate-950/60 dark:text-slate-300 dark:ring-white/10">
                      {chip.count}
                    </span>
                  )}
                  {chip.detail && (
                    <span className="hidden max-w-[8rem] truncate text-slate-400 lg:inline">
                      {chip.detail}
                    </span>
                  )}
                </>
              );
              const className =
                "inline-flex max-w-[14rem] items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200 transition dark:bg-white/10 dark:text-slate-200 dark:ring-white/10";
              if (!chip.onClick) {
                return (
                  <span key={chip.id} className={className}>
                    {content}
                  </span>
                );
              }
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => {
                    chip.onClick?.();
                    setGroupsOpen(false);
                  }}
                  title={chip.detail ? `${chip.label}: ${chip.detail}` : chip.label}
                  className={`${className} hover:bg-white hover:shadow-sm dark:hover:bg-white/15`}
                >
                  {content}
                </button>
              );
            })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
