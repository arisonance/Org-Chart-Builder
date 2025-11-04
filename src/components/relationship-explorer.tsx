'use client';

import { useMemo } from 'react';
import { Cross2Icon, PersonIcon } from '@radix-ui/react-icons';
import { useGraphStore } from '@/store/graph-store';
import {
  getSphereOfInfluence,
  getDirectConnections,
  calculateCentrality,
} from '@/lib/graph/network-analysis';
import type { PersonNode } from '@/lib/schema/types';
import { RELATIONSHIP_COLORS } from '@/lib/theme/palette';

export function RelationshipExplorer() {
  const nodes = useGraphStore((state) => state.document.nodes);
  const edges = useGraphStore((state) => state.document.edges);
  const explorerMode = useGraphStore((state) => state.explorerMode);
  const exitExplorerMode = useGraphStore((state) => state.exitExplorerMode);
  const selectNode = useGraphStore((state) => state.selectNode);

  const personNodes = useMemo(
    () => nodes.filter((n): n is PersonNode => n.kind === 'person'),
    [nodes],
  );

  const focusNode = useMemo(() => {
    if (!explorerMode?.focusNodeId) return null;
    return personNodes.find((n) => n.id === explorerMode.focusNodeId) || null;
  }, [explorerMode, personNodes]);

  const networkData = useMemo(() => {
    if (!focusNode) return null;

    const sphere = getSphereOfInfluence(focusNode.id, edges, explorerMode?.depth || 2);
    const directConnections = getDirectConnections(focusNode.id, edges);
    const centrality = calculateCentrality(focusNode.id, personNodes, edges);

    // Group connections by type
    const connectionsByType = {
      manager: directConnections.filter((c) => c.relationshipType === 'manager'),
      sponsor: directConnections.filter((c) => c.relationshipType === 'sponsor'),
      dotted: directConnections.filter((c) => c.relationshipType === 'dotted'),
    };

    // Separate reports (where focus node is source) from managers (where focus node is target)
    const reports = edges.filter(
      (e) => e.source === focusNode.id && e.metadata.type === 'manager',
    );
    const managers = edges.filter(
      (e) => e.target === focusNode.id && e.metadata.type === 'manager',
    );

    return {
      sphere: Array.from(sphere).filter((id) => id !== focusNode.id),
      directConnections,
      connectionsByType,
      centrality,
      reports,
      managers,
    };
  }, [focusNode, edges, personNodes, explorerMode]);

  if (!explorerMode?.active || !focusNode || !networkData) return null;

  return (
    <div className="fixed left-6 top-24 z-40 w-80 rounded-2xl border border-slate-200 bg-white/95 shadow-2xl backdrop-blur dark:border-white/10 dark:bg-slate-900/95">
      {/* Header */}
      <div className="border-b border-slate-200 px-4 py-3 dark:border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PersonIcon className="h-5 w-5 text-indigo-600" />
            <h3 className="font-semibold text-slate-900 dark:text-white">Network Explorer</h3>
          </div>
          <button
            type="button"
            onClick={exitExplorerMode}
            className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <Cross2Icon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Focus Node Info */}
      <div className="border-b border-slate-200 bg-gradient-to-br from-indigo-50 to-sky-50 px-4 py-3 dark:border-white/10 dark:from-indigo-950/50 dark:to-sky-950/50">
        <div className="mb-2 font-semibold text-slate-900 dark:text-white">{focusNode.name}</div>
        <div className="text-sm text-slate-600 dark:text-slate-300">{focusNode.attributes.title}</div>
        <div className="mt-2 flex items-center gap-2">
          <div className="rounded-full bg-white px-2 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {networkData.sphere.length} in network
          </div>
          <div className="rounded-full bg-white px-2 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {(networkData.centrality * 100).toFixed(0)}% centrality
          </div>
        </div>
      </div>

      {/* Connection Stats */}
      <div className="border-b border-slate-200 p-4 dark:border-white/10">
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Direct Connections
        </h4>
        <div className="space-y-2">
          {networkData.managers.length > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: RELATIONSHIP_COLORS.manager }}
                ></div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Managers
                </span>
              </div>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {networkData.managers.length}
              </span>
            </div>
          )}

          {networkData.reports.length > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: RELATIONSHIP_COLORS.manager }}
                ></div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Direct Reports
                </span>
              </div>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {networkData.reports.length}
              </span>
            </div>
          )}

          {networkData.connectionsByType.sponsor.length > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: RELATIONSHIP_COLORS.sponsor }}
                ></div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Sponsors
                </span>
              </div>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {networkData.connectionsByType.sponsor.length}
              </span>
            </div>
          )}

          {networkData.connectionsByType.dotted.length > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: RELATIONSHIP_COLORS.dotted }}
                ></div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Dotted Lines
                </span>
              </div>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {networkData.connectionsByType.dotted.length}
              </span>
            </div>
          )}

          {networkData.directConnections.length === 0 && (
            <div className="py-4 text-center text-sm text-slate-500">No direct connections</div>
          )}
        </div>
      </div>

      {/* Network Nodes */}
      <div className="max-h-64 overflow-y-auto p-4">
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Network ({networkData.sphere.length})
        </h4>
        <div className="space-y-1">
          {networkData.sphere.slice(0, 10).map((nodeId) => {
            const node = personNodes.find((n) => n.id === nodeId);
            if (!node) return null;
            return (
              <button
                key={nodeId}
                onClick={() => selectNode(nodeId)}
                className="w-full rounded-lg px-3 py-2 text-left text-sm transition hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <div className="font-medium text-slate-900 dark:text-white">{node.name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {node.attributes.title}
                </div>
              </button>
            );
          })}
          {networkData.sphere.length > 10 && (
            <div className="pt-2 text-center text-xs text-slate-500">
              +{networkData.sphere.length - 10} more
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

