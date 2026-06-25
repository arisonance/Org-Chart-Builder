'use client';

import { ReaderIcon } from "@radix-ui/react-icons";
import { PUBLISHED_OPERATING_VIEWS } from "@/lib/schema/operating-views";
import { useGraphStore } from "@/store/graph-store";

export function PublishedViewSwitcher() {
  const activeOperatingViewId = useGraphStore((state) => state.activeOperatingViewId);
  const requestOperatingView = useGraphStore((state) => state.requestOperatingView);
  const activeView = PUBLISHED_OPERATING_VIEWS.find((view) => view.id === activeOperatingViewId);

  return (
    <label
      className="inline-flex min-w-[15rem] items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900 shadow-sm dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-100"
      title={activeView?.description ?? "Choose an official operating view"}
    >
      <ReaderIcon className="h-4 w-4 shrink-0" aria-hidden />
      <span className="sr-only">Published operating view</span>
      <span className="hidden text-[10px] font-bold uppercase tracking-wide text-emerald-600/80 xl:inline dark:text-emerald-200/70">
        Official
      </span>
      <select
        value={activeOperatingViewId ?? ""}
        onChange={(event) => requestOperatingView(event.target.value)}
        className="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none"
        aria-label="Choose published operating view"
      >
        <option value="" disabled>
          Choose official view
        </option>
        {PUBLISHED_OPERATING_VIEWS.map((view) => (
          <option key={view.id} value={view.id}>
            {view.label}
          </option>
        ))}
      </select>
    </label>
  );
}
