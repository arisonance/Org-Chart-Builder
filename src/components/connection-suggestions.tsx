'use client';

import { useMemo } from 'react';
import { LightningBoltIcon, PlusIcon } from '@radix-ui/react-icons';
import { useGraphStore } from '@/store/graph-store';
import { suggestConnections } from '@/lib/graph/network-analysis';
import type { PersonNode } from '@/lib/schema/types';

export function ConnectionSuggestions({ nodeId }: { nodeId: string }) {
  const nodes = useGraphStore((state) => state.document.nodes);
  const edges = useGraphStore((state) => state.document.edges);
  const addRelationship = useGraphStore((state) => state.addRelationship);

  const personNodes = useMemo(
    () => nodes.filter((n): n is PersonNode => n.kind === 'person'),
    [nodes],
  );

  const suggestions = useMemo(() => {
    return suggestConnections(nodeId, personNodes, edges);
  }, [nodeId, personNodes, edges]);

  if (suggestions.length === 0) return null;

  const handleAddConnection = (targetId: string) => {
    addRelationship(nodeId, targetId, 'dotted');
  };

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-900/20">
      <div className="mb-3 flex items-center gap-2">
        <LightningBoltIcon className="h-4 w-4 text-amber-600" />
        <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
          Suggested Connections
        </h4>
      </div>
      <div className="space-y-2">
        {suggestions.map((suggestion) => {
          const targetNode = personNodes.find((n) => n.id === suggestion.targetId);
          if (!targetNode) return null;

          return (
            <div
              key={suggestion.targetId}
              className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-white p-3 dark:border-amber-800 dark:bg-amber-950/30"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-slate-900 dark:text-white">
                  {targetNode.name}
                </div>
                <div className="truncate text-xs text-slate-600 dark:text-slate-300">
                  {targetNode.attributes.title}
                </div>
                <div className="mt-1 truncate text-xs text-amber-700 dark:text-amber-400">
                  {suggestion.reason}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleAddConnection(suggestion.targetId)}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-600 text-white transition hover:bg-amber-700"
                title="Add dotted line connection"
              >
                <PlusIcon className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

