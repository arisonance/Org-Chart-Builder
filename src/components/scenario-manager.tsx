'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  PlusIcon,
  Cross2Icon,
  Pencil1Icon,
  TrashIcon,
  CopyIcon,
  CheckIcon,
} from '@radix-ui/react-icons';
import { useGraphStore } from '@/store/graph-store';

export function ScenarioManager() {
  const scenarios = useGraphStore((state) => state.scenarios);
  const activeScenarioId = useGraphStore((state) => state.activeScenarioId);
  const createScenario = useGraphStore((state) => state.createScenario);
  const switchScenario = useGraphStore((state) => state.switchScenario);
  const deleteScenario = useGraphStore((state) => state.deleteScenario);
  const renameScenario = useGraphStore((state) => state.renameScenario);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingScenarioId, setEditingScenarioId] = useState<string | null>(null);

  const scenarioList = Object.values(scenarios);
  const activeScenario = activeScenarioId ? scenarios[activeScenarioId] : null;

  const handleCreate = (name: string, description: string, fromCurrent: boolean) => {
    createScenario(name, description, fromCurrent);
    setCreateDialogOpen(false);
  };

  const handleDuplicate = (id: string) => {
    const scenario = scenarios[id];
    if (scenario) {
      // Switch to the scenario, then create a new one from it
      switchScenario(id);
      createScenario(`${scenario.name} (copy)`, scenario.description, true);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-200 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:border-white/20 dark:hover:text-white"
          >
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            {activeScenario ? activeScenario.name : 'No Scenario'}
            <span className="text-xs">▼</span>
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="z-50 min-w-[280px] rounded-xl border border-slate-200 bg-white/95 p-2 shadow-xl backdrop-blur dark:border-white/10 dark:bg-slate-900/95"
            sideOffset={8}
          >
            <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Scenarios
            </div>

            {scenarioList.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-slate-500">
                No scenarios yet
              </div>
            ) : (
              scenarioList.map((scenario) => (
                <DropdownMenu.Item
                  key={scenario.id}
                  className="group flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
                  onSelect={() => switchScenario(scenario.id)}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    {activeScenarioId === scenario.id && (
                      <CheckIcon className="h-4 w-4 flex-shrink-0 text-emerald-600" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{scenario.name}</div>
                      {scenario.description && (
                        <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {scenario.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 gap-1 opacity-0 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingScenarioId(scenario.id);
                      }}
                      className="rounded p-1 hover:bg-slate-200 dark:hover:bg-slate-700"
                      title="Edit"
                    >
                      <Pencil1Icon className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicate(scenario.id);
                      }}
                      className="rounded p-1 hover:bg-slate-200 dark:hover:bg-slate-700"
                      title="Duplicate"
                    >
                      <CopyIcon className="h-3 w-3" />
                    </button>
                    {scenarioList.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete scenario "${scenario.name}"?`)) {
                            deleteScenario(scenario.id);
                          }
                        }}
                        className="rounded p-1 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-500/20"
                        title="Delete"
                      >
                        <TrashIcon className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </DropdownMenu.Item>
              ))
            )}

            <DropdownMenu.Separator className="my-2 h-px bg-slate-200 dark:bg-white/10" />

            <DropdownMenu.Item
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-sky-600 outline-none hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-500/10"
              onSelect={() => setCreateDialogOpen(true)}
            >
              <PlusIcon className="h-4 w-4" />
              New Scenario
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <CreateScenarioDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreate={handleCreate}
      />

      {editingScenarioId && (
        <EditScenarioDialog
          scenario={scenarios[editingScenarioId]}
          onClose={() => setEditingScenarioId(null)}
          onSave={(name, description) => {
            renameScenario(editingScenarioId, name, description);
            setEditingScenarioId(null);
          }}
        />
      )}
    </div>
  );
}

function CreateScenarioDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, description: string, fromCurrent: boolean) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fromCurrent, setFromCurrent] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreate(name.trim(), description.trim(), fromCurrent);
      setName('');
      setDescription('');
      setFromCurrent(true);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900">
          <Dialog.Title className="text-xl font-semibold text-slate-900 dark:text-white">
            Create New Scenario
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Create a new organizational scenario to explore different structures.
          </Dialog.Description>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="scenario-name"
                className="block text-sm font-semibold text-slate-700 dark:text-slate-200"
              >
                Scenario Name
              </label>
              <input
                id="scenario-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-white/10 dark:bg-slate-800 dark:text-white"
                placeholder="Q2 2024 Reorganization"
                autoFocus
              />
            </div>

            <div>
              <label
                htmlFor="scenario-description"
                className="block text-sm font-semibold text-slate-700 dark:text-slate-200"
              >
                Description (Optional)
              </label>
              <textarea
                id="scenario-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-white/10 dark:bg-slate-800 dark:text-white"
                placeholder="Exploring the impact of..."
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="from-current"
                type="checkbox"
                checked={fromCurrent}
                onChange={(e) => setFromCurrent(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-2 focus:ring-sky-500/20"
              />
              <label htmlFor="from-current" className="text-sm text-slate-700 dark:text-slate-200">
                Copy from current state
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim()}
                className="flex-1 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50"
              >
                Create Scenario
              </button>
            </div>
          </form>

          <Dialog.Close asChild>
            <button
              type="button"
              className="absolute right-4 top-4 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="Close"
            >
              <Cross2Icon className="h-5 w-5" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function EditScenarioDialog({
  scenario,
  onClose,
  onSave,
}: {
  scenario: { id: string; name: string; description?: string };
  onClose: () => void;
  onSave: (name: string, description: string) => void;
}) {
  const [name, setName] = useState(scenario.name);
  const [description, setDescription] = useState(scenario.description || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim(), description.trim());
    }
  };

  return (
    <Dialog.Root open={true} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900">
          <Dialog.Title className="text-xl font-semibold text-slate-900 dark:text-white">
            Edit Scenario
          </Dialog.Title>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="edit-scenario-name"
                className="block text-sm font-semibold text-slate-700 dark:text-slate-200"
              >
                Scenario Name
              </label>
              <input
                id="edit-scenario-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-white/10 dark:bg-slate-800 dark:text-white"
                autoFocus
              />
            </div>

            <div>
              <label
                htmlFor="edit-scenario-description"
                className="block text-sm font-semibold text-slate-700 dark:text-slate-200"
              >
                Description
              </label>
              <textarea
                id="edit-scenario-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-white/10 dark:bg-slate-800 dark:text-white"
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim()}
                className="flex-1 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50"
              >
                Save Changes
              </button>
            </div>
          </form>

          <Dialog.Close asChild>
            <button
              type="button"
              className="absolute right-4 top-4 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="Close"
            >
              <Cross2Icon className="h-5 w-5" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

