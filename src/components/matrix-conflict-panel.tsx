'use client';

import { useMemo } from 'react';
import { ExclamationTriangleIcon, CheckCircledIcon } from '@radix-ui/react-icons';
import { useGraphStore } from '@/store/graph-store';
import type { PersonNode } from '@/lib/schema/types';

export function MatrixConflictPanel() {
  const nodes = useGraphStore((state) => state.document.nodes);
  const selectNode = useGraphStore((state) => state.selectNode);

  const conflicts = useMemo(() => {
    const personNodes = nodes.filter((n): n is PersonNode => n.kind === 'person');
    
    const issues: Array<{
      type: 'overlap' | 'missing' | 'primary_mismatch';
      severity: 'high' | 'medium' | 'low';
      node: PersonNode;
      message: string;
    }> = [];

    personNodes.forEach((node) => {
      const totalAssignments = node.attributes.brands.length + 
                               node.attributes.channels.length + 
                               node.attributes.departments.length;

      // High overlap warning
      if (totalAssignments > 8) {
        issues.push({
          type: 'overlap',
          severity: 'high',
          node,
          message: `Appears in ${totalAssignments} total dimensions — consider splitting responsibilities`,
        });
      } else if (totalAssignments > 6) {
        issues.push({
          type: 'overlap',
          severity: 'medium',
          node,
          message: `Appears in ${totalAssignments} dimensions — monitor workload`,
        });
      }

      // Missing assignments
      const missingCount = [
        node.attributes.brands.length === 0,
        node.attributes.channels.length === 0,
        node.attributes.departments.length === 0,
      ].filter(Boolean).length;

      if (missingCount > 0) {
        const missing = [];
        if (node.attributes.brands.length === 0) missing.push('brand');
        if (node.attributes.channels.length === 0) missing.push('channel');
        if (node.attributes.departments.length === 0) missing.push('department');
        
        issues.push({
          type: 'missing',
          severity: missingCount >= 2 ? 'high' : 'medium',
          node,
          message: `Missing ${missing.join(' and ')} assignment${missing.length > 1 ? 's' : ''}`,
        });
      }

      // Primary dimension mismatch
      if (node.attributes.primaryBrand && !node.attributes.brands.includes(node.attributes.primaryBrand)) {
        issues.push({
          type: 'primary_mismatch',
          severity: 'high',
          node,
          message: `Primary brand "${node.attributes.primaryBrand}" not in assigned brands`,
        });
      }
      
      if (node.attributes.primaryChannel && !node.attributes.channels.includes(node.attributes.primaryChannel)) {
        issues.push({
          type: 'primary_mismatch',
          severity: 'high',
          node,
          message: `Primary channel "${node.attributes.primaryChannel}" not in assigned channels`,
        });
      }
      
      if (node.attributes.primaryDepartment && !node.attributes.departments.includes(node.attributes.primaryDepartment)) {
        issues.push({
          type: 'primary_mismatch',
          severity: 'high',
          node,
          message: `Primary department "${node.attributes.primaryDepartment}" not in assigned departments`,
        });
      }

      // Single point of failure detection
      const brandOverlaps = new Map<string, number>();
      const channelOverlaps = new Map<string, number>();
      const deptOverlaps = new Map<string, number>();

      personNodes.forEach((other) => {
        if (other.id === node.id) return;
        node.attributes.brands.forEach((b) => {
          if (other.attributes.brands.includes(b)) {
            brandOverlaps.set(b, (brandOverlaps.get(b) || 0) + 1);
          }
        });
        node.attributes.channels.forEach((c) => {
          if (other.attributes.channels.includes(c)) {
            channelOverlaps.set(c, (channelOverlaps.get(c) || 0) + 1);
          }
        });
        node.attributes.departments.forEach((d) => {
          if (other.attributes.departments.includes(d)) {
            deptOverlaps.set(d, (deptOverlaps.get(d) || 0) + 1);
          }
        });
      });

      const soleBrands = node.attributes.brands.filter(b => (brandOverlaps.get(b) || 0) === 0);
      const soleChannels = node.attributes.channels.filter(c => (channelOverlaps.get(c) || 0) === 0);
      const soleDepts = node.attributes.departments.filter(d => (deptOverlaps.get(d) || 0) === 0);

      if (soleBrands.length > 0 || soleChannels.length > 0 || soleDepts.length > 0) {
        const sole = [];
        if (soleBrands.length > 0) sole.push(`${soleBrands.length} brand${soleBrands.length > 1 ? 's' : ''}`);
        if (soleChannels.length > 0) sole.push(`${soleChannels.length} channel${soleChannels.length > 1 ? 's' : ''}`);
        if (soleDepts.length > 0) sole.push(`${soleDepts.length} department${soleDepts.length > 1 ? 's' : ''}`);
        
        issues.push({
          type: 'overlap',
          severity: 'low',
          node,
          message: `Only person in ${sole.join(', ')} — potential single point of failure`,
        });
      }
    });

    return issues.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }, [nodes]);

  if (conflicts.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-900/20">
        <div className="flex items-center gap-2">
          <CheckCircledIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <div>
            <div className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
              No Matrix Conflicts
            </div>
            <div className="text-xs text-emerald-700 dark:text-emerald-300">
              All assignments look good!
            </div>
          </div>
        </div>
      </div>
    );
  }

  const highSeverity = conflicts.filter(c => c.severity === 'high');
  const mediumSeverity = conflicts.filter(c => c.severity === 'medium');
  const lowSeverity = conflicts.filter(c => c.severity === 'low');

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm ring-1 ring-black/5 dark:border-white/10 dark:bg-slate-950/70 dark:ring-white/10">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Matrix Conflicts
          </h3>
        </div>
        <div className="flex gap-2 text-xs">
          {highSeverity.length > 0 && (
            <span className="rounded-full bg-rose-100 px-2 py-0.5 font-semibold text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
              {highSeverity.length} High
            </span>
          )}
          {mediumSeverity.length > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              {mediumSeverity.length} Medium
            </span>
          )}
          {lowSeverity.length > 0 && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {lowSeverity.length} Low
            </span>
          )}
        </div>
      </div>

      <div className="max-h-96 space-y-2 overflow-y-auto">
        {conflicts.map((conflict, idx) => {
          const severityColors = {
            high: 'border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-900/20',
            medium: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20',
            low: 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/30',
          };

          return (
            <button
              key={`${conflict.node.id}-${idx}`}
              onClick={() => selectNode(conflict.node.id)}
              className={`w-full rounded-lg border p-3 text-left transition hover:shadow-sm ${severityColors[conflict.severity]}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {conflict.node.name}
                  </div>
                  <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    {conflict.message}
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                  conflict.severity === 'high' 
                    ? 'bg-rose-600 text-white dark:bg-rose-700' 
                    : conflict.severity === 'medium'
                      ? 'bg-amber-600 text-white dark:bg-amber-700'
                      : 'bg-slate-600 text-white dark:bg-slate-700'
                }`}>
                  {conflict.severity}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}



