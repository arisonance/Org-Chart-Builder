'use client';

import { memo } from "react";
import type { PersonNode } from "@/lib/schema/types";

export type SharedServiceGroupNodeData = {
  service: string;
  label: string;
  members: PersonNode[];
  lead?: PersonNode;
  accentColor: string;
  homeLane: string;
  targetLane: string;
  dimensionLabel: string;
  badgeLabel?: string;
  truthLabel?: string;
  draggableSurface?: boolean;
  onOpen: (memberIds: string[], label: string) => void;
};

function Component({ data }: { data: SharedServiceGroupNodeData }) {
  const {
    service,
    label,
    members,
    lead,
    accentColor,
    homeLane,
    targetLane,
    dimensionLabel,
    badgeLabel,
    truthLabel,
    draggableSurface,
    onOpen,
  } = data;
  const memberNames = members.slice(0, 3).map((member) => member.name);
  const overflow = members.length - memberNames.length;
  const displayLabel = service === label ? label : `${service}: ${label}`;
  const showServiceLine = service !== label;
  const openPod = () => onOpen(members.map((member) => member.id), displayLabel);

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        if (!draggableSurface) openPod();
      }}
      onDoubleClick={(event) => {
        event.stopPropagation();
        openPod();
      }}
      className={`${draggableSurface ? "cursor-grab active:cursor-grabbing" : "nodrag nopan"} lane-fade-in flex w-[16rem] flex-col gap-2 rounded-lg border bg-white/90 px-4 py-3 text-left shadow-sm ring-1 ring-slate-200/70 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 dark:bg-slate-950/80 dark:ring-white/10 dark:hover:bg-slate-900`}
      style={{ borderColor: `${accentColor}88` }}
      title={`${displayLabel} - ${badgeLabel ?? "shared-service pod"}, not a reporting line. ${members.length} ${members.length === 1 ? "person" : "people"} supporting ${targetLane}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="mb-1 inline-flex max-w-full items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-700 ring-1 ring-violet-100 dark:bg-violet-500/15 dark:text-violet-200 dark:ring-violet-400/20">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500" aria-hidden />
            {badgeLabel ?? "Shared-service pod"}
          </span>
          <span className="block truncate text-[15px] font-bold text-slate-900 dark:text-slate-50">
            {showServiceLine ? service : label}
          </span>
          {showServiceLine && (
            <span className="block truncate text-xs font-semibold text-slate-600 dark:text-slate-300">
              {label}
            </span>
          )}
        </span>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm"
          style={{ background: accentColor }}
        >
          {members.length}
        </span>
      </div>

      <div className="min-h-[2.25rem] text-xs leading-snug text-slate-500 dark:text-slate-400">
        {lead ? <p className="truncate">Lead: {lead.name}</p> : null}
        <p className="truncate">
          {memberNames.join(", ")}
          {overflow > 0 ? `, +${overflow} more` : ""}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-white/10 dark:text-slate-300">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: accentColor }} />
          Serves {targetLane}
        </span>
        <span className="inline-flex w-fit items-center rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 ring-1 ring-slate-200 dark:bg-slate-950 dark:text-slate-400 dark:ring-white/10">
          Home {dimensionLabel}: {homeLane}
        </span>
        {truthLabel !== null && (
          <span className="inline-flex w-fit items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 ring-1 ring-amber-100 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-400/20">
            {truthLabel ?? "Not reporting"}
          </span>
        )}
      </div>
    </button>
  );
}

export const SharedServiceGroupNode = memo(Component);
