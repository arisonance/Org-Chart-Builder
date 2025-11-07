'use client';

import { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@radix-ui/react-icons';
import { RELATIONSHIP_COLORS } from '@/lib/theme/palette';

export function RelationshipLegend() {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="absolute left-6 top-6 z-30 w-64">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white/95 shadow-lg backdrop-blur dark:border-white/10 dark:bg-slate-900/95">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex w-full items-center justify-between border-b border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-slate-800/50"
        >
          <span>Relationship Types</span>
          {isExpanded ? (
            <ChevronUpIcon className="h-4 w-4" />
          ) : (
            <ChevronDownIcon className="h-4 w-4" />
          )}
        </button>

        {isExpanded && (
          <div className="space-y-3 px-4 py-3">
            {/* Manager */}
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-12 items-center justify-center">
                <svg width="48" height="20" viewBox="0 0 48 20" className="overflow-visible">
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
                  Direct reporting line
                </div>
              </div>
            </div>

            {/* Sponsor */}
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-12 items-center justify-center">
                <svg width="48" height="20" viewBox="0 0 48 20" className="overflow-visible">
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
                  Executive sponsorship
                </div>
              </div>
            </div>

            {/* Dotted Line */}
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-12 items-center justify-center">
                <svg width="48" height="20" viewBox="0 0 48 20" className="overflow-visible">
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
                  Collaborative/advisory
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
              <div className="text-xs text-slate-600 dark:text-slate-300">
                <strong>Tip:</strong> Hover over an edge to see details. Right-click to change type.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

