'use client';

import { memo } from "react";

export type GridColNodeData = {
  label: string;
  color: string;
  count: number;
  width: number;
  height: number;
  zoom: number;
};

export type GridRowNodeData = {
  label: string;
  color: string;
  count: number;
  width: number;
  zoom: number;
};

// Vertical channel band spanning the full grid height, with a header label
function ColComponent({ data }: { data: GridColNodeData }) {
  const { label, color, count, width, height, zoom } = data;
  const safeZoom = Math.max(zoom || 1, 0.12);
  const headerFont = Math.min(60, 22 / safeZoom);
  const chipFont = Math.min(34, 12 / safeZoom);
  return (
    <div
      className="lane-fade-in pointer-events-none rounded-3xl border-2 border-dashed"
      style={{ width, height, borderColor: `${color}40`, background: `${color}0a` }}
    >
      <div
        className="flex flex-col items-center gap-2 px-4 pt-5 text-center"
        style={{ height: 132 }}
      >
        <span className="font-bold uppercase tracking-wide" style={{ color, fontSize: headerFont, lineHeight: 1.05 }}>
          {label}
        </span>
        <span
          className="rounded-full bg-white/85 px-3 py-1 font-semibold text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900/80 dark:text-slate-300 dark:ring-white/10"
          style={{ fontSize: chipFont }}
        >
          {count} {count === 1 ? "person" : "people"}
        </span>
      </div>
    </div>
  );
}

// Horizontal brand band spanning the full grid width, label pinned to the left
function RowComponent({ data }: { data: GridRowNodeData }) {
  const { label, color, count, width, zoom } = data;
  const safeZoom = Math.max(zoom || 1, 0.12);
  const labelFont = Math.min(56, 22 / safeZoom);
  const chipFont = Math.min(30, 11 / safeZoom);
  return (
    <div
      className="lane-fade-in pointer-events-none rounded-3xl"
      style={{ width, height: "100%", background: `${color}12`, borderLeft: `8px solid ${color}` }}
    >
      <div className="flex h-full flex-col justify-center gap-2 pl-6" style={{ width: 260 }}>
        <span className="font-bold uppercase tracking-wide" style={{ color, fontSize: labelFont, lineHeight: 1.05 }}>
          {label}
        </span>
        <span
          className="w-fit rounded-full bg-white/85 px-3 py-1 font-semibold text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900/80 dark:text-slate-300 dark:ring-white/10"
          style={{ fontSize: chipFont }}
        >
          {count} {count === 1 ? "person" : "people"}
        </span>
      </div>
    </div>
  );
}

export type GridCellNodeData = {
  count: number;
  maxCell: number;
  width: number;
  height: number;
  color: string;
  shared: boolean;
  zoom: number;
};

const toAlphaHex = (a: number) =>
  Math.round(Math.max(0, Math.min(1, a)) * 255)
    .toString(16)
    .padStart(2, "0");

// Per-cell heat: tint each brand×channel intersection by headcount; flag empty real
// cells as coverage gaps. Sits behind the person cards, so it stays subtle.
function CellComponent({ data }: { data: GridCellNodeData }) {
  const { count, maxCell, width, height, color, shared, zoom } = data;
  const safeZoom = Math.max(zoom || 1, 0.12);
  const badgeFont = Math.min(30, 12 / safeZoom);

  const intensity = maxCell > 0 ? count / maxCell : 0;
  // Empty non-shared cell = a coverage gap; shared buckets stay nearly flat
  const isGap = !shared && count === 0;
  const alpha = shared ? 0.03 : count === 0 ? 0 : 0.08 + 0.3 * intensity;

  return (
    <div
      className="lane-fade-in pointer-events-none rounded-2xl"
      style={{
        width,
        height,
        background: alpha > 0 ? `${color}${toAlphaHex(alpha)}` : "transparent",
        border: isGap ? `2px dashed ${color}33` : undefined,
      }}
    >
      {(count > 0 || isGap) && (
        <div className="flex h-full w-full items-start justify-end p-2">
          <span
            className={
              isGap
                ? "rounded-md bg-white/80 px-1.5 py-0.5 font-bold text-slate-300 ring-1 ring-slate-200 dark:bg-slate-900/70 dark:text-slate-600 dark:ring-white/10"
                : "rounded-md bg-white/90 px-1.5 py-0.5 font-bold tabular-nums text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900/80 dark:text-slate-200 dark:ring-white/10"
            }
            style={{ fontSize: badgeFont, color: isGap ? undefined : color }}
          >
            {isGap ? "—" : count}
          </span>
        </div>
      )}
    </div>
  );
}

