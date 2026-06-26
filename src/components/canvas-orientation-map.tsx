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
    <div className="pointer-events-none absolute left-1/2 top-16 z-30 w-[min(72rem,calc(100vw-2rem))] -translate-x-1/2">
      <div
        className="motion-context-bar pointer-events-auto relative rounded-2xl border border-slate-200 bg-white/96 px-3 py-2.5 shadow-md ring-1 ring-slate-100 backdrop-blur dark:border-white/10 dark:bg-white/95 dark:ring-slate-200"
        title={detail}
      >
        <div className="flex max-w-full flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 px-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-500">
                Current view
              </span>
              <span className="max-w-[16rem] truncate whitespace-nowrap text-sm font-bold text-slate-900 dark:text-slate-900">
                {title}
              </span>
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                {stats.slice(0, 3).map((stat) => (
                  <span
                    key={stat}
                    className="max-w-[10rem] shrink-0 truncate rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-100 dark:text-slate-500"
                  >
                    {stat}
                  </span>
                ))}
              </div>
            </div>
            <p className="mt-0.5 hidden max-w-[38rem] truncate text-[11px] font-medium text-slate-500 md:block dark:text-slate-500">
              {detail}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-start gap-1.5 lg:justify-end">
            {chips.length > 0 && (
              <button
                type="button"
                onClick={() => setGroupsOpen((open) => !open)}
                aria-expanded={groupsOpen}
                className="whitespace-nowrap rounded-full bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 dark:bg-slate-50 dark:text-slate-700 dark:ring-slate-200 dark:hover:bg-white"
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
                  "whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-bold shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300",
                  action.tone === "dark"
                    ? "bg-slate-950 text-white hover:bg-slate-700"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-white dark:text-slate-600 dark:ring-slate-200 dark:hover:bg-slate-50",
                ].join(" ")}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
        {groupsOpen && chips.length > 0 && (
          <div className="absolute right-0 top-[calc(100%+0.5rem)] w-[min(30rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white/96 p-2 shadow-xl ring-1 ring-slate-100 backdrop-blur dark:border-white/10 dark:bg-white/95 dark:ring-slate-200">
            <div className="mb-1 flex items-center justify-between gap-2 px-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-500">
                Focus a group
              </span>
              <button
                type="button"
                onClick={() => setGroupsOpen(false)}
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-100 dark:hover:text-slate-600"
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
                    <span className="rounded-full bg-white/70 px-1.5 py-0 text-[9px] font-bold text-slate-500 ring-1 ring-slate-200 dark:bg-white dark:text-slate-500 dark:ring-slate-200">
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
                "inline-flex max-w-[14rem] items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200 transition dark:bg-slate-50 dark:text-slate-700 dark:ring-slate-200";
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
                  className={`${className} hover:bg-white hover:shadow-sm dark:hover:bg-white`}
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
