'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Command } from 'cmdk';
import { useGraphStore } from '@/store/graph-store';
import { LENSES } from '@/lib/schema/lenses';
import { ROLE_TEMPLATES } from '@/lib/schema/templates';
import {
  MagnifyingGlassIcon,
  PersonIcon,
  LayersIcon,
  PlusIcon,
  CopyIcon,
  TrashIcon,
  LockClosedIcon,
  LockOpen1Icon,
  MixerHorizontalIcon,
  DownloadIcon,
  ReloadIcon,
  TargetIcon,
  ComponentInstanceIcon,
} from '@radix-ui/react-icons';

type CommandAction = {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  shortcut?: string;
  onSelect: () => void;
  category: 'navigation' | 'actions' | 'lens' | 'edit' | 'view';
};

export function CommandPalette() {
  const isOpen = useGraphStore((state) => state.isCommandPaletteOpen);
  const toggleCommandPalette = useGraphStore((state) => state.toggleCommandPalette);
  const nodes = useGraphStore((state) => state.document.nodes);
  const lens = useGraphStore((state) => state.document.lens);
  const setLens = useGraphStore((state) => state.setLens);
  const selection = useGraphStore((state) => state.selection);
  const selectNode = useGraphStore((state) => state.selectNode);
  const clearSelection = useGraphStore((state) => state.clearSelection);
  const addPerson = useGraphStore((state) => state.addPerson);
  const removeNode = useGraphStore((state) => state.removeNode);
  const duplicateNodes = useGraphStore((state) => state.duplicateNodes);
  const toggleNodeLock = useGraphStore((state) => state.toggleNodeLock);
  const autoLayout = useGraphStore((state) => state.autoLayout);
  const undo = useGraphStore((state) => state.undo);
  const redo = useGraphStore((state) => state.redo);
  const exportDocument = useGraphStore((state) => state.exportDocument);
  const resetToDemo = useGraphStore((state) => state.resetToDemo);
  const toggleGrid = useGraphStore((state) => state.toggleGrid);
  const toggleSnap = useGraphStore((state) => state.toggleSnap);
  const copyNodesById = useGraphStore((state) => state.copyNodesById);
  const enterPathFinderMode = useGraphStore((state) => state.enterPathFinderMode);
  const enterExplorerMode = useGraphStore((state) => state.enterExplorerMode);

  const [search, setSearch] = useState('');

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        toggleCommandPalette(false);
        setSearch('');
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, toggleCommandPalette]);

  // Reset search when opening
  useEffect(() => {
    if (isOpen) {
      setSearch('');
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    toggleCommandPalette(false);
    setSearch('');
  }, [toggleCommandPalette]);

  const handleExport = useCallback(() => {
    const doc = exportDocument();
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${doc.metadata.name.replace(/\s+/g, '-').toLowerCase()}-graph.json`;
    link.click();
    URL.revokeObjectURL(url);
    handleClose();
  }, [exportDocument, handleClose]);

  // Build all available commands
  const commands = useMemo<CommandAction[]>(() => {
    const cmds: CommandAction[] = [];

    // Navigation - Jump to any person
    nodes
      .filter((node) => node.kind === 'person')
      .forEach((node) => {
        cmds.push({
          id: `nav-${node.id}`,
          label: node.name,
          description: node.attributes.title,
          icon: <PersonIcon className="h-4 w-4" />,
          category: 'navigation',
          onSelect: () => {
            selectNode(node.id);
            handleClose();
          },
        });
      });

    // Lens switching
    LENSES.forEach((lensOption) => {
      cmds.push({
        id: `lens-${lensOption.id}`,
        label: `Switch to ${lensOption.label}`,
        description: lensOption.description,
        icon: <LayersIcon className="h-4 w-4" />,
        shortcut: lensOption.shortcut,
        category: 'lens',
        onSelect: () => {
          setLens(lensOption.id);
          handleClose();
        },
      });
    });

    // Actions - Add person from templates
    ROLE_TEMPLATES.forEach((template) => {
      cmds.push({
        id: `add-${template.id}`,
        label: `Add ${template.label}`,
        description: template.description,
        icon: <PlusIcon className="h-4 w-4" />,
        category: 'actions',
        onSelect: () => {
          addPerson({
            name: template.defaultName,
            title: template.defaultTitle,
            tier: template.tier,
            brands: template.suggestedBrands || [],
            channels: template.suggestedChannels || [],
            departments: template.suggestedDepartments || [],
            tags: [],
          });
          handleClose();
        },
      });
    });

    // General actions
    cmds.push(
      {
        id: 'action-auto-layout',
        label: 'Auto Layout',
        description: 'Automatically arrange all nodes',
        icon: <ComponentInstanceIcon className="h-4 w-4" />,
        category: 'actions',
        onSelect: () => {
          autoLayout(lens);
          handleClose();
        },
      },
      {
        id: 'action-export',
        label: 'Export JSON',
        description: 'Download current graph as JSON',
        icon: <DownloadIcon className="h-4 w-4" />,
        category: 'actions',
        onSelect: handleExport,
      },
      {
        id: 'action-reset-demo',
        label: 'Reset to Demo',
        description: 'Load the default demo data',
        icon: <ReloadIcon className="h-4 w-4" />,
        category: 'actions',
        onSelect: () => {
          resetToDemo();
          handleClose();
        },
      },
      {
        id: 'action-undo',
        label: 'Undo',
        description: 'Undo last action',
        shortcut: '⌘Z',
        category: 'actions',
        onSelect: () => {
          undo();
          handleClose();
        },
      },
      {
        id: 'action-redo',
        label: 'Redo',
        description: 'Redo last action',
        shortcut: '⌘⇧Z',
        category: 'actions',
        onSelect: () => {
          redo();
          handleClose();
        },
      },
      {
        id: 'action-clear-selection',
        label: 'Clear Selection',
        description: 'Deselect all nodes and edges',
        shortcut: 'Esc',
        category: 'actions',
        onSelect: () => {
          clearSelection();
          handleClose();
        },
      }
    );

    // Contextual edit commands (when nodes are selected)
    if (selection.nodeIds.length > 0) {
      cmds.push(
        {
          id: 'edit-duplicate',
          label: `Duplicate ${selection.nodeIds.length > 1 ? 'Nodes' : 'Node'}`,
          description: `Duplicate ${selection.nodeIds.length} selected node(s)`,
          icon: <CopyIcon className="h-4 w-4" />,
          shortcut: '⌘D',
          category: 'edit',
          onSelect: () => {
            duplicateNodes(selection.nodeIds);
            handleClose();
          },
        },
        {
          id: 'edit-delete',
          label: `Delete ${selection.nodeIds.length > 1 ? 'Nodes' : 'Node'}`,
          description: `Remove ${selection.nodeIds.length} selected node(s)`,
          icon: <TrashIcon className="h-4 w-4" />,
          shortcut: 'Delete',
          category: 'edit',
          onSelect: () => {
            selection.nodeIds.forEach((id) => removeNode(id));
            handleClose();
          },
        },
        {
          id: 'edit-copy',
          label: 'Copy',
          description: 'Copy selected nodes to clipboard',
          shortcut: '⌘C',
          category: 'edit',
          onSelect: () => {
            copyNodesById(selection.nodeIds, selection.edgeIds);
            handleClose();
          },
        }
      );

      // Lock/unlock for single selection
      if (selection.nodeIds.length === 1) {
        const selectedNode = nodes.find((n) => n.id === selection.nodeIds[0]);
        const isLocked = selectedNode?.locked ?? false;
        cmds.push({
          id: 'edit-toggle-lock',
          label: isLocked ? 'Unlock Node' : 'Lock Node',
          description: isLocked ? 'Allow node to be moved' : 'Prevent node from moving',
          icon: isLocked ? <LockOpen1Icon className="h-4 w-4" /> : <LockClosedIcon className="h-4 w-4" />,
          category: 'edit',
          onSelect: () => {
            toggleNodeLock(selection.nodeIds[0]);
            handleClose();
          },
        });
      }
    }

    // View commands
    cmds.push(
      {
        id: 'view-toggle-grid',
        label: 'Toggle Grid',
        description: 'Show/hide background grid',
        icon: <MixerHorizontalIcon className="h-4 w-4" />,
        category: 'view',
        onSelect: () => {
          toggleGrid(lens);
          handleClose();
        },
      },
      {
        id: 'view-toggle-snap',
        label: 'Toggle Snap to Grid',
        description: 'Enable/disable grid snapping',
        icon: <TargetIcon className="h-4 w-4" />,
        category: 'view',
        onSelect: () => {
          toggleSnap(lens);
          handleClose();
        },
      }
    );

    // Path finder commands
    cmds.push({
      id: 'action-path-finder',
      label: 'Find Path Between People',
      description: 'Open path finder to explore connections',
      icon: <MagnifyingGlassIcon className="h-4 w-4" />,
      shortcut: 'P',
      category: 'actions',
      onSelect: () => {
        enterPathFinderMode();
        handleClose();
      },
    });

    // Explorer mode for selected node
    if (selection.nodeIds.length === 1) {
      const selectedNode = nodes.find((n) => n.id === selection.nodeIds[0]);
      if (selectedNode) {
        cmds.push({
          id: 'action-explore-network',
          label: `Explore Network for ${selectedNode.name}`,
          description: 'Show connections and sphere of influence',
          icon: <ComponentInstanceIcon className="h-4 w-4" />,
          shortcut: 'E',
          category: 'actions',
          onSelect: () => {
            enterExplorerMode(selection.nodeIds[0]);
            handleClose();
          },
        });
      }
    }

    return cmds;
  }, [
    nodes,
    lens,
    selection,
    selectNode,
    setLens,
    addPerson,
    autoLayout,
    handleExport,
    resetToDemo,
    undo,
    redo,
    clearSelection,
    duplicateNodes,
    removeNode,
    toggleNodeLock,
    toggleGrid,
    toggleSnap,
    copyNodesById,
    enterPathFinderMode,
    enterExplorerMode,
    handleClose,
  ]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups = {
      navigation: commands.filter((c) => c.category === 'navigation'),
      lens: commands.filter((c) => c.category === 'lens'),
      actions: commands.filter((c) => c.category === 'actions'),
      edit: commands.filter((c) => c.category === 'edit'),
      view: commands.filter((c) => c.category === 'view'),
    };
    return groups;
  }, [commands]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/80 pt-[15vh] backdrop-blur-sm">
      <Command
        className="command-palette-container w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl dark:bg-slate-900"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            handleClose();
          }
        }}
      >
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 dark:border-white/10">
          <MagnifyingGlassIcon className="h-5 w-5 text-slate-400" />
          <Command.Input
            value={search}
            onValueChange={setSearch}
            placeholder="Search people, actions, lenses..."
            className="flex h-14 w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white"
            autoFocus
          />
        </div>

        <Command.List className="max-h-[400px] overflow-y-auto p-2">
          <Command.Empty className="flex items-center justify-center py-8 text-sm text-slate-500">
            No results found.
          </Command.Empty>

          {groupedCommands.navigation.length > 0 && (
            <Command.Group
              heading="People"
              className="mb-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-slate-500"
            >
              {groupedCommands.navigation.map((cmd) => (
                <CommandItem key={cmd.id} command={cmd} />
              ))}
            </Command.Group>
          )}

          {groupedCommands.lens.length > 0 && (
            <Command.Group
              heading="Lenses"
              className="mb-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-slate-500"
            >
              {groupedCommands.lens.map((cmd) => (
                <CommandItem key={cmd.id} command={cmd} />
              ))}
            </Command.Group>
          )}

          {groupedCommands.actions.length > 0 && (
            <Command.Group
              heading="Actions"
              className="mb-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-slate-500"
            >
              {groupedCommands.actions.map((cmd) => (
                <CommandItem key={cmd.id} command={cmd} />
              ))}
            </Command.Group>
          )}

          {groupedCommands.edit.length > 0 && (
            <Command.Group
              heading="Edit"
              className="mb-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-slate-500"
            >
              {groupedCommands.edit.map((cmd) => (
                <CommandItem key={cmd.id} command={cmd} />
              ))}
            </Command.Group>
          )}

          {groupedCommands.view.length > 0 && (
            <Command.Group
              heading="View"
              className="mb-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-slate-500"
            >
              {groupedCommands.view.map((cmd) => (
                <CommandItem key={cmd.id} command={cmd} />
              ))}
            </Command.Group>
          )}
        </Command.List>

        <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500 dark:border-white/10">
          <div className="flex items-center justify-between">
            <span>Navigate with ↑↓ · Select with ↵ · Close with Esc</span>
            <kbd className="rounded border border-slate-200 px-2 py-0.5 font-mono dark:border-white/10">
              ⌘K
            </kbd>
          </div>
        </div>
      </Command>
    </div>
  );
}

function CommandItem({ command }: { command: CommandAction }) {
  return (
    <Command.Item
      value={`${command.label} ${command.description || ''}`}
      onSelect={command.onSelect}
      className="group flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors aria-selected:bg-slate-100 dark:aria-selected:bg-slate-800"
    >
      <div className="flex items-center gap-3">
        {command.icon && (
          <span className="text-slate-400 group-aria-selected:text-slate-600 dark:group-aria-selected:text-slate-300">
            {command.icon}
          </span>
        )}
        <div className="flex flex-col">
          <span className="font-medium text-slate-900 dark:text-white">{command.label}</span>
          {command.description && (
            <span className="text-xs text-slate-500 dark:text-slate-400">{command.description}</span>
          )}
        </div>
      </div>
      {command.shortcut && (
        <kbd className="rounded border border-slate-200 px-2 py-0.5 font-mono text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
          {command.shortcut}
        </kbd>
      )}
    </Command.Item>
  );
}
