'use client';

import { useMemo, useState } from 'react';
import { Cross2Icon, BarChartIcon, PersonIcon } from '@radix-ui/react-icons';
import { useGraphStore } from '@/store/graph-store';
import {
  calculateSpanMetrics,
  getLeadersOverThreshold,
  getAverageSpan,
  getSpanDistribution,
  DEFAULT_THRESHOLDS,
  type SpanMetrics,
} from '@/lib/analytics/span-of-control';
import type { PersonNode } from '@/lib/schema/types';

export function AnalyticsSidebar() {
  const nodes = useGraphStore((state) => state.document.nodes);
  const edges = useGraphStore((state) => state.document.edges);
  const selectNode = useGraphStore((state) => state.selectNode);
  const [isOpen, setIsOpen] = useState(false);

  const personNodes = useMemo(
    () => nodes.filter((n): n is PersonNode => n.kind === 'person'),
    [nodes],
  );

  const metrics = useMemo(
    () => calculateSpanMetrics(nodes, edges),
    [nodes, edges],
  );

  const criticalLeaders = useMemo(
    () => getLeadersOverThreshold(metrics, 'critical'),
    [metrics],
  );

  const highLeaders = useMemo(
    () => getLeadersOverThreshold(metrics, 'high').filter((m) => m.status === 'high'),
    [metrics],
  );

  const averageSpan = useMemo(() => getAverageSpan(metrics), [metrics]);

  const distribution = useMemo(() => getSpanDistribution(metrics), [metrics]);

  const managersCount = metrics.filter((m) => m.directReports > 0).length;

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-30 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-lg transition hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        title="Show Analytics"
      >
        <BarChartIcon className="h-5 w-5" />
        Analytics
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-30 w-96 rounded-2xl border border-slate-200 bg-white/95 shadow-2xl backdrop-blur dark:border-white/10 dark:bg-slate-900/95">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-white/10">
        <div className="flex items-center gap-2">
          <BarChartIcon className="h-5 w-5 text-sky-600" />
          <h3 className="font-semibold text-slate-900 dark:text-white">Org Analytics</h3>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <Cross2Icon className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="max-h-[600px] overflow-y-auto p-4">
        {/* Summary Stats */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-slate-800/50">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {managersCount}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">Managers</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-slate-800/50">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {averageSpan.toFixed(1)}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">Avg Span</div>
          </div>
        </div>

        {/* Critical Leaders */}
        {criticalLeaders.length > 0 && (
          <div className="mb-4">
            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-rose-700 dark:text-rose-400">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-xs dark:bg-rose-900/50">
                {criticalLeaders.length}
              </span>
              Critical Span ({DEFAULT_THRESHOLDS.critical}+ reports)
            </h4>
            <div className="space-y-2">
              {criticalLeaders.slice(0, 5).map((metric) => {
                const node = personNodes.find((n) => n.id === metric.nodeId);
                if (!node) return null;
                return (
                  <button
                    key={metric.nodeId}
                    onClick={() => {
                      selectNode(metric.nodeId);
                      setIsOpen(false);
                    }}
                    className="w-full rounded-lg border border-rose-200 bg-rose-50 p-3 text-left transition hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-900/20 dark:hover:bg-rose-900/40"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-slate-900 dark:text-white">
                          {node.name}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-300">
                          {node.attributes.title}
                        </div>
                      </div>
                      <div className="ml-2 flex flex-col items-end gap-1">
                        <div className="rounded-full bg-rose-600 px-2 py-0.5 text-xs font-bold text-white">
                          {metric.directReports}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Team: {metric.totalTeamSize}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* High Leaders */}
        {highLeaders.length > 0 && (
          <div className="mb-4">
            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs dark:bg-amber-900/50">
                {highLeaders.length}
              </span>
              High Span ({DEFAULT_THRESHOLDS.high}-{DEFAULT_THRESHOLDS.critical - 1} reports)
            </h4>
            <div className="space-y-2">
              {highLeaders.slice(0, 5).map((metric) => {
                const node = personNodes.find((n) => n.id === metric.nodeId);
                if (!node) return null;
                return (
                  <button
                    key={metric.nodeId}
                    onClick={() => {
                      selectNode(metric.nodeId);
                      setIsOpen(false);
                    }}
                    className="w-full rounded-lg border border-amber-200 bg-amber-50 p-3 text-left transition hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-900/20 dark:hover:bg-amber-900/40"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-slate-900 dark:text-white">
                          {node.name}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-300">
                          {node.attributes.title}
                        </div>
                      </div>
                      <div className="ml-2 flex flex-col items-end gap-1">
                        <div className="rounded-full bg-amber-600 px-2 py-0.5 text-xs font-bold text-white">
                          {metric.directReports}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Team: {metric.totalTeamSize}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Distribution */}
        <div>
          <h4 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            Distribution
          </h4>
          <div className="space-y-2">
            {Object.entries(distribution)
              .filter(([_, count]) => count > 0)
              .map(([range, count]) => {
                const percentage = managersCount > 0 ? (count / managersCount) * 100 : 0;
                return (
                  <div key={range} className="flex items-center gap-2">
                    <div className="w-16 text-xs font-medium text-slate-600 dark:text-slate-400">
                      {range === '0' ? 'No reports' : `${range} reports`}
                    </div>
                    <div className="flex-1">
                      <div className="h-6 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full bg-gradient-to-r from-sky-400 to-sky-600"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-12 text-right text-xs font-semibold text-slate-900 dark:text-white">
                      {count}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Policy Guide */}
        <div className="mt-4 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
          <div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
            Span of Control Guide
          </div>
          <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span>Healthy: ≤{DEFAULT_THRESHOLDS.healthy} direct reports</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500"></span>
              <span>
                High: {DEFAULT_THRESHOLDS.healthy + 1}-{DEFAULT_THRESHOLDS.critical - 1} direct
                reports
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-rose-500"></span>
              <span>Critical: {DEFAULT_THRESHOLDS.critical}+ direct reports</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

