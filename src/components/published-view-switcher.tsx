'use client';

import { ChevronDownIcon, ReaderIcon } from "@radix-ui/react-icons";
import { PUBLISHED_OPERATING_VIEWS } from "@/lib/schema/operating-views";
import { useGraphStore } from "@/store/graph-store";

export function PublishedViewSwitcher() {
  const activeOperatingViewId = useGraphStore((state) => state.activeOperatingViewId);
  const requestOperatingView = useGraphStore((state) => state.requestOperatingView);
  const activeView = PUBLISHED_OPERATING_VIEWS.find((view) => view.id === activeOperatingViewId);
  const statusText = activeView
    ? `${activeView.owner} · ${activeView.publishedAt}`
    : "Choose an official view";

  return (
    <label
      className="inline-flex min-w-[15rem] max-w-[20rem] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
      title={activeView ? `${activeView.description} ${statusText}` : statusText}
    >
      <ReaderIcon className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
      <span className="sr-only">Published operating view</span>
      <span className="hidden text-[10px] font-bold uppercase tracking-wide text-slate-500 xl:inline dark:text-slate-400">
        Official
      </span>
      <span className="relative flex min-w-0 flex-1 flex-col pr-5">
        <select
          value={activeOperatingViewId ?? ""}
          onChange={(event) => requestOperatingView(event.target.value)}
          className="min-w-0 appearance-none bg-transparent text-sm font-bold leading-tight text-slate-950 outline-none dark:text-white"
          aria-label="Choose published operating view"
        >
          <option value="" disabled className="bg-white text-slate-500">
            Choose official view
          </option>
          {PUBLISHED_OPERATING_VIEWS.map((view) => (
            <option key={view.id} value={view.id} className="bg-white text-slate-950">
              {view.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-0 top-0.5 h-4 w-4 text-slate-400" aria-hidden />
        <span className="truncate text-[10px] font-semibold text-slate-500 dark:text-slate-400">
          {statusText}
        </span>
      </span>
    </label>
  );
}
