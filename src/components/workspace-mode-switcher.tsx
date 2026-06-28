'use client';

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { EyeOpenIcon, Pencil1Icon, RocketIcon } from "@radix-ui/react-icons";
import { useGraphStore, type WorkspaceMode } from "@/store/graph-store";

const MODES: Array<{
  id: WorkspaceMode;
  label: string;
  title: string;
  icon: typeof EyeOpenIcon;
}> = [
  {
    id: "explore",
    label: "Explore",
    title: "Read-only navigation. Click people to understand the map.",
    icon: EyeOpenIcon,
  },
  {
    id: "edit",
    label: "Edit",
    title: "Admin editing. Move cards, open details, and change the org data.",
    icon: Pencil1Icon,
  },
  {
    id: "publish",
    label: "Publish",
    title: "Owner review. Prepare an official view for employees.",
    icon: RocketIcon,
  },
];

export function WorkspaceModeSwitcher() {
  const mode = useGraphStore((state) => state.workspaceMode);
  const setMode = useGraphStore((state) => state.setWorkspaceMode);
  const activeMode = MODES.find((item) => item.id === mode) ?? MODES[0];
  const ActiveIcon = activeMode.icon;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          title={activeMode.title}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          aria-label="Choose workspace mode"
        >
          <ActiveIcon className="h-4 w-4 text-slate-500 dark:text-slate-400" aria-hidden />
          <span>{activeMode.label}</span>
          <span className="text-xs text-slate-400" aria-hidden>▼</span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={8}
          className="z-50 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-slate-900"
        >
          <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Mode
          </div>
          {MODES.map((item) => {
            const Icon = item.icon;
            const active = mode === item.id;
            return (
              <DropdownMenu.Item
                key={item.id}
                onSelect={() => setMode(item.id)}
                className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-2 text-sm outline-none transition hover:bg-slate-100 data-[highlighted]:bg-slate-100 dark:hover:bg-white/10 dark:data-[highlighted]:bg-white/10"
              >
                <Icon className={["mt-0.5 h-4 w-4 shrink-0", active ? "text-sky-600" : "text-slate-400"].join(" ")} aria-hidden />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-bold text-slate-900 dark:text-white">{item.label}</span>
                  <span className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {item.title}
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
