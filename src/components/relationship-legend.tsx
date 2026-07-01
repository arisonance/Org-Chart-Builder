'use client';

import { InfoCircledIcon } from '@radix-ui/react-icons';
import * as Popover from '@radix-ui/react-popover';
import { RELATIONSHIP_COLORS } from '@/lib/theme/palette';
import type { RelationshipType } from '@/lib/schema/types';

type LegendItem = {
  type: RelationshipType;
  label: string;
  description: string;
  marker: 'arrow' | 'diamond';
  dashed?: boolean;
};

// Two concepts only (agreed vocabulary): a line either reports or supports.
const LEGEND_ITEMS: LegendItem[] = [
  {
    type: 'manager',
    label: 'Reports to',
    description: 'The management line — the only line that shapes the chart',
    marker: 'arrow',
  },
  {
    type: 'support',
    label: 'Supports',
    description: 'Works with an area or team without reporting to it',
    marker: 'diamond',
    dashed: true,
  },
];

function LineSample({ item }: { item: LegendItem }) {
  const color = RELATIONSHIP_COLORS[item.type] ?? '#64748b';
  const markerId = `legend-${item.type}`;

  return (
    <svg width="100%" height="16" viewBox="0 0 48 20" className="overflow-visible">
      <defs>
        <marker
          id={markerId}
          markerWidth={item.marker === 'diamond' ? 12 : 10}
          markerHeight={item.marker === 'diamond' ? 12 : 10}
          refX={item.marker === 'diamond' ? 6 : 8}
          refY={item.marker === 'diamond' ? 6 : 3}
          orient="auto"
          markerUnits={item.marker === 'diamond' ? undefined : 'strokeWidth'}
        >
          {item.marker === 'diamond' ? (
            <path d="M0,6 L6,0 L12,6 L6,12 z" fill="none" stroke={color} strokeWidth="2" />
          ) : (
            <path d="M0,0 L0,6 L9,3 z" fill={color} />
          )}
        </marker>
      </defs>
      <line
        x1="0"
        y1="10"
        x2="48"
        y2="10"
        stroke={color}
        strokeWidth="2.5"
        strokeDasharray={item.dashed ? '6 6' : undefined}
        markerEnd={`url(#${markerId})`}
      />
    </svg>
  );
}

export function RelationshipLegend() {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="absolute bottom-4 left-4 z-20 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm backdrop-blur transition hover:bg-white hover:shadow-md dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-300"
          title="Show relationship types"
          aria-label="Show relationship types legend"
        >
          <InfoCircledIcon className="h-3.5 w-3.5" aria-hidden />
          Legend
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-50 w-72 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur dark:border-white/10 dark:bg-slate-900/95"
          sideOffset={8}
          side="top"
        >
          <div className="space-y-2.5">
            {LEGEND_ITEMS.map((item) => (
              <div key={item.type} className="flex items-center gap-2.5">
                <div className="flex h-6 w-10 flex-shrink-0 items-center justify-center">
                  <LineSample item={item} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-900 dark:text-white">
                    {item.label}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {item.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Popover.Arrow className="fill-white dark:fill-slate-900" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
