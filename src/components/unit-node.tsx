'use client';

import { memo } from "react";
import { ChevronDownIcon, ChevronRightIcon, ArrowTopRightIcon } from "@radix-ui/react-icons";
import type { ComputedUnit } from "@/lib/graph/org-units";

export type UnitNodeData = {
  unit: ComputedUnit;
  expanded: boolean;
  onToggleExpand: (unitId: string) => void;
  onJump: (unitId: string) => void;
  onSelectMember: (personId: string) => void;
};

// Facilities read as buildings; shared services as a hub.
const TYPE_STYLE = {
  facility: {
    badge: "Facility",
    glyph: "🏭",
    accent: "#0f766e", // teal
    chip: "bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-200",
    ring: "ring-teal-200 dark:ring-teal-400/20",
  },
  "shared-service": {
    badge: "Shared Service",
    glyph: "🔗",
    accent: "#7c3aed", // violet
    chip: "bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200",
    ring: "ring-violet-200 dark:ring-violet-400/20",
  },
} as const;

function Component({ data }: { data: UnitNodeData }) {
  const { unit, expanded, onToggleExpand, onJump, onSelectMember } = data;
  const style = TYPE_STYLE[unit.def.type];
  const count = unit.members.length;

  return (
    <div
      className={`w-[18rem] overflow-hidden rounded-2xl border-2 border-dashed bg-white/95 shadow-lg ring-1 ${style.ring} dark:bg-slate-950/85`}
      style={{ borderColor: style.accent }}
    >
      <div className="flex items-start gap-3 px-4 pt-4">
        <span className="text-2xl leading-none" aria-hidden>
          {style.glyph}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${style.chip}`}>
              {style.badge}
            </span>
          </div>
          <p className="mt-1 truncate text-sm font-bold text-slate-900 dark:text-slate-50">
            {unit.def.label}
          </p>
          <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{unit.def.serves}</p>
        </div>
      </div>

      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
          {count} {count === 1 ? "person" : "people"}
          {unit.lead ? <span className="font-normal text-slate-400"> · led by {unit.lead.name}</span> : null}
        </span>
      </div>

      {/* Inline expand: a roster peek without cluttering the lanes */}
      {expanded && (
        <div className="max-h-56 overflow-y-auto border-t border-slate-100 bg-slate-50/70 px-2 py-1 dark:border-white/10 dark:bg-white/5">
          {unit.members.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelectMember(m.id)}
              className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1 text-left hover:bg-white dark:hover:bg-white/10"
            >
              <span className="truncate text-[11px] font-medium text-slate-700 dark:text-slate-200">{m.name}</span>
              <span className="truncate text-[10px] text-slate-400">{m.attributes.title}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex divide-x divide-slate-100 border-t border-slate-100 text-[11px] font-semibold dark:divide-white/10 dark:border-white/10">
        <button
          type="button"
          onClick={() => onToggleExpand(unit.def.id)}
          className="flex flex-1 items-center justify-center gap-1 py-2.5 text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5"
        >
          {expanded ? <ChevronDownIcon className="h-3.5 w-3.5" /> : <ChevronRightIcon className="h-3.5 w-3.5" />}
          {expanded ? "Hide people" : "Show people"}
        </button>
        <button
          type="button"
          onClick={() => onJump(unit.def.id)}
          className="flex flex-1 items-center justify-center gap-1 py-2.5 text-sky-600 transition hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-500/10"
        >
          Open in chart
          <ArrowTopRightIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export const UnitNode = memo(Component);
