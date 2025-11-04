'use client';

import { useMemo } from 'react';
import { useGraphStore } from '@/store/graph-store';
import type { PersonNode } from '@/lib/schema/types';
import { LENS_BY_ID } from '@/lib/schema/lenses';
import { BRAND_COLORS, CHANNEL_COLORS, DEPARTMENT_COLORS } from '@/lib/theme/palette';
import { DEMO_LENS_LABELS } from '@/data/demo-graph';

type CrossDimensionalContextProps = {
  node: PersonNode;
};

export function CrossDimensionalContext({ node }: CrossDimensionalContextProps) {
  const lens = useGraphStore((state) => state.document.lens);
  const setLens = useGraphStore((state) => state.setLens);
  const nodes = useGraphStore((state) => state.document.nodes);

  const dimensionCounts = useMemo(() => {
    const brandCount = node.attributes.brands.length;
    const channelCount = node.attributes.channels.length;
    const departmentCount = node.attributes.departments.length;
    
    // Count how many other people share each dimension
    const brandOverlaps = new Map<string, number>();
    const channelOverlaps = new Map<string, number>();
    const departmentOverlaps = new Map<string, number>();
    
    nodes.forEach((n) => {
      if (n.kind === 'person' && n.id !== node.id) {
        n.attributes.brands.forEach((b) => {
          if (node.attributes.brands.includes(b)) {
            brandOverlaps.set(b, (brandOverlaps.get(b) || 0) + 1);
          }
        });
        n.attributes.channels.forEach((c) => {
          if (node.attributes.channels.includes(c)) {
            channelOverlaps.set(c, (channelOverlaps.get(c) || 0) + 1);
          }
        });
        n.attributes.departments.forEach((d) => {
          if (node.attributes.departments.includes(d)) {
            departmentOverlaps.set(d, (departmentOverlaps.get(d) || 0) + 1);
          }
        });
      }
    });

    return { brandCount, channelCount, departmentCount, brandOverlaps, channelOverlaps, departmentOverlaps };
  }, [node, nodes]);

  const getDimensionColor = (dimension: string, type: 'brand' | 'channel' | 'department') => {
    if (type === 'brand') return BRAND_COLORS[dimension] || '#64748b';
    if (type === 'channel') return CHANNEL_COLORS[dimension] || '#64748b';
    return DEPARTMENT_COLORS[dimension] || '#64748b';
  };

  const isSinglePointOfFailure = (dimension: string, type: 'brand' | 'channel' | 'department') => {
    const overlaps = type === 'brand' 
      ? dimensionCounts.brandOverlaps 
      : type === 'channel' 
        ? dimensionCounts.channelOverlaps 
        : dimensionCounts.departmentOverlaps;
    return (overlaps.get(dimension) || 0) === 0;
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm ring-1 ring-black/5 dark:border-white/10 dark:from-slate-900/60 dark:to-slate-950 dark:ring-white/10">
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
        Cross-Dimensional View
      </h4>
      
      <div className="space-y-3">
        {/* Brand Dimension */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Brands ({dimensionCounts.brandCount})
            </span>
            {lens !== 'brand' && (
              <button
                onClick={() => setLens('brand')}
                className="text-xs text-sky-600 hover:text-sky-700 dark:text-sky-400"
              >
                View →
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {node.attributes.brands.map((brand) => {
              const isPrimary = node.attributes.primaryBrand === brand;
              const isSole = isSinglePointOfFailure(brand, 'brand');
              return (
                <div
                  key={brand}
                  className="group relative flex items-center gap-1"
                  title={isSole ? 'Only person in this brand' : undefined}
                >
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      isPrimary 
                        ? 'ring-2 ring-sky-400 ring-offset-1' 
                        : 'border border-slate-200 dark:border-white/10'
                    }`}
                    style={{ 
                      backgroundColor: getDimensionColor(brand, 'brand'),
                      color: 'white',
                    }}
                  >
                    {brand}
                  </span>
                  {isSole && (
                    <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Channel Dimension */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Channels ({dimensionCounts.channelCount})
            </span>
            {lens !== 'channel' && (
              <button
                onClick={() => setLens('channel')}
                className="text-xs text-sky-600 hover:text-sky-700 dark:text-sky-400"
              >
                View →
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {node.attributes.channels.map((channel) => {
              const isPrimary = node.attributes.primaryChannel === channel;
              const isSole = isSinglePointOfFailure(channel, 'channel');
              return (
                <div
                  key={channel}
                  className="group relative flex items-center gap-1"
                  title={isSole ? 'Only person in this channel' : undefined}
                >
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      isPrimary 
                        ? 'ring-2 ring-sky-400 ring-offset-1' 
                        : 'border border-slate-200 dark:border-white/10'
                    }`}
                    style={{ 
                      backgroundColor: getDimensionColor(channel, 'channel'),
                      color: 'white',
                    }}
                  >
                    {channel}
                  </span>
                  {isSole && (
                    <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Department Dimension */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Departments ({dimensionCounts.departmentCount})
            </span>
            {lens !== 'department' && (
              <button
                onClick={() => setLens('department')}
                className="text-xs text-sky-600 hover:text-sky-700 dark:text-sky-400"
              >
                View →
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {node.attributes.departments.map((department) => {
              const isPrimary = node.attributes.primaryDepartment === department;
              const isSole = isSinglePointOfFailure(department, 'department');
              return (
                <div
                  key={department}
                  className="group relative flex items-center gap-1"
                  title={isSole ? 'Only person in this department' : undefined}
                >
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      isPrimary 
                        ? 'ring-2 ring-sky-400 ring-offset-1' 
                        : 'border border-slate-200 dark:border-white/10'
                    }`}
                    style={{ 
                      backgroundColor: getDimensionColor(department, 'department'),
                      color: 'white',
                    }}
                  >
                    {department}
                  </span>
                  {isSole && (
                    <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/50 p-2 dark:border-white/10 dark:bg-slate-800/30">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-400">Total Assignments:</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {dimensionCounts.brandCount + dimensionCounts.channelCount + dimensionCounts.departmentCount}
            </span>
          </div>
          {dimensionCounts.brandCount + dimensionCounts.channelCount + dimensionCounts.departmentCount > 8 && (
            <div className="mt-1 text-[10px] text-amber-600 dark:text-amber-400">
              ⚠️ High overlap — consider splitting responsibilities
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



