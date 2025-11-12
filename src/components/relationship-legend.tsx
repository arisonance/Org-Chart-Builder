'use client';

import { InfoCircledIcon } from '@radix-ui/react-icons';
import * as Popover from '@radix-ui/react-popover';
import { RELATIONSHIP_COLORS } from '@/lib/theme/palette';

export function RelationshipLegend() {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="absolute bottom-4 left-4 z-20 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm backdrop-blur transition hover:bg-white hover:shadow-md dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-300"
          title="Show relationship types"
        >
          <InfoCircledIcon className="h-3.5 w-3.5" />
          Legend
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-50 w-64 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur dark:border-white/10 dark:bg-slate-900/95"
          sideOffset={8}
          side="top"
        >
          <div className="space-y-2.5">
            {/* Manager */}
            <div className="flex items-center gap-2.5">
              <div className="flex h-6 w-10 flex-shrink-0 items-center justify-center">
                <svg width="100%" height="16" viewBox="0 0 48 20" className="overflow-visible">
                  <defs>
                    <marker
                      id="arrow-manager-legend"
                      markerWidth="10"
                      markerHeight="10"
                      refX="8"
                      refY="3"
                      orient="auto"
                      markerUnits="strokeWidth"
                    >
                      <path
                        d="M0,0 L0,6 L9,3 z"
                        fill={RELATIONSHIP_COLORS.manager}
                      />
                    </marker>
                  </defs>
                  <line
                    x1="0"
                    y1="10"
                    x2="48"
                    y2="10"
                    stroke={RELATIONSHIP_COLORS.manager}
                    strokeWidth="2.5"
                    markerEnd="url(#arrow-manager-legend)"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-900 dark:text-white">
                  Manager
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Direct reporting
                </div>
              </div>
            </div>

            {/* Sponsor */}
            <div className="flex items-center gap-2.5">
              <div className="flex h-6 w-10 flex-shrink-0 items-center justify-center">
                <svg width="100%" height="16" viewBox="0 0 48 20" className="overflow-visible">
                  <defs>
                    <marker
                      id="diamond-sponsor-legend"
                      markerWidth="12"
                      markerHeight="12"
                      refX="6"
                      refY="6"
                      orient="auto"
                    >
                      <path
                        d="M0,6 L6,0 L12,6 L6,12 z"
                        fill="none"
                        stroke={RELATIONSHIP_COLORS.sponsor}
                        strokeWidth="2"
                      />
                    </marker>
                  </defs>
                  <line
                    x1="0"
                    y1="10"
                    x2="48"
                    y2="10"
                    stroke={RELATIONSHIP_COLORS.sponsor}
                    strokeWidth="2.5"
                    markerEnd="url(#diamond-sponsor-legend)"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-900 dark:text-white">
                  Sponsor
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Executive support
                </div>
              </div>
            </div>

            {/* Dotted Line */}
            <div className="flex items-center gap-2.5">
              <div className="flex h-6 w-10 flex-shrink-0 items-center justify-center">
                <svg width="100%" height="16" viewBox="0 0 48 20" className="overflow-visible">
                  <defs>
                    <marker
                      id="arrow-dotted-legend"
                      markerWidth="10"
                      markerHeight="10"
                      refX="8"
                      refY="3"
                      orient="auto"
                      markerUnits="strokeWidth"
                    >
                      <path
                        d="M0,0 L0,6 L9,3 z"
                        fill={RELATIONSHIP_COLORS.dotted}
                      />
                    </marker>
                  </defs>
                  <line
                    x1="0"
                    y1="10"
                    x2="48"
                    y2="10"
                    stroke={RELATIONSHIP_COLORS.dotted}
                    strokeWidth="2.5"
                    strokeDasharray="6 6"
                    markerEnd="url(#arrow-dotted-legend)"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-900 dark:text-white">
                  Dotted Line
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Collaborative
                </div>
              </div>
            </div>
          </div>
          <Popover.Arrow className="fill-white dark:fill-slate-900" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

