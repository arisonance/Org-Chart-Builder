'use client';

import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Cross2Icon, CheckIcon, PlusIcon } from '@radix-ui/react-icons';
import { DEMO_LENS_LABELS } from '@/data/demo-graph';
import type { NodeRoleTier } from '@/lib/schema/types';

const TIER_OPTIONS: Array<{ value: NodeRoleTier; label: string }> = [
  { value: 'c-suite', label: 'C-Suite' },
  { value: 'vp', label: 'VP' },
  { value: 'director', label: 'Director' },
  { value: 'manager', label: 'Manager' },
  { value: 'ic', label: 'Individual Contributor' },
];

export type QuickAddPersonData = {
  name: string;
  title: string;
  tier: NodeRoleTier;
  primaryBrand?: string;
  primaryDepartment?: string;
  primaryChannel?: string;
  brands: string[];
  departments: string[];
  channels: string[];
  location?: string;
};

type QuickAddPersonDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: QuickAddPersonData) => void;
  mode: 'direct-report' | 'new-person';
  managerName?: string;
};

export function QuickAddPersonDialog({
  isOpen,
  onClose,
  onSave,
  mode,
  managerName,
}: QuickAddPersonDialogProps) {
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [tier, setTier] = useState<NodeRoleTier>('manager');
  const [primaryBrand, setPrimaryBrand] = useState<string>('');
  const [primaryDepartment, setPrimaryDepartment] = useState<string>('');
  const [primaryChannel, setPrimaryChannel] = useState<string>('');
  const [secondaryBrands, setSecondaryBrands] = useState<string[]>([]);
  const [secondaryDepartments, setSecondaryDepartments] = useState<string[]>([]);
  const [secondaryChannels, setSecondaryChannels] = useState<string[]>([]);
  const [location, setLocation] = useState('');

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setName('');
      setTitle('');
      setTier('manager');
      setPrimaryBrand('');
      setPrimaryDepartment('');
      setPrimaryChannel('');
      setSecondaryBrands([]);
      setSecondaryDepartments([]);
      setSecondaryChannels([]);
      setLocation('');
    }
  }, [isOpen]);

  const handleSave = () => {
    if (!name.trim() || !title.trim()) {
      return;
    }

    // Build final lists: primary + secondaries
    const allBrands = primaryBrand
      ? [primaryBrand, ...secondaryBrands.filter((b) => b !== primaryBrand)]
      : secondaryBrands;
    const allDepartments = primaryDepartment
      ? [primaryDepartment, ...secondaryDepartments.filter((d) => d !== primaryDepartment)]
      : secondaryDepartments;
    const allChannels = primaryChannel
      ? [primaryChannel, ...secondaryChannels.filter((c) => c !== primaryChannel)]
      : secondaryChannels;

    onSave({
      name: name.trim(),
      title: title.trim(),
      tier,
      primaryBrand: primaryBrand || undefined,
      primaryDepartment: primaryDepartment || undefined,
      primaryChannel: primaryChannel || undefined,
      brands: allBrands,
      departments: allDepartments,
      channels: allChannels,
      location: location.trim() || undefined,
    });

    onClose();
  };

  const toggleSecondary = (list: string[], item: string, setter: (arr: string[]) => void) => {
    if (list.includes(item)) {
      setter(list.filter((x) => x !== item));
    } else {
      setter([...list, item]);
    }
  };

  const isValid = name.trim() && title.trim();

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-900"
          onEscapeKeyDown={onClose}
        >
          <div className="max-h-[85vh] overflow-y-auto p-6">
            {/* Header */}
            <div className="mb-6 flex items-start justify-between">
              <div>
                <Dialog.Title className="text-2xl font-bold text-slate-900 dark:text-white">
                  {mode === 'direct-report' ? 'Add Direct Report' : 'Add New Person'}
                </Dialog.Title>
                {managerName && (
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Will report to {managerName}
                  </p>
                )}
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  aria-label="Close"
                >
                  <Cross2Icon className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>

            {/* Form */}
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Basic Information
                </h3>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Sarah Johnson"
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-white/10 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Senior Product Manager"
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-white/10 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Tier
                    </label>
                    <select
                      value={tier}
                      onChange={(e) => setTier(e.target.value as NodeRoleTier)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-white/10 dark:bg-slate-800 dark:text-white"
                    >
                      {TIER_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Location
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g., San Diego"
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-white/10 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
                    />
                  </div>
                </div>
              </div>

              <div className="h-px w-full bg-slate-200 dark:bg-white/10" />

              {/* Primary Department */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Primary Department
                  </h3>
                  <span className="text-xs text-slate-400">Select one</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {DEMO_LENS_LABELS.department.slice(0, 10).map((dept) => (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => setPrimaryDepartment(dept === primaryDepartment ? '' : dept)}
                      className={`group relative flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition ${
                        primaryDepartment === dept
                          ? 'border-purple-500 bg-purple-50 text-purple-900 dark:border-purple-400 dark:bg-purple-500/20 dark:text-purple-100'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-purple-300 hover:bg-purple-50/50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-purple-400/30 dark:hover:bg-purple-500/10'
                      }`}
                    >
                      <div
                        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition ${
                          primaryDepartment === dept
                            ? 'border-purple-500 bg-purple-500 dark:border-purple-400 dark:bg-purple-400'
                            : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800'
                        }`}
                      >
                        {primaryDepartment === dept && (
                          <CheckIcon className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <span className="flex-1 truncate">{dept}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Secondary Departments */}
              {primaryDepartment && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Secondary Departments
                    </h3>
                    <span className="text-xs text-slate-400">Optional</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {DEMO_LENS_LABELS.department
                      .filter((d) => d !== primaryDepartment)
                      .map((dept) => (
                        <button
                          key={dept}
                          type="button"
                          onClick={() =>
                            toggleSecondary(secondaryDepartments, dept, setSecondaryDepartments)
                          }
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                            secondaryDepartments.includes(dept)
                              ? 'border-purple-300 bg-purple-100 text-purple-800 dark:border-purple-400/30 dark:bg-purple-500/20 dark:text-purple-200'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-purple-200 hover:bg-purple-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-purple-400/20'
                          }`}
                        >
                          {secondaryDepartments.includes(dept) ? (
                            <CheckIcon className="h-3 w-3" />
                          ) : (
                            <PlusIcon className="h-3 w-3" />
                          )}
                          {dept}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-8 flex gap-3">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="flex-1 rounded-lg border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="button"
                onClick={handleSave}
                disabled={!isValid}
                className="flex-1 rounded-lg bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-sky-600"
              >
                {mode === 'direct-report' ? 'Add Direct Report' : 'Add Person'}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

