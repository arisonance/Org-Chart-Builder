'use client';

import { useEffect, useMemo, useState } from 'react';
import { Cross2Icon, MagnifyingGlassIcon, ArrowRightIcon } from '@radix-ui/react-icons';
import { useGraphStore } from '@/store/graph-store';
import {
  findShortestPath,
  findAllPaths,
  getPathDescription,
  getSharedDimensions,
} from '@/lib/graph/pathfinding';
import type { PersonNode } from '@/lib/schema/types';

export function PathFinderPanel() {
  const nodes = useGraphStore((state) => state.document.nodes);
  const edges = useGraphStore((state) => state.document.edges);
  const pathFinderMode = useGraphStore((state) => state.pathFinderMode);
  const exitPathFinderMode = useGraphStore((state) => state.exitPathFinderMode);
  const setPathNodes = useGraphStore((state) => state.setPathNodes);
  const highlightPath = useGraphStore((state) => state.highlightPath);
  const clearHighlightedPath = useGraphStore((state) => state.clearHighlightedPath);

  const [sourceId, setSourceId] = useState<string>('');
  const [targetId, setTargetId] = useState<string>('');

  const personNodes = useMemo(
    () => nodes.filter((n): n is PersonNode => n.kind === 'person'),
    [nodes],
  );

  useEffect(() => {
    if (pathFinderMode) {
      setSourceId(pathFinderMode.sourceId || '');
      setTargetId(pathFinderMode.targetId || '');
    }
  }, [pathFinderMode]);

  useEffect(() => {
    setPathNodes(sourceId || null, targetId || null);
  }, [sourceId, targetId, setPathNodes]);

  const paths = useMemo(() => {
    if (!sourceId || !targetId || sourceId === targetId) return [];
    return findAllPaths(sourceId, targetId, edges, 4);
  }, [sourceId, targetId, edges]);

  const sharedDimensions = useMemo(() => {
    if (!sourceId || !targetId) return null;
    const source = personNodes.find((n) => n.id === sourceId);
    const target = personNodes.find((n) => n.id === targetId);
    if (!source || !target) return null;
    return getSharedDimensions(source, target);
  }, [sourceId, targetId, personNodes]);

  if (!pathFinderMode?.active) return null;

  const handleHighlightPath = (path: { nodes: Array<{ nodeId: string; edgeId?: string }> }) => {
    const nodeIds = path.nodes.map((n) => n.nodeId);
    const edgeIds = path.nodes.filter((n) => n.edgeId).map((n) => n.edgeId!);
    highlightPath(nodeIds, edgeIds);
  };

  return (
    <div className="fixed right-6 top-24 z-40 w-96 rounded-2xl border border-slate-200 bg-white/95 shadow-2xl backdrop-blur dark:border-white/10 dark:bg-slate-900/95">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-white/10">
        <div className="flex items-center gap-2">
          <MagnifyingGlassIcon className="h-5 w-5 text-sky-600" />
          <h3 className="font-semibold text-slate-900 dark:text-white">Path Finder</h3>
        </div>
        <button
          type="button"
          onClick={exitPathFinderMode}
          className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <Cross2Icon className="h-4 w-4" />
        </button>
      </div>

      {/* Source and Target Selection */}
      <div className="space-y-3 p-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
            From
          </label>
          <select
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-white/10 dark:bg-slate-800 dark:text-white"
          >
            <option value="">Select person...</option>
            {personNodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.name} - {node.attributes.title}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-center">
          <ArrowRightIcon className="h-5 w-5 text-slate-400" />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
            To
          </label>
          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-white/10 dark:bg-slate-800 dark:text-white"
          >
            <option value="">Select person...</option>
            {personNodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.name} - {node.attributes.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results */}
      {sourceId && targetId && sourceId !== targetId && (
        <div className="border-t border-slate-200 dark:border-white/10">
          {paths.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-slate-500">
              No connection found between these people
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto p-4">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Found {paths.length} Path{paths.length !== 1 ? 's' : ''}
                </h4>
                {sharedDimensions &&
                  (sharedDimensions.brands.length > 0 ||
                    sharedDimensions.channels.length > 0 ||
                    sharedDimensions.departments.length > 0) && (
                    <div className="flex gap-1">
                      {sharedDimensions.brands.length > 0 && (
                        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-900/50 dark:text-sky-300">
                          {sharedDimensions.brands.length} brand
                          {sharedDimensions.brands.length !== 1 ? 's' : ''}
                        </span>
                      )}
                      {sharedDimensions.channels.length > 0 && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                          {sharedDimensions.channels.length} channel
                          {sharedDimensions.channels.length !== 1 ? 's' : ''}
                        </span>
                      )}
                      {sharedDimensions.departments.length > 0 && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                          {sharedDimensions.departments.length} dept
                          {sharedDimensions.departments.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  )}
              </div>

              <div className="space-y-2">
                {paths.map((path, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleHighlightPath(path)}
                    className="w-full rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-sky-300 hover:bg-sky-50 dark:border-white/10 dark:bg-slate-800 dark:hover:border-sky-700 dark:hover:bg-sky-900/20"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Path {idx + 1}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                        {path.distance} hop{path.distance !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {path.nodes.map((node, nodeIdx) => {
                        const personNode = personNodes.find((n) => n.id === node.nodeId);
                        return (
                          <div key={nodeIdx} className="flex items-center gap-2 text-xs">
                            {nodeIdx > 0 && (
                              <span className="text-slate-400">
                                <ArrowRightIcon className="h-3 w-3" />
                              </span>
                            )}
                            <span className="font-medium text-slate-900 dark:text-white">
                              {personNode?.name || 'Unknown'}
                            </span>
                            {node.relationshipType && (
                              <span className="text-slate-500 dark:text-slate-400">
                                ({node.relationshipType})
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {(!sourceId || !targetId || sourceId === targetId) && (
        <div className="border-t border-slate-200 px-4 py-6 text-center text-sm text-slate-500 dark:border-white/10">
          Select two different people to find connections
        </div>
      )}
    </div>
  );
}

