'use client';

import { memo } from "react";
import { useStore } from "@xyflow/react";

// Read the live zoom from the React Flow store so counter-scaling re-renders
// only these (memoized) frame components — it never rebuilds the Node[] array.
const useZoom = () => useStore((s) => s.transform[2]);

export type GridColNodeData = {
  label: string;
  color: string;
  count: number;
  width: number;
  height: number;
};

export type GridRowNodeData = {
  label: string;
  color: string;
  count: number;
  width: number;
};

// Vertical channel band spanning the full grid height, with a header label
function ColComponent({ data }: { data: GridColNodeData }) {
  const { label, color, count, width, height } = data;
  const safeZoom = Math.max(useZoom() || 1, 0.12);
  const headerFont = Math.min(60, 22 / safeZoom);
  const chipFont = Math.min(34, 12 / safeZoom);
  return (
    <div
      className="pointer-events-none rounded-3xl border-2 border-dashed"
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
  const { label, color, count, width } = data;
  const safeZoom = Math.max(useZoom() || 1, 0.12);
  const labelFont = Math.min(56, 22 / safeZoom);
  const chipFont = Math.min(30, 11 / safeZoom);
  return (
    <div
      className="pointer-events-none rounded-3xl"
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
};

const toAlphaHex = (a: number) =>
  Math.round(Math.max(0, Math.min(1, a)) * 255)
    .toString(16)
    .padStart(2, "0");

// Per-cell heat: tint each brand×channel intersection by headcount; flag empty real
// cells as coverage gaps. Sits behind the person cards, so it stays subtle.
function CellComponent({ data }: { data: GridCellNodeData }) {
  const { count, maxCell, width, height, color, shared } = data;
  const safeZoom = Math.max(useZoom() || 1, 0.12);
  const badgeFont = Math.min(30, 12 / safeZoom);

  const intensity = maxCell > 0 ? count / maxCell : 0;
  // Empty non-shared cell = a coverage gap; shared buckets stay nearly flat
  const isGap = !shared && count === 0;
  const alpha = shared ? 0.03 : count === 0 ? 0 : 0.08 + 0.3 * intensity;

  return (
    <div
      className="pointer-events-none rounded-2xl"
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
  collapsed?: boolean;
  onToggle?: (label: string) => void;
};

// Top-level channel-group header spanning its member columns; click to collapse/expand
function GroupComponent({ data }: { data: GridGroupNodeData }) {
  const { label, count, width, color, collapsed, onToggle } = data;
  const safeZoom = Math.max(useZoom() || 1, 0.12);
  const labelFont = Math.min(64, 26 / safeZoom);
  const chipFont = Math.min(34, 12 / safeZoom);
  const toggleFont = Math.min(48, 20 / safeZoom);
  return (
    <button
      type="button"
      onClick={onToggle ? () => onToggle(label) : undefined}
      title={collapsed ? `Expand ${label}` : `Collapse ${label}`}
      className={`flex h-full w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 transition ${onToggle ? "cursor-pointer hover:brightness-95" : ""}`}
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
