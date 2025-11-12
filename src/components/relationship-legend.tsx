'use client';

import { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@radix-ui/react-icons';
import { RELATIONSHIP_COLORS } from '@/lib/theme/palette';

export function RelationshipLegend() {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="absolute left-2 top-2 z-30 w-48 sm:left-4 sm:top-4 sm:w-56 md:left-6 md:top-6 md:w-64">
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white/95 shadow-lg backdrop-blur sm:rounded-xl dark:border-white/10 dark:bg-slate-900/95">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex w-full items-center justify-between border-b border-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:px-3 sm:py-2 sm:text-sm md:px-4 dark:border-white/10 dark:text-slate-200 dark:hover:bg-slate-800/50"
        >
          <span>Relationship Types</span>
          {isExpanded ? (
            <ChevronUpIcon className="h-3 w-3 flex-shrink-0 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
          ) : (
            <ChevronDownIcon className="h-3 w-3 flex-shrink-0 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
          )}
        </button>

        {isExpanded && (
          <div className="space-y-2 px-2 py-2 sm:space-y-2.5 sm:px-3 sm:py-2.5 md:space-y-3 md:px-4 md:py-3">
            {/* Manager */}
            <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3">
              <div className="flex h-6 w-8 flex-shrink-0 items-center justify-center sm:h-7 sm:w-10 md:h-8 md:w-12">
                <svg width="100%" height="16" viewBox="0 0 48 20" className="overflow-visible" preserveAspectRatio="xMidYMid meet">
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
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-slate-900 sm:text-sm dark:text-white">
                  Manager
                </div>
                <div className="truncate text-[10px] text-slate-500 sm:text-xs dark:text-slate-400">
                  Direct reporting line
                </div>
              </div>
            </div>

            {/* Sponsor */}
            <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3">
              <div className="flex h-6 w-8 flex-shrink-0 items-center justify-center sm:h-7 sm:w-10 md:h-8 md:w-12">
                <svg width="100%" height="16" viewBox="0 0 48 20" className="overflow-visible" preserveAspectRatio="xMidYMid meet">
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
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-slate-900 sm:text-sm dark:text-white">
                  Sponsor
                </div>
                <div className="truncate text-[10px] text-slate-500 sm:text-xs dark:text-slate-400">
                  Executive sponsorship
                </div>
              </div>
            </div>

            {/* Dotted Line */}
            <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3">
              <div className="flex h-6 w-8 flex-shrink-0 items-center justify-center sm:h-7 sm:w-10 md:h-8 md:w-12">
                <svg width="100%" height="16" viewBox="0 0 48 20" className="overflow-visible" preserveAspectRatio="xMidYMid meet">
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
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-slate-900 sm:text-sm dark:text-white">
                  Dotted Line
                </div>
                <div className="truncate text-[10px] text-slate-500 sm:text-xs dark:text-slate-400">
                  Collaborative/advisory
                </div>
              </div>
            </div>

            <div className="mt-2 rounded-md bg-slate-50 px-2 py-1.5 sm:mt-2.5 sm:rounded-lg sm:px-2.5 sm:py-2 md:mt-3 md:px-3 dark:bg-slate-800/50">
              <div className="text-[10px] leading-tight text-slate-600 sm:text-xs dark:text-slate-300">
                <strong>Tip:</strong> Hover over an edge to see details. Right-click to change type.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

