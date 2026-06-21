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
  onOpen: (memberIds: string[], label: string) => void;
};

function Component({ data }: { data: SharedServiceGroupNodeData }) {
  const { service, label, members, lead, accentColor, homeLane, onOpen } = data;
  const memberNames = members.slice(0, 3).map((member) => member.name);
  const overflow = members.length - memberNames.length;

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onOpen(members.map((member) => member.id), `${service}: ${label}`);
      }}
      className="lane-fade-in flex w-[16rem] flex-col gap-2 rounded-2xl border bg-white/75 px-4 py-3 text-left shadow-sm ring-1 ring-slate-200/70 transition hover:bg-white hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 dark:bg-slate-950/60 dark:ring-white/10 dark:hover:bg-slate-900"
      style={{ borderColor: `${accentColor}88` }}
      title={`${service}: ${label} - ${members.length} ${members.length === 1 ? "person" : "people"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="block truncate text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            {service}
          </span>
          <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
            {label}
          </span>
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

      <span className="inline-flex w-fit items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-white/10 dark:text-slate-300">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: accentColor }} />
        home: {homeLane}
      </span>
    </button>
  );
}

export const SharedServiceGroupNode = memo(Component);
