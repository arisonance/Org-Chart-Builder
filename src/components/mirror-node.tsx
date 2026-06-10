'use client';

import { memo } from "react";
import type { PersonNode } from "@/lib/schema/types";

export type MirrorNodeData = {
  node: PersonNode;
  accentColor: string;
  homeLane: string;
  onSelect: (id: string) => void;
};

function Component({ data }: { data: MirrorNodeData }) {
  const { node, accentColor, homeLane, onSelect } = data;
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onSelect(node.id);
      }}
      className="lane-fade-in flex w-[16rem] flex-col items-center gap-1 rounded-2xl border-2 border-dashed bg-white/60 px-4 py-3 text-center opacity-70 shadow-sm transition hover:opacity-100 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 dark:bg-slate-950/50"
      style={{ borderColor: `${accentColor}66` }}
      title={`Mirror of ${node.name} — home lane: ${homeLane}`}
    >
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{node.name}</p>
      <p className="text-xs leading-snug text-slate-500 dark:text-slate-400">
        {node.attributes.title}
      </p>
      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-white/10 dark:text-slate-300">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: accentColor }} />
        home: {homeLane}
      </span>
    </button>
  );
}

export const MirrorNode = memo(Component);
