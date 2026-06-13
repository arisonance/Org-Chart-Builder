'use client';

import { useMemo } from 'react';
import { Cross2Icon } from '@radix-ui/react-icons';
import { useGraphStore } from '@/store/graph-store';
import { computeScenarioDiff, categorizeChanges, getChangeDescription } from '@/lib/scenario/diff';
import { computeOrgMetrics } from '@/lib/graph/org-metrics';

export function ScenarioComparison() {
  const scenarios = useGraphStore((state) => state.scenarios);
  const activeScenarioId = useGraphStore((state) => state.activeScenarioId);
  const comparisonScenarioId = useGraphStore((state) => state.comparisonScenarioId);
  const clearComparison = useGraphStore((state) => state.clearComparison);

  const diff = useMemo(() => {
    if (!activeScenarioId || !comparisonScenarioId) return null;
    const baseScenario = scenarios[activeScenarioId];
    const targetScenario = scenarios[comparisonScenarioId];
    if (!baseScenario || !targetScenario) return null;

    return computeScenarioDiff(baseScenario.document, targetScenario.document);
  }, [scenarios, activeScenarioId, comparisonScenarioId]);

  const categories = useMemo(() => {
    if (!diff) return [];
    return categorizeChanges(diff);
  }, [diff]);

  // Org-health delta between the two scenarios (the "reorg consequences")
  const { impact, impact_gaps } = useMemo(() => {
    const base = activeScenarioId ? scenarios[activeScenarioId] : null;
    const target = comparisonScenarioId ? scenarios[comparisonScenarioId] : null;
    if (!base || !target) {
      return { impact: null, impact_gaps: { opened: [], closed: [] } };
    }
    const a = computeOrgMetrics(base.document.nodes, base.document.edges);
    const b = computeOrgMetrics(target.document.nodes, target.document.edges);
    const gapKey = (g: { brand: string; channel: string }) => `${g.brand} × ${g.channel}`;
    const aGaps = new Set(a.coverageGaps.map(gapKey));
    const bGaps = new Set(b.coverageGaps.map(gapKey));
    return {
      impact: [
        { label: "Largest span", before: a.spanMax, after: b.spanMax, delta: b.spanMax - a.spanMax, good: b.spanMax <= a.spanMax },
        { label: "Overloaded mgrs", before: a.overloadedManagers.length, after: b.overloadedManagers.length, delta: b.overloadedManagers.length - a.overloadedManagers.length, good: b.overloadedManagers.length <= a.overloadedManagers.length },
        { label: "Heavy matrix load", before: a.heavyMatrix.length, after: b.heavyMatrix.length, delta: b.heavyMatrix.length - a.heavyMatrix.length, good: b.heavyMatrix.length <= a.heavyMatrix.length },
        { label: "Coverage gaps", before: a.coverageGaps.length, after: b.coverageGaps.length, delta: b.coverageGaps.length - a.coverageGaps.length, good: b.coverageGaps.length <= a.coverageGaps.length },
        { label: "Org depth", before: a.maxDepth, after: b.maxDepth, delta: b.maxDepth - a.maxDepth, good: b.maxDepth <= a.maxDepth },
      ],
      impact_gaps: {
        opened: [...bGaps].filter((g) => !aGaps.has(g)),
        closed: [...aGaps].filter((g) => !bGaps.has(g)),
      },
    };
  }, [scenarios, activeScenarioId, comparisonScenarioId]);

  if (!comparisonScenarioId || !diff) {
    return null;
  }

  const baseScenario = activeScenarioId ? scenarios[activeScenarioId] : null;
  const targetScenario = scenarios[comparisonScenarioId];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-6 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-white/10">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Scenario Comparison
            </h2>
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <span className="rounded-full bg-slate-100 px-3 py-1 font-medium dark:bg-slate-800">
                {baseScenario?.name || 'Current'}
              </span>
              <span>vs</span>
              <span className="rounded-full bg-sky-100 px-3 py-1 font-medium dark:bg-sky-900/50">
                {targetScenario?.name}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={clearComparison}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <Cross2Icon className="h-5 w-5" />
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 border-b border-slate-200 bg-slate-50 px-6 py-4 dark:border-white/10 dark:bg-slate-900/50">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-900/20">
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {diff.summary.nodesAdded + diff.summary.edgesAdded}
            </div>
            <div className="text-sm font-medium text-emerald-600 dark:text-emerald-500">
              Additions
            </div>
            <div className="mt-1 text-xs text-emerald-600/70 dark:text-emerald-500/70">
              {diff.summary.nodesAdded} people, {diff.summary.edgesAdded} relationships
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-900/20">
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
              {diff.summary.nodesModified + diff.summary.edgesModified}
            </div>
            <div className="text-sm font-medium text-amber-600 dark:text-amber-500">
              Modifications
            </div>
            <div className="mt-1 text-xs text-amber-600/70 dark:text-amber-500/70">
              {diff.summary.nodesModified} people, {diff.summary.edgesModified} relationships
            </div>
          </div>

          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/50 dark:bg-rose-900/20">
            <div className="text-2xl font-bold text-rose-700 dark:text-rose-400">
              {diff.summary.nodesRemoved + diff.summary.edgesRemoved}
            </div>
            <div className="text-sm font-medium text-rose-600 dark:text-rose-500">Removals</div>
            <div className="mt-1 text-xs text-rose-600/70 dark:text-rose-500/70">
              {diff.summary.nodesRemoved} people, {diff.summary.edgesRemoved} relationships
            </div>
          </div>
        </div>

        {/* Structural impact: how the reorg moves the org-health needle */}
        {impact && (
          <div className="border-b border-slate-200 px-6 py-4 dark:border-white/10">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Structural Impact
            </h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
              {impact.map((row) => (
                <div
                  key={row.label}
                  className="rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-900/50"
                >
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-slate-900 dark:text-white">{row.after}</span>
                    {row.delta !== 0 && (
                      <span
                        className={`text-xs font-semibold ${
                          row.good ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {row.delta > 0 ? "+" : ""}
                        {row.delta}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {row.label} <span className="text-slate-300 dark:text-slate-600">· was {row.before}</span>
                  </div>
                </div>
              ))}
            </div>
            {(impact_gaps.opened.length > 0 || impact_gaps.closed.length > 0) && (
              <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                {impact_gaps.closed.map((g) => (
                  <span key={`c-${g}`} className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                    Closed gap: {g}
                  </span>
                ))}
                {impact_gaps.opened.map((g) => (
                  <span key={`o-${g}`} className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 font-medium text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300">
                    Opened gap: {g}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Change Details */}
        <div className="flex-1 overflow-y-auto px-6 py-4 [transform:translateZ(0)]">
          <div className="space-y-6">
            {categories.map((category) => (
              <div key={category.type}>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {category.type === 'people'
                    ? 'People Changes'
                    : category.type === 'relationships'
                    ? 'Relationship Changes'
                    : 'Attribute Changes'}
                </h3>
                <div className="space-y-2">
                  {category.changes.map((change, idx) => (
                    <div
                      key={idx}
                      className={`rounded-lg border p-3 ${
                        change.severity === 'high'
                          ? 'border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-900/20'
                          : change.severity === 'medium'
                          ? 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/20'
                          : 'border-slate-200 bg-white dark:border-white/10 dark:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900 dark:text-white">
                            {change.description}
                          </p>
                          {change.nodeIds.length > 0 && (
                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              Affects {change.nodeIds.length} node{change.nodeIds.length !== 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                        <span
                          className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${
                            change.severity === 'high'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300'
                              : change.severity === 'medium'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {change.severity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {categories.length === 0 && (
              <div className="flex h-full items-center justify-center py-12 text-center">
                <div>
                  <p className="text-lg font-medium text-slate-600 dark:text-slate-300">
                    No differences found
                  </p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    These scenarios are identical
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 dark:border-white/10 dark:bg-slate-900/50">
          <div className="flex items-center gap-6 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-emerald-500"></div>
              <span>Added</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-amber-500"></div>
              <span>Modified</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-rose-500"></div>
              <span>Removed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

