'use client';

import { memo } from "react";

export type AreaFrameNodeData = {
  label: string;
  ownerName?: string;
  count: number;
  kind: string;
  detail?: string;
  accentColor: string;
  nested?: boolean;
};

function Component({ data }: { data: AreaFrameNodeData }) {
  const { label, ownerName, count, kind, detail, accentColor, nested } = data;

  return (
    <section
      className={[
        "lane-fade-in pointer-events-none h-full w-full overflow-hidden rounded-xl border border-dashed",
        nested ? "shadow-[inset_0_1px_0_rgba(255,255,255,0.58)]" : "shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]",
      ].join(" ")}
      style={{
        borderColor: `${accentColor}${nested ? "48" : "5c"}`,
        background: nested
          ? `linear-gradient(180deg, ${accentColor}0d 0%, ${accentColor}05 100%)`
          : `linear-gradient(180deg, ${accentColor}12 0%, ${accentColor}06 100%)`,
      }}
      aria-label={`${label} area frame`}
    >
      <div
        className={[
          "flex max-w-full items-center justify-center gap-2 border-b px-4 text-center",
          nested ? "h-9" : "h-11",
        ].join(" ")}
        style={{
          borderColor: `${accentColor}22`,
          background: `linear-gradient(90deg, ${accentColor}16 0%, rgba(255,255,255,0.58) 72%, rgba(255,255,255,0.12) 100%)`,
        }}
      >
        <span
          className={["shrink-0 rounded-full", nested ? "h-1.5 w-1.5" : "h-2 w-2"].join(" ")}
          style={{ background: accentColor }}
          aria-hidden
        />
        <span
          className={[
            "truncate font-bold uppercase tracking-wide",
            nested ? "text-[10px]" : "text-[11px]",
          ].join(" ")}
          style={{ color: accentColor }}
        >
          {label}
        </span>
        <span className="shrink-0 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200 dark:bg-slate-950/80 dark:text-slate-300 dark:ring-white/10">
          {count}
        </span>
        {ownerName ? (
          <span className="min-w-0 truncate text-[10px] font-semibold text-slate-500 dark:text-slate-400">
            Owner: {ownerName}
          </span>
        ) : null}
        <span className="hidden shrink-0 rounded-full bg-white/75 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500 ring-1 ring-slate-200/80 dark:bg-slate-950/60 dark:text-slate-300 dark:ring-white/10 sm:inline-flex">
          {kind}
        </span>
      </div>
      {detail ? (
        <div className="px-4 pt-2 text-[10px] font-medium text-slate-500 dark:text-slate-400">
          {detail}
        </div>
      ) : null}
    </section>
  );
}

export const AreaFrameNode = memo(Component);
