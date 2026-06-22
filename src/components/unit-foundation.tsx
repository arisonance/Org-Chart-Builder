'use client';

import { ArrowTopRightIcon } from "@radix-ui/react-icons";
import type { ComputedUnit } from "@/lib/graph/org-units";
import { groupSharedServicePods } from "@/lib/graph/shared-service-groups";

type UnitFoundationProps = {
  units: ComputedUnit[];
  onJump: (unit: ComputedUnit) => void;
  onOpenSharedServices: () => void;
};

const TYPE_STYLE = {
  facility: { glyph: "🏭", dot: "border-teal-400 bg-teal-50 text-teal-800 dark:bg-teal-500/15 dark:text-teal-200" },
  "shared-service": { glyph: "🔗", dot: "border-violet-400 bg-violet-50 text-violet-800 dark:bg-violet-500/15 dark:text-violet-200" },
} as const;

// A full-width base beneath the brand×channel matrix: these teams aren't a cell in the
// grid, they underpin every channel. Reads as the foundation the matrix rests on.
export function UnitFoundation({ units, onJump, onOpenSharedServices }: UnitFoundationProps) {
  if (units.length === 0) return null;
  const facilities = units.filter((u) => u.def.type === "facility");
  const shared = units.filter((u) => u.def.type === "shared-service");

  const Chip = ({ unit }: { unit: ComputedUnit }) => {
    const style = TYPE_STYLE[unit.def.type];
    const pods =
      unit.def.type === "shared-service"
        ? groupSharedServicePods(unit.members)
        : [];
    const podPreview = pods
      .filter((pod) => pod.label !== unit.def.label)
      .slice(0, 2)
      .map((pod) => pod.label);
    return (
      <button
        type="button"
        onClick={() => onJump(unit)}
        title={`${unit.def.label} — ${unit.members.length} people${pods.length > 1 ? ` across ${pods.length} pods` : ""}. Open in chart`}
        aria-label={`Open ${unit.def.label} in chart, ${unit.members.length} people`}
        className={`flex items-center gap-1.5 rounded-lg border-l-[3px] border border-slate-200 px-2.5 py-1.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow dark:border-white/10 ${style.dot}`}
      >
        <span className="text-sm leading-none" aria-hidden>{style.glyph}</span>
        <span className="flex flex-col leading-tight">
          <span className="text-[11px] font-semibold">{unit.def.label}</span>
          <span className="text-[9px] opacity-70">
            {unit.members.length} people{pods.length > 1 ? ` · ${pods.length} pods` : ""}
          </span>
          {podPreview.length > 0 && (
            <span className="max-w-[10rem] truncate text-[8px] opacity-60">
              {podPreview.join(" · ")}
            </span>
          )}
        </span>
      </button>
    );
  };

  return (
    <div className="absolute inset-x-4 bottom-[4.75rem] z-30 rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-2.5 shadow-xl ring-1 ring-slate-200/60 [transform:translateZ(0)] dark:border-white/10 dark:from-slate-900 dark:to-slate-950 dark:ring-white/10">
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
          ▤ Shared Foundation
          <span className="ml-2 font-medium normal-case tracking-normal text-slate-400">
            serves every brand &amp; channel above
          </span>
        </p>
        <button
          type="button"
          onClick={onOpenSharedServices}
          className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold text-sky-600 transition hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-500/10"
        >
          Shared Services view <ArrowTopRightIcon className="h-3 w-3" aria-hidden />
        </button>
      </div>
      <div className="flex flex-wrap items-stretch gap-3">
        {facilities.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Facilities</span>
            {facilities.map((u) => <Chip key={u.def.id} unit={u} />)}
          </div>
        )}
        {facilities.length > 0 && shared.length > 0 && (
          <span className="self-stretch border-l border-slate-200 dark:border-white/10" />
        )}
        {shared.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Shared services</span>
            {shared.map((u) => <Chip key={u.def.id} unit={u} />)}
          </div>
        )}
      </div>
    </div>
  );
}
