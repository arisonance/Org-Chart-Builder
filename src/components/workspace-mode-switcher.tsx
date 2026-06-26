'use client';

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

  return (
    <div
      className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1 text-xs font-semibold shadow-sm dark:border-white/10 dark:bg-slate-800"
      aria-label="Workspace mode"
    >
      {MODES.map((item) => {
        const Icon = item.icon;
        const active = mode === item.id;
        return (
          <button
            key={item.id}
            type="button"
            title={item.title}
            onClick={() => setMode(item.id)}
            className={[
              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300",
              active
                ? "bg-white text-slate-950 shadow-sm dark:bg-slate-950 dark:text-white"
                : "text-slate-500 hover:bg-white/70 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white",
            ].join(" ")}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
