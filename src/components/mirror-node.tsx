'use client';

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { PersonNode } from "@/lib/schema/types";

export type MirrorNodeData = {
  node: PersonNode;
  accentColor: string;
  homeLane: string;
  onSelect: (id: string) => void;
  roleLabel?: string;
  targetLane?: string;
  variant?: "mirror" | "context";
  /** Chip text above the name (defaults to "Operating context") */
  badge?: string;
};

function Component({ data }: { data: MirrorNodeData }) {
  const { node, accentColor, homeLane, onSelect, roleLabel, targetLane, variant = "mirror", badge } = data;
  const isContext = variant === "context";
  // Invisible anchors so brand-leadership lines can attach to these cards
  const hiddenHandle = "!h-1 !w-1 !min-h-0 !min-w-0 !border-0 !bg-transparent pointer-events-none opacity-0";
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onSelect(node.id);
      }}
      className={[
        "lane-fade-in flex w-[16rem] flex-col items-center gap-1 rounded-2xl px-4 py-3 text-center shadow-sm transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300",
        isContext
          ? "border bg-white/95 opacity-100 ring-1 ring-slate-200 dark:bg-slate-950/90 dark:ring-white/10"
          : "border-2 border-dashed bg-white/60 opacity-70 hover:opacity-100 dark:bg-slate-950/50",
      ].join(" ")}
      style={{ borderColor: `${accentColor}${isContext ? "88" : "66"}` }}
      title={
        isContext
          ? `${node.name} provides ${roleLabel ?? "operating context"} for ${targetLane ?? homeLane}. Not a reporting line.`
          : `Mirror of ${node.name} - home lane: ${homeLane}`
      }
    >
      {isContext && (
        <span
          className="mb-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow-sm"
          style={{ background: accentColor }}
        >
          {badge ?? "Operating context"}
        </span>
      )}
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{node.name}</p>
      <p className="text-xs leading-snug text-slate-500 dark:text-slate-400">
        {node.attributes.title}
      </p>
      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-white/10 dark:text-slate-300">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: accentColor }} />
        {isContext ? roleLabel ?? "not reporting" : `home: ${homeLane}`}
      </span>
      <Handle type="target" position={Position.Top} id={`${node.id}-top`} className={hiddenHandle} />
      <Handle type="source" position={Position.Bottom} id={`${node.id}-bottom`} className={hiddenHandle} />
    </button>
  );
}

export const MirrorNode = memo(Component);
