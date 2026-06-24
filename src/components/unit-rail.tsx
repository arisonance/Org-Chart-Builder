'use client';

import { Fragment } from "react";
import { ChevronDownIcon, ChevronRightIcon, ArrowTopRightIcon } from "@radix-ui/react-icons";
import type { ComputedUnit } from "@/lib/graph/org-units";
import { groupSharedServicePods } from "@/lib/graph/shared-service-groups";

type UnitRailProps = {
  units: ComputedUnit[];
  expanded: Set<string>;
  onToggleExpand: (unitId: string) => void;
  onJump: (unit: ComputedUnit) => void;
  onSelectMember: (personId: string) => void;
  onOpenSharedServices: () => void;
};

const TYPE_STYLE = {
  facility: {
    glyph: "🏭",
    dot: "bg-teal-500",
    chip: "text-teal-700 dark:text-teal-300",
    border: "border-l-teal-400",
  },
  "shared-service": {
    glyph: "🔗",
    dot: "bg-violet-500",
    chip: "text-violet-700 dark:text-violet-300",
    border: "border-l-violet-400",
  },
} as const;

const SECTIONS: { type: "facility" | "shared-service"; label: string }[] = [
  { type: "facility", label: "Facilities" },
  { type: "shared-service", label: "Shared Services" },
];

export function UnitRail({
  units,
  expanded,
  onToggleExpand,
  onJump,
  onSelectMember,
  onOpenSharedServices,
}: UnitRailProps) {
  if (units.length === 0) return null;
  const rolledHeadcount = units.reduce((sum, u) => sum + u.members.length, 0);

  return (
    <div className="absolute left-4 top-[4.75rem] bottom-4 z-30 flex w-64 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl [transform:translateZ(0)] dark:border-white/10 dark:bg-slate-900">
      <div className="border-b border-slate-200 px-3 py-2.5 dark:border-white/10">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">
          Facilities & Shared Services
        </p>
        <p className="text-[10px] text-slate-400">
          {rolledHeadcount} people rolled up as groups · not lane reports
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2 [transform:translateZ(0)]">
        {SECTIONS.map((section) => {
          const sectionUnits = units.filter((u) => u.def.type === section.type);
          if (sectionUnits.length === 0) return null;
          return (
            <Fragment key={section.type}>
              <div className="flex items-center justify-between px-1 pb-1 pt-2">
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                  {section.type === "shared-service" ? "Support groups" : section.label}
                </span>
                {section.type === "shared-service" && (
                  <button
                    type="button"
                    onClick={onOpenSharedServices}
                    className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold text-sky-600 transition hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-500/10"
                    title="Open a dedicated view of all support groups"
                    aria-label="View all support groups"
                  >
                    View all <ArrowTopRightIcon className="h-2.5 w-2.5" aria-hidden />
                  </button>
                )}
              </div>
              {sectionUnits.map((unit) => {
                const style = TYPE_STYLE[unit.def.type];
                const isOpen = expanded.has(unit.def.id);
                const pods =
                  unit.def.type === "shared-service"
                    ? groupSharedServicePods(unit.members)
                    : [];
                return (
                  <div key={unit.def.id} className="relative mb-3">
                    {/* Stacked-paper layers: signals "a group of people," not one person */}
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-x-2 -bottom-1.5 h-3 rounded-b-lg border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-slate-800"
                    />
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-x-1 -bottom-0.5 h-3 rounded-b-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900"
                    />
                    <div
                      data-testid={`unit-card-${unit.def.id}`}
                      className={`relative overflow-hidden rounded-lg border border-slate-200 border-l-[3px] ${style.border} bg-white dark:border-white/10 dark:bg-slate-950/60`}
                    >
                    <div className="flex items-start gap-2 px-2.5 py-2">
                      <span className="text-base leading-none" aria-hidden>
                        {style.glyph}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">
                          {unit.def.label}
                        </p>
                        <p className="truncate text-[10px] text-slate-400">
                          {unit.members.length} people · {unit.def.serves}
                        </p>
                      </div>
                    </div>

                    {isOpen && unit.def.type === "shared-service" && pods.length > 0 && (
                      <div className="max-h-56 overflow-y-auto border-t border-slate-100 bg-slate-50/60 px-1.5 py-1.5 dark:border-white/10 dark:bg-white/5">
                        {pods.map((pod) => {
                          const preview = pod.members.slice(0, 3);
                          const overflow = pod.members.length - preview.length;
                          return (
                            <div
                              key={pod.id}
                              className="mb-1.5 rounded-md border border-violet-100 bg-white p-1.5 shadow-sm last:mb-0 dark:border-violet-400/20 dark:bg-slate-950/70"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="truncate text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:text-violet-200">
                                    {pod.label}
                                  </p>
                                  <p className="truncate text-[9px] text-slate-400">
                                    {pod.lead ? `Lead: ${pod.lead.name}` : pod.service} · support group
                                  </p>
                                </div>
                                <span className="rounded-full bg-violet-50 px-1.5 py-0.5 text-[9px] font-bold text-violet-700 ring-1 ring-violet-100 dark:bg-violet-500/15 dark:text-violet-200 dark:ring-violet-400/20">
                                  {pod.members.length}
                                </span>
                              </div>
                              <div className="mt-1 space-y-0.5">
                                {preview.map((m) => (
                                  <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => onSelectMember(m.id)}
                                    className="flex w-full flex-col rounded px-1.5 py-0.5 text-left hover:bg-violet-50 dark:hover:bg-violet-500/10"
                                  >
                                    <span className="truncate text-[10px] font-medium text-slate-700 dark:text-slate-200">
                                      {m.name}
                                    </span>
                                    <span className="truncate text-[8px] text-slate-400">{m.attributes.title}</span>
                                  </button>
                                ))}
                                {overflow > 0 && (
                                  <span className="block px-1.5 text-[9px] font-semibold text-slate-400">
                                    +{overflow} more in this pod
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {isOpen && unit.def.type !== "shared-service" && (
                      <div className="max-h-44 overflow-y-auto border-t border-slate-100 bg-slate-50/60 px-1 py-0.5 dark:border-white/10 dark:bg-white/5">
                        {unit.members.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => onSelectMember(m.id)}
                            className="flex w-full flex-col rounded px-2 py-1 text-left hover:bg-white dark:hover:bg-white/10"
                          >
                            <span className="truncate text-[11px] font-medium text-slate-700 dark:text-slate-200">
                              {m.name}
                            </span>
                            <span className="truncate text-[9px] text-slate-400">{m.attributes.title}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex divide-x divide-slate-100 border-t border-slate-100 text-[10px] font-semibold dark:divide-white/10 dark:border-white/10">
                      <button
                        type="button"
                        onClick={() => onToggleExpand(unit.def.id)}
                        className="flex flex-1 items-center justify-center gap-1 py-1.5 text-slate-500 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5"
                      >
                        {isOpen ? <ChevronDownIcon className="h-3 w-3" aria-hidden /> : <ChevronRightIcon className="h-3 w-3" aria-hidden />}
                        {isOpen ? "Hide" : "People"}
                      </button>
                      <button
                        type="button"
                        onClick={() => onJump(unit)}
                        aria-label={`Open ${unit.def.label} in chart`}
                        className="flex flex-1 items-center justify-center gap-1 py-1.5 text-sky-600 transition hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-500/10"
                      >
                        Open <ArrowTopRightIcon className="h-3 w-3" aria-hidden />
                      </button>
                    </div>
                    </div>
                  </div>
                );
              })}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
