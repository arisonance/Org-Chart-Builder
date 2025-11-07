'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  PlusIcon,
  Cross2Icon,
  Pencil1Icon,
  TrashIcon,
  CheckIcon,
  LayersIcon,
} from '@radix-ui/react-icons';
import { useGraphStore } from '@/store/graph-store';
import { LENS_BY_ID } from '@/lib/schema/lenses';

export function PinViewManager() {
  const pinViews = useGraphStore((state) => state.pinViews);
  const activePinViewId = useGraphStore((state) => state.activePinViewId);
  const currentLens = useGraphStore((state) => state.document.lens);
  const createPinView = useGraphStore((state) => state.createPinView);
  const restorePinView = useGraphStore((state) => state.restorePinView);
  const deletePinView = useGraphStore((state) => state.deletePinView);
  const renamePinView = useGraphStore((state) => state.renamePinView);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingPinViewId, setEditingPinViewId] = useState<string | null>(null);

  // Filter pin views for current lens
  const pinViewsForLens = Object.values(pinViews).filter(
    (pinView) => pinView.lens === currentLens
  );
  const activePinView = activePinViewId ? pinViews[activePinViewId] : null;

  const handleCreate = (name: string) => {
    createPinView(name, currentLens);
    setCreateDialogOpen(false);
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-200 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:border-white/20 dark:hover:text-white"
            title="Pin View - Save and restore layout arrangements"
          >
            <LayersIcon className="h-4 w-4" />
            <span>
              {activePinView && activePinView.lens === currentLens
                ? activePinView.name
                : pinViewsForLens.length > 0
                  ? `${pinViewsForLens.length} Pinned`
                  : 'Pin View'}
            </span>
            <span className="text-xs">▼</span>
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="z-50 min-w-[280px] rounded-xl border border-slate-200 bg-white/95 p-2 shadow-xl backdrop-blur dark:border-white/10 dark:bg-slate-900/95"
            sideOffset={8}
          >
            <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Pin Views ({LENS_BY_ID[currentLens].label})
            </div>

            {pinViewsForLens.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-slate-500">
                No pin views yet
              </div>
            ) : (
              pinViewsForLens.map((pinView) => (
                <DropdownMenu.Item
                  key={pinView.id}
                  className="group flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
                  onSelect={() => restorePinView(pinView.id)}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    {activePinViewId === pinView.id && (
                      <CheckIcon className="h-4 w-4 flex-shrink-0 text-emerald-600" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{pinView.name}</div>
                      <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {new Date(pinView.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 gap-1 opacity-0 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingPinViewId(pinView.id);
                      }}
                      className="rounded p-1 hover:bg-slate-200 dark:hover:bg-slate-700"
                      title="Rename"
                    >
                      <Pencil1Icon className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete pin view "${pinView.name}"?`)) {
                          deletePinView(pinView.id);
                        }
                      }}
                      className="rounded p-1 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-500/20"
                      title="Delete"
                    >
                      <TrashIcon className="h-3 w-3" />
                    </button>
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
              Pin Current View
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <CreatePinViewDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreate={handleCreate}
      />

      {editingPinViewId && pinViews[editingPinViewId] && (
        <EditPinViewDialog
          pinView={pinViews[editingPinViewId]}
          onClose={() => setEditingPinViewId(null)}
          onSave={(name) => {
            renamePinView(editingPinViewId, name);
            setEditingPinViewId(null);
          }}
        />
      )}
    </div>
  );
}

function CreatePinViewDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreate(name.trim());
      setName('');
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900">
          <Dialog.Title className="text-xl font-semibold text-slate-900 dark:text-white">
            Pin Current View
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Save the current layout arrangement as a pin view. You can restore it later to quickly return to this arrangement.
          </Dialog.Description>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="pin-view-name"
                className="block text-sm font-semibold text-slate-700 dark:text-slate-200"
              >
                Pin View Name
              </label>
              <input
                id="pin-view-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-white/10 dark:bg-slate-800 dark:text-white"
                placeholder="My Custom Layout"
                autoFocus
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
                Pin View
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

function EditPinViewDialog({
  pinView,
  onClose,
  onSave,
}: {
  pinView: { id: string; name: string };
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState(pinView.name);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim());
    }
  };

  return (
    <Dialog.Root open={true} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900">
          <Dialog.Title className="text-xl font-semibold text-slate-900 dark:text-white">
            Rename Pin View
          </Dialog.Title>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="edit-pin-view-name"
                className="block text-sm font-semibold text-slate-700 dark:text-slate-200"
              >
                Pin View Name
              </label>
              <input
                id="edit-pin-view-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-white/10 dark:bg-slate-800 dark:text-white"
                autoFocus
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

