'use client';

import { memo } from "react";
import { ArrowTopRightIcon } from "@radix-ui/react-icons";

export type AreaCardNodeData = {
  label: string;
  ownerName?: string;
  leadName?: string;
  count: number;
  kind: string;
  detail?: string;
  accentColor: string;
  onOpen: () => void;
};

function Component({ data }: { data: AreaCardNodeData }) {
  const { label, ownerName, leadName, count, kind, detail, accentColor, onOpen } = data;
  const leadLine = leadName && leadName !== ownerName ? `Lead: ${leadName}` : null;

  return (
    <div
      className="lane-fade-in group flex w-[15rem] cursor-grab flex-col gap-2 rounded-lg border bg-white/95 px-3.5 py-3 text-left shadow-sm ring-1 ring-slate-200/70 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md active:cursor-grabbing dark:bg-slate-950/90 dark:ring-white/10 dark:hover:bg-slate-900"
      style={{ borderColor: `${accentColor}88` }}
      title={`${label}${ownerName ? `, owned by ${ownerName}` : ""}${leadLine ? `, ${leadLine}` : ""}. Drag to arrange, or use Open to view the area org.`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span
            className="mb-1 inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ring-1"
            style={{
              background: `${accentColor}12`,
              color: accentColor,
              borderColor: `${accentColor}22`,
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: accentColor }} aria-hidden />
            Area
          </span>
          <span className="block truncate text-[15px] font-bold text-slate-900 dark:text-slate-50">
            {label}
          </span>
        </span>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm"
          style={{ background: accentColor }}
        >
          {count}
        </span>
      </div>

      <div className="flex min-h-[3.75rem] flex-col gap-1 text-xs leading-snug text-slate-500 dark:text-slate-400">
        {ownerName ? (
          <p
            className="truncate rounded-md px-2 py-1 text-[12px] font-black uppercase tracking-wide"
            style={{
              background: `${accentColor}12`,
              color: accentColor,
            }}
          >
            Owned by {ownerName}
          </p>
        ) : null}
        {leadLine ? <p className="truncate font-semibold text-slate-600 dark:text-slate-300">{leadLine}</p> : null}
        <p className="truncate">{detail ?? kind}</p>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="truncate rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-white/10 dark:text-slate-300">
          {kind}
        </span>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
          onDoubleClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
          className="nodrag nopan inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-semibold text-sky-600 opacity-80 transition hover:bg-sky-50 group-hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 dark:text-sky-300 dark:hover:bg-sky-500/10"
        >
          Open <ArrowTopRightIcon className="h-3 w-3" aria-hidden />
        </button>
      </div>
    </div>
  );
}

export const AreaCardNode = memo(Component);
