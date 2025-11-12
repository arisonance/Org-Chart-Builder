'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Cross2Icon, CheckIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { useGraphStore } from '@/store/graph-store';
import { DEMO_LENS_LABELS } from '@/data/demo-graph';
import type { PersonNode, NodeRoleTier, GraphEdge } from '@/lib/schema/types';

// Simple helper to count direct reports
function getDirectReports(nodeId: string, edges: GraphEdge[]): GraphEdge[] {
  return edges.filter(edge => edge.metadata.type === 'manager' && edge.source === nodeId);
}

const TIER_OPTIONS: Array<{ value: NodeRoleTier; label: string }> = [
  { value: 'c-suite', label: 'C-Suite' },
  { value: 'vp', label: 'VP' },
  { value: 'director', label: 'Director' },
  { value: 'manager', label: 'Manager' },
  { value: 'ic', label: 'Individual Contributor' },
];

type InlineCardEditorProps = {
  node: PersonNode;
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
};

export function InlineCardEditor({ node, isOpen, onClose, position }: InlineCardEditorProps) {
  const updatePerson = useGraphStore((state) => state.updatePerson);
  const pushHistory = useGraphStore((state) => state.pushHistory);
  const edges = useGraphStore((state) => state.document.edges);

  const [name, setName] = useState(node.name);
  const [title, setTitle] = useState(node.attributes.title);
  const [tier, setTier] = useState<NodeRoleTier>(node.attributes.tier || 'manager');
  const [brands, setBrands] = useState<string[]>(node.attributes.brands);
  const [channels, setChannels] = useState<string[]>(node.attributes.channels);
  const [departments, setDepartments] = useState<string[]>(node.attributes.departments);
  const [location, setLocation] = useState(node.attributes.location || '');
  const [costCenter, setCostCenter] = useState(node.attributes.costCenter || '');

  const hasChanges = useRef(false);
  const historyTaken = useRef(false);

  // Reset when node changes
  useEffect(() => {
    setName(node.name);
    setTitle(node.attributes.title);
    setTier(node.attributes.tier || 'manager');
    setBrands(node.attributes.brands);
    setChannels(node.attributes.channels);
    setDepartments(node.attributes.departments);
    setLocation(node.attributes.location || '');
    setCostCenter(node.attributes.costCenter || '');
    hasChanges.current = false;
    historyTaken.current = false;
  }, [node]);

  const directReportCount = getDirectReports(node.id, edges).length;

  const handleSave = useCallback(() => {
    if (!hasChanges.current) {
      onClose();
      return;
    }

    if (!historyTaken.current) {
      pushHistory();
    }

    updatePerson(
      node.id,
      {
        name: name.trim(),
        attributes: {
          ...node.attributes,
          title: title.trim(),
          tier,
          brands,
          channels,
          departments,
          location: location.trim() || undefined,
          costCenter: costCenter.trim() || undefined,
        },
      },
      { recordHistory: false }
    );

    onClose();
  }, [
    name,
    title,
    tier,
    brands,
    channels,
    departments,
    location,
    costCenter,
    node,
    updatePerson,
    pushHistory,
    onClose,
  ]);

  const handleFieldChange = () => {
    if (!historyTaken.current) {
      pushHistory();
      historyTaken.current = true;
    }
    hasChanges.current = true;
  };

  const toggleArrayValue = (array: string[], value: string, setter: (arr: string[]) => void) => {
    handleFieldChange();
    if (array.includes(value)) {
      setter(array.filter((item) => item !== value));
    } else {
      setter([...array, value]);
    }
  };

  // Validation
  const showSpanWarning = directReportCount > 8;
  const showSpanCritical = directReportCount > 12;

  return (
    <Popover.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Popover.Anchor
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          width: 1,
          height: 1,
        }}
      />
      <Popover.Portal>
        <Popover.Content
          className="z-50 w-96 rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-900"
          sideOffset={5}
          align="center"
          onEscapeKeyDown={onClose}
          onPointerDownOutside={handleSave}
        >
          <div className="max-h-[600px] overflow-y-auto p-5">
            {/* Header */}
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Quick Edit</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Click outside or press ESC to save
                </p>
              </div>
              <button
                type="button"
                onClick={handleSave}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <Cross2Icon className="h-4 w-4" />
              </button>
            </div>

            {/* Span of Control Warning */}
            {directReportCount > 0 && (
              <div
                className={`mb-4 rounded-lg p-3 ${
                  showSpanCritical
                    ? 'bg-rose-50 dark:bg-rose-900/20'
                    : showSpanWarning
                    ? 'bg-amber-50 dark:bg-amber-900/20'
                    : 'bg-emerald-50 dark:bg-emerald-900/20'
                }`}
              >
                <div className="flex items-center gap-2">
                  {showSpanCritical || showSpanWarning ? (
                    <ExclamationTriangleIcon
                      className={
                        showSpanCritical ? 'h-4 w-4 text-rose-600' : 'h-4 w-4 text-amber-600'
                      }
                    />
                  ) : (
                    <CheckIcon className="h-4 w-4 text-emerald-600" />
                  )}
                  <div className="flex-1">
                    <div
                      className={`text-sm font-semibold ${
                        showSpanCritical
                          ? 'text-rose-800 dark:text-rose-300'
                          : showSpanWarning
                          ? 'text-amber-800 dark:text-amber-300'
                          : 'text-emerald-800 dark:text-emerald-300'
                      }`}
                    >
                      {directReportCount} Direct Report{directReportCount !== 1 ? 's' : ''}
                    </div>
                    <div
                      className={`text-xs ${
                        showSpanCritical
                          ? 'text-rose-600 dark:text-rose-400'
                          : showSpanWarning
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {showSpanCritical
                        ? 'Critical span - consider delegating'
                        : showSpanWarning
                        ? 'High span - monitor closely'
                        : 'Healthy span of control'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Fields */}
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    handleFieldChange();
                    setName(e.target.value);
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-white/10 dark:bg-slate-800 dark:text-white"
                  autoFocus
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    handleFieldChange();
                    setTitle(e.target.value);
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-white/10 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Tier
                </label>
                <select
                  value={tier}
                  onChange={(e) => {
                    handleFieldChange();
                    setTier(e.target.value as NodeRoleTier);
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-white/10 dark:bg-slate-800 dark:text-white"
                >
                  {TIER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Brands
                </label>
                <div className="flex flex-wrap gap-2">
                  {DEMO_LENS_LABELS.brand.map((brand) => (
                    <button
                      key={brand}
                      type="button"
                      onClick={() => toggleArrayValue(brands, brand, setBrands)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                        brands.includes(brand)
                          ? 'bg-sky-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                      }`}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Channels
                </label>
                <div className="flex flex-wrap gap-2">
                  {DEMO_LENS_LABELS.channel.map((channel) => (
                    <button
                      key={channel}
                      type="button"
                      onClick={() => toggleArrayValue(channels, channel, setChannels)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                        channels.includes(channel)
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                      }`}
                    >
                      {channel}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Departments
                </label>
                <div className="flex flex-wrap gap-2">
                  {DEMO_LENS_LABELS.department.map((dept) => (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => toggleArrayValue(departments, dept, setDepartments)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                        departments.includes(dept)
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                      }`}
                    >
                      {dept}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => {
                      handleFieldChange();
                      setLocation(e.target.value);
                    }}
                    placeholder="e.g., San Diego"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-white/10 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Cost Center
                  </label>
                  <input
                    type="text"
                    value={costCenter}
                    onChange={(e) => {
                      handleFieldChange();
                      setCostCenter(e.target.value);
                    }}
                    placeholder="e.g., CC-1001"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-white/10 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
              >
                Save Changes
              </button>
            </div>
          </div>

          <Popover.Arrow className="fill-white dark:fill-slate-900" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}


