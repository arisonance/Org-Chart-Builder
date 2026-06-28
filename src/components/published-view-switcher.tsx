'use client';

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { CheckIcon, ChevronDownIcon, ReaderIcon } from "@radix-ui/react-icons";
import { PUBLISHED_OPERATING_VIEWS } from "@/lib/schema/operating-views";
import { useGraphStore } from "@/store/graph-store";

export function PublishedViewSwitcher() {
  const activeOperatingViewId = useGraphStore((state) => state.activeOperatingViewId);
  const requestOperatingView = useGraphStore((state) => state.requestOperatingView);
  const activeView = PUBLISHED_OPERATING_VIEWS.find((view) => view.id === activeOperatingViewId);
  const statusText = activeView ? `${activeView.owner} · ${activeView.publishedAt}` : "Choose an official view";

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="inline-flex h-10 min-w-[12rem] max-w-[18rem] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-left text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          title={activeView ? `${activeView.description} ${statusText}` : statusText}
          aria-label="Choose published operating view"
        >
          <ReaderIcon className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-bold leading-tight text-slate-950 dark:text-white">
              {activeView?.label ?? "Official views"}
            </span>
          </span>
          <ChevronDownIcon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={8}
          className="z-50 w-[min(24rem,calc(100vw_-_2rem))] rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-slate-900"
        >
          <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Official views
          </div>
          {PUBLISHED_OPERATING_VIEWS.map((view) => {
            const active = view.id === activeOperatingViewId;
            return (
              <DropdownMenu.Item
                key={view.id}
                onSelect={() => requestOperatingView(view.id)}
                className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-2 text-sm outline-none transition hover:bg-slate-100 data-[highlighted]:bg-slate-100 dark:hover:bg-white/10 dark:data-[highlighted]:bg-white/10"
              >
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                  {active ? <CheckIcon className="h-4 w-4 text-sky-600" aria-hidden /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold text-slate-900 dark:text-white">
                    {view.label}
                  </span>
                  <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {view.owner} · {view.description}
                  </span>
                </span>
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