export type GridGroupNodeData = {
  label: string;
  count: number;
  width: number;
  color: string;
  zoom: number;
  detail?: string;
  align?: "start" | "center";
  collapsed?: boolean;
  variant?: "group" | "owner-band" | "channel-template";
  onToggle?: (label: string) => void;
};

// Top-level channel-group header spanning its member columns; click to collapse/expand
function GroupComponent({ data }: { data: GridGroupNodeData }) {
  const { label, count, width, color, zoom, detail, align, collapsed, variant, onToggle } = data;
  const safeZoom = Math.max(zoom || 1, 0.12);
  const isOwnerBand = variant === "owner-band";
  const isChannelTemplate = variant === "channel-template";

  if (isOwnerBand) {
    const ownerLabel = label.replace(/\s+portfolio$/i, "");
    const labelFont = Math.min(22, 12 / safeZoom);
    const chipFont = Math.min(18, 10 / safeZoom);

    return (
      <div
        className="lane-fade-in pointer-events-none flex h-full w-full items-start justify-between gap-4 rounded-2xl border px-5 py-3"
        style={{ width, borderColor: `${color}40`, background: `${color}08` }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: color }}
          />
          <span
            className="truncate font-bold uppercase tracking-[0.18em]"
            style={{ color, fontSize: labelFont, lineHeight: 1.1 }}
          >
            {ownerLabel}
          </span>
        </div>
        <span
          className="shrink-0 rounded-full bg-white/85 px-3 py-0.5 font-semibold text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900/80 dark:text-slate-300 dark:ring-white/10"
          style={{ fontSize: chipFont }}
        >
          Portfolio · {count} {count === 1 ? "person" : "people"}
        </span>
      </div>
    );
  }

  if (isChannelTemplate) {
    const labelFont = Math.min(54, 20 / safeZoom);
    const detailFont = Math.min(28, 10 / safeZoom);
    const chipFont = Math.min(30, 11 / safeZoom);
    const alignStart = align === "start";

    return (
      <div
        className={[
          "lane-fade-in pointer-events-none flex h-full w-full items-center gap-6 overflow-hidden rounded-2xl border px-7 py-4",
          alignStart ? "justify-between" : "justify-center text-center",
        ].join(" ")}
        style={{
          width,
          borderColor: `${color}55`,
          background: `linear-gradient(90deg, ${color}1f 0%, ${color}0e 64%, ${color}08 100%)`,
        }}
      >
        <div className={["flex min-w-0 items-center gap-3", alignStart ? "" : "justify-center"].join(" ")}>
          <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: color }} aria-hidden />
          <span className="min-w-0">
            <span
              className="block truncate font-extrabold uppercase tracking-[0.14em]"
              style={{ color, fontSize: labelFont, lineHeight: 1 }}
            >
              {label}
            </span>
            {detail ? (
              <span
                className="mt-1 block truncate font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400"
                style={{ fontSize: detailFont, lineHeight: 1.1 }}
              >
                {detail}
              </span>
            ) : null}
          </span>
        </div>
        <span
          className="shrink-0 rounded-full bg-white/85 px-3 py-0.5 font-semibold text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900/80 dark:text-slate-300 dark:ring-white/10"
          style={{ fontSize: chipFont }}
        >
          {count} {count === 1 ? "person" : "people"}
        </span>
      </div>
    );
  }

  const labelFont = Math.min(64, 26 / safeZoom);
  const chipFont = Math.min(34, 12 / safeZoom);
  const toggleFont = Math.min(48, 20 / safeZoom);
  return (
    <button
      type="button"
      onClick={onToggle ? () => onToggle(label) : undefined}
      title={collapsed ? `Expand ${label}` : `Collapse ${label}`}
      className={`lane-fade-in flex h-full w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 transition ${onToggle ? "cursor-pointer hover:brightness-95" : ""}`}
      style={{ width, borderColor: `${color}66`, background: `${color}${collapsed ? "22" : "14"}` }}
    >
      <span className="flex items-center gap-2 font-extrabold uppercase tracking-wider" style={{ color, fontSize: labelFont, lineHeight: 1 }}>
        {onToggle && (
          <span className="font-mono" style={{ fontSize: toggleFont }} aria-hidden>{collapsed ? "▸" : "▾"}</span>
        )}
        {label}
      </span>
      <span className="rounded-full bg-white/85 px-3 py-0.5 font-semibold text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900/80 dark:text-slate-300 dark:ring-white/10" style={{ fontSize: chipFont }}>
        {count} {count === 1 ? "person" : "people"}{collapsed ? " · collapsed" : ""}
      </span>
    </button>
  );
}

export const GridColNode = memo(ColComponent);
export const GridRowNode = memo(RowComponent);
export const GridCellNode = memo(CellComponent);
export const GridGroupNode = memo(GroupComponent);
