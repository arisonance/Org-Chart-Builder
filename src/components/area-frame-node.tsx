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
  const isOwnerFrame = kind === "Owned area" || kind === "Owned areas";

  if (isOwnerFrame) {
    return (
      <section
        className="lane-fade-in pointer-events-none h-full w-full overflow-hidden rounded-xl border-2 border-dashed shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_16px_34px_rgba(15,23,42,0.06)]"
        style={{
          borderColor: `${accentColor}8a`,
          background: `linear-gradient(180deg, ${accentColor}1c 0%, ${accentColor}09 100%)`,
        }}
        aria-label={`${label} area ownership group`}
      >
        <div
          className="flex h-12 max-w-full items-center gap-2 border-b px-4 text-left"
          style={{
            borderColor: `${accentColor}42`,
            background: `linear-gradient(90deg, ${accentColor}28 0%, rgba(255,255,255,0.9) 72%, rgba(255,255,255,0.35) 100%)`,
          }}
        >
          <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: accentColor }} aria-hidden />
          <span
            className="min-w-0 whitespace-nowrap text-[14px] font-black uppercase tracking-wide"
            style={{ color: accentColor }}
          >
            {label}
          </span>
          <span className="ml-auto shrink-0 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-600 ring-1 ring-slate-200">
            {count === 1 ? "1 area" : `${count} areas`}
          </span>
        </div>
        {detail ? (
          <div className="truncate px-4 pt-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">
            {detail}
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section
      className={[
        "lane-fade-in pointer-events-none h-full w-full overflow-hidden rounded-xl border border-dashed",
        isOwnerFrame
          ? "shadow-[inset_0_1px_0_rgba(255,255,255,0.86),0_12px_28px_rgba(15,23,42,0.04)]"
          : nested
            ? "shadow-[inset_0_1px_0_rgba(255,255,255,0.58)]"
            : "shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]",
      ].join(" ")}
      style={{
        borderColor: `${accentColor}${isOwnerFrame ? "78" : nested ? "48" : "5c"}`,
        background: isOwnerFrame
          ? `linear-gradient(180deg, ${accentColor}18 0%, ${accentColor}08 100%)`
          : nested
          ? `linear-gradient(180deg, ${accentColor}0d 0%, ${accentColor}05 100%)`
          : `linear-gradient(180deg, ${accentColor}12 0%, ${accentColor}06 100%)`,
      }}
      aria-label={`${label} area frame`}
    >
      <div
        className={[
          "flex max-w-full items-center gap-2 border-b px-4",
          isOwnerFrame ? "h-10 justify-start text-left" : "justify-center text-center",
          !isOwnerFrame && (nested ? "h-9" : "h-11"),
        ].join(" ")}
        style={{
          borderColor: `${accentColor}${isOwnerFrame ? "36" : "22"}`,
          background: isOwnerFrame
            ? `linear-gradient(90deg, ${accentColor}22 0%, rgba(255,255,255,0.78) 76%, rgba(255,255,255,0.12) 100%)`
            : `linear-gradient(90deg, ${accentColor}16 0%, rgba(255,255,255,0.58) 72%, rgba(255,255,255,0.12) 100%)`,
        }}
      >
        <span
          className={["shrink-0 rounded-full", isOwnerFrame ? "h-2.5 w-2.5" : nested ? "h-1.5 w-1.5" : "h-2 w-2"].join(" ")}
          style={{ background: accentColor }}
          aria-hidden
        />
        <span
          className={[
            "truncate font-bold uppercase tracking-wide",
            isOwnerFrame ? "text-[12px]" : nested ? "text-[10px]" : "text-[11px]",
          ].join(" ")}
          style={{ color: accentColor }}
        >
          {label}
        </span>
        <span className={[
          "shrink-0 rounded-full bg-white/90 px-2 py-0.5 font-semibold text-slate-600 ring-1 ring-slate-200 dark:bg-slate-950/80 dark:text-slate-300 dark:ring-white/10",
          isOwnerFrame ? "text-[9px]" : "text-[10px]",
        ].join(" ")}>
          {count}
        </span>
        {ownerName ? (
          <span className="min-w-0 truncate text-[10px] font-semibold text-slate-500 dark:text-slate-400">
            Owner: {ownerName}
          </span>
        ) : null}
        <span className={[
          "hidden shrink-0 rounded-full bg-white/75 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500 ring-1 ring-slate-200/80 dark:bg-slate-950/60 dark:text-slate-300 dark:ring-white/10",
          isOwnerFrame ? "lg:inline-flex" : "sm:inline-flex",
        ].join(" ")}>
          {kind}
        </span>
      </div>
      {detail ? (
        <div className={[
          "px-4 pt-2 font-medium text-slate-500 dark:text-slate-400",
          isOwnerFrame ? "text-[11px]" : "text-[10px]",
        ].join(" ")}>
          {detail}
        </div>
      ) : null}
    </section>
  );
}

export const AreaFrameNode = memo(Component);
