'use client';

import { useMemo, useState, useCallback } from 'react';
import { TrashIcon, CopyIcon, CheckIcon, Cross2Icon } from '@radix-ui/react-icons';
import { useGraphStore } from '@/store/graph-store';
import type { PersonNode } from '@/lib/schema/types';
import { DEMO_LENS_LABELS } from '@/data/demo-graph';

export function BulkOperationsPanel() {
  const nodes = useGraphStore((state) => state.document.nodes);
  const selection = useGraphStore((state) => state.selection);
  const duplicateNodes = useGraphStore((state) => state.duplicateNodes);
  const copyNodesById = useGraphStore((state) => state.copyNodesById);
  const removeNode = useGraphStore((state) => state.removeNode);
  const updatePerson = useGraphStore((state) => state.updatePerson);
  const clearSelection = useGraphStore((state) => state.clearSelection);

  const [showTagEditor, setShowTagEditor] = useState(false);
  const [showMatrixEditor, setShowMatrixEditor] = useState(false);
  const [tagType, setTagType] = useState<'brands' | 'channels' | 'departments'>('brands');
  const [newTagValue, setNewTagValue] = useState('');
  const [matrixOperation, setMatrixOperation] = useState<'add' | 'remove' | 'set-primary' | null>(null);
  const [matrixDimension, setMatrixDimension] = useState<'brands' | 'channels' | 'departments'>('brands');
  const [matrixValue, setMatrixValue] = useState('');

  const selectedPersonNodes = useMemo(() => {
    return nodes.filter(
      (n): n is PersonNode => n.kind === 'person' && selection.nodeIds.includes(n.id)
    );
  }, [nodes, selection.nodeIds]);

  // Extract unique values for tag suggestions
  const availableTags = useMemo(() => {
    const brands = new Set<string>();
    const channels = new Set<string>();
    const departments = new Set<string>();

    nodes.forEach((node) => {
      if (node.kind === 'person') {
        node.attributes.brands.forEach((b) => brands.add(b));
        node.attributes.channels.forEach((c) => channels.add(c));
        node.attributes.departments.forEach((d) => departments.add(d));
      }
    });

    return {
      brands: Array.from(brands).sort(),
      channels: Array.from(channels).sort(),
      departments: Array.from(departments).sort(),
    };
  }, [nodes]);

  const handleBulkDelete = useCallback(() => {
    if (window.confirm(`Delete ${selectedPersonNodes.length} selected person(s)?`)) {
      selectedPersonNodes.forEach((node) => removeNode(node.id));
      clearSelection();
    }
  }, [selectedPersonNodes, removeNode, clearSelection]);

  const handleBulkDuplicate = useCallback(() => {
    duplicateNodes(selection.nodeIds);
  }, [duplicateNodes, selection.nodeIds]);

  const handleBulkCopy = useCallback(() => {
    copyNodesById(selection.nodeIds, selection.edgeIds);
  }, [copyNodesById, selection.nodeIds, selection.edgeIds]);

  const handleAddTag = useCallback(() => {
    if (!newTagValue.trim()) return;

    selectedPersonNodes.forEach((node) => {
      const currentTags = node.attributes[tagType];
      if (!currentTags.includes(newTagValue.trim())) {
        updatePerson(node.id, {
          attributes: {
            ...node.attributes,
            [tagType]: [...currentTags, newTagValue.trim()],
          },
        });
      }
    });

    setNewTagValue('');
    setShowTagEditor(false);
  }, [selectedPersonNodes, tagType, newTagValue, updatePerson]);

  const handleBulkMatrixOperation = useCallback(() => {
    if (!matrixValue.trim() || !matrixOperation || !matrixDimension) return;

    selectedPersonNodes.forEach((node) => {
      const current = node.attributes[matrixDimension];
      
      if (matrixOperation === 'add') {
        if (!current.includes(matrixValue.trim())) {
          updatePerson(node.id, {
            attributes: {
              ...node.attributes,
              [matrixDimension]: [...current, matrixValue.trim()],
            },
          });
        }
      } else if (matrixOperation === 'remove') {
        updatePerson(node.id, {
          attributes: {
            ...node.attributes,
            [matrixDimension]: current.filter((v) => v !== matrixValue.trim()),
          },
        });
      } else if (matrixOperation === 'set-primary') {
        if (current.includes(matrixValue.trim())) {
          const key = matrixDimension === 'brands' ? 'primaryBrand' :
                       matrixDimension === 'channels' ? 'primaryChannel' : 'primaryDepartment';
          updatePerson(node.id, {
            attributes: {
              ...node.attributes,
              [key]: matrixValue.trim(),
            },
          });
        }
      }
    });

    setMatrixValue('');
    setShowMatrixEditor(false);
    setMatrixOperation(null);
  }, [selectedPersonNodes, matrixOperation, matrixDimension, matrixValue, updatePerson]);

  // Get common tags across selected nodes
  const commonTags = useMemo(() => {
    if (selectedPersonNodes.length === 0) return { brands: [], channels: [], departments: [] };

    const brands = new Set(selectedPersonNodes[0].attributes.brands);
    const channels = new Set(selectedPersonNodes[0].attributes.channels);
    const departments = new Set(selectedPersonNodes[0].attributes.departments);

    selectedPersonNodes.slice(1).forEach((node) => {
      node.attributes.brands.forEach((b) => {
        if (!brands.has(b)) brands.delete(b);
      });
      node.attributes.channels.forEach((c) => {
        if (!channels.has(c)) channels.delete(c);
      });
      node.attributes.departments.forEach((d) => {
        if (!departments.has(d)) departments.delete(d);
      });
    });

    return {
      brands: Array.from(brands),
      channels: Array.from(channels),
      departments: Array.from(departments),
    };
  }, [selectedPersonNodes]);

  const handleRemoveTag = useCallback((tag: string) => {
    selectedPersonNodes.forEach((node) => {
      const currentTags = node.attributes[tagType];
      if (currentTags.includes(tag)) {
        updatePerson(node.id, {
          attributes: {
            ...node.attributes,
            [tagType]: currentTags.filter((t) => t !== tag),
          },
        });
      }
    });
  }, [selectedPersonNodes, tagType, updatePerson]);

  if (selectedPersonNodes.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-6 z-40 w-80 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur dark:border-white/10 dark:bg-slate-900/95">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 text-xs font-bold text-white">
            {selectedPersonNodes.length}
          </div>
          <span className="text-sm font-semibold text-slate-900 dark:text-white">
            {selectedPersonNodes.length === 1 ? 'Person' : 'People'} Selected
          </span>
        </div>
        <button
          onClick={clearSelection}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        >
          <Cross2Icon className="h-4 w-4" />
        </button>
      </div>

      {/* Bulk Actions */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        <button
          onClick={handleBulkCopy}
          className="flex flex-col items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          title="Copy"
        >
          <CopyIcon className="h-4 w-4" />
          <span>Copy</span>
        </button>
        <button
          onClick={handleBulkDuplicate}
          className="flex flex-col items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          title="Duplicate"
        >
          <CopyIcon className="h-4 w-4" />
          <span>Duplicate</span>
        </button>
        <button
          onClick={handleBulkDelete}
          className="flex flex-col items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 transition hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-900/20 dark:text-rose-300 dark:hover:bg-rose-900/30"
          title="Delete"
        >
          <TrashIcon className="h-4 w-4" />
          <span>Delete</span>
        </button>
      </div>

      {/* Matrix Operations */}
      {showMatrixEditor ? (
        <div className="mb-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Bulk Matrix Assignment
            </span>
            <button
              onClick={() => {
                setShowMatrixEditor(false);
                setMatrixOperation(null);
              }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <Cross2Icon className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2">
            <select
              value={matrixDimension}
              onChange={(e) => setMatrixDimension(e.target.value as 'brands' | 'channels' | 'departments')}
              className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs dark:border-white/10 dark:bg-slate-900"
            >
              <option value="brands">Brand</option>
              <option value="channels">Channel</option>
              <option value="departments">Department</option>
            </select>

            <div className="flex gap-2">
              <button
                onClick={() => setMatrixOperation('add')}
                className={`flex-1 rounded border px-2 py-1 text-xs font-medium transition ${
                  matrixOperation === 'add'
                    ? 'border-sky-500 bg-sky-50 text-sky-700 dark:border-sky-400 dark:bg-sky-900/30 dark:text-sky-300'
                    : 'border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300'
                }`}
              >
                Add
              </button>
              <button
                onClick={() => setMatrixOperation('remove')}
                className={`flex-1 rounded border px-2 py-1 text-xs font-medium transition ${
                  matrixOperation === 'remove'
                    ? 'border-sky-500 bg-sky-50 text-sky-700 dark:border-sky-400 dark:bg-sky-900/30 dark:text-sky-300'
                    : 'border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300'
                }`}
              >
                Remove
              </button>
              <button
                onClick={() => setMatrixOperation('set-primary')}
                className={`flex-1 rounded border px-2 py-1 text-xs font-medium transition ${
                  matrixOperation === 'set-primary'
                    ? 'border-sky-500 bg-sky-50 text-sky-700 dark:border-sky-400 dark:bg-sky-900/30 dark:text-sky-300'
                    : 'border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300'
                }`}
              >
                Set Primary
              </button>
            </div>

            {matrixOperation && (
              <>
                <select
                  value={matrixValue}
                  onChange={(e) => setMatrixValue(e.target.value)}
                  className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs dark:border-white/10 dark:bg-slate-900"
                >
                  <option value="">Select {matrixDimension.slice(0, -1)}...</option>
                  {(matrixDimension === 'brands' 
                    ? availableTags.brands 
                    : matrixDimension === 'channels' 
                      ? availableTags.channels 
                      : availableTags.departments).map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleBulkMatrixOperation}
                  disabled={!matrixValue.trim()}
                  className="w-full rounded bg-sky-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply to {selectedPersonNodes.length} selected
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowMatrixEditor(true)}
          className="mb-4 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          Bulk Matrix Operations
        </button>
      )}

      {/* Tag Editor */}
      {showTagEditor ? (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-slate-800">
          <div className="flex items-center gap-2">
            <select
              value={tagType}
              onChange={(e) => setTagType(e.target.value as 'brands' | 'channels' | 'departments')}
              className="flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs dark:border-white/10 dark:bg-slate-900"
            >
              <option value="brands">Brand</option>
              <option value="channels">Channel</option>
              <option value="departments">Department</option>
            </select>
            <button
              onClick={() => setShowTagEditor(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <Cross2Icon className="h-4 w-4" />
            </button>
          </div>

          {/* Suggested tags */}
          {availableTags[tagType].length > 0 && (
            <div>
              <div className="mb-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                Suggestions:
              </div>
              <div className="flex flex-wrap gap-1">
                {availableTags[tagType].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setNewTagValue(tag)}
                    className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600 transition hover:bg-slate-100 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Add tag input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newTagValue}
              onChange={(e) => setNewTagValue(e.target.value)}
              placeholder={`Add ${tagType}...`}
              className="flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs focus:border-sky-500 focus:outline-none dark:border-white/10 dark:bg-slate-900 dark:text-white"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddTag();
                }
              }}
            />
            <button
              onClick={handleAddTag}
              className="rounded bg-sky-500 px-3 py-1 text-xs font-medium text-white transition hover:bg-sky-600"
            >
              Add
            </button>
          </div>

          {/* Common tags display */}
          {commonTags[tagType].length > 0 && (
            <div>
              <div className="mb-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                Common to all selected:
              </div>
              <div className="flex flex-wrap gap-1">
                {commonTags[tagType].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleRemoveTag(tag)}
                    className="flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs text-sky-700 transition hover:bg-sky-100 dark:border-sky-500/30 dark:bg-sky-900/30 dark:text-sky-300"
                  >
                    {tag}
                    <Cross2Icon className="h-3 w-3" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => setShowTagEditor(true)}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          Edit Tags
        </button>
      )}
    </div>
  );
}

