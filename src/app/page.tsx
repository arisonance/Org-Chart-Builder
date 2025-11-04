'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { DownloadIcon, EnterFullScreenIcon, ExitFullScreenIcon, MixerHorizontalIcon, ReloadIcon, UploadIcon, MagnifyingGlassIcon, Component1Icon } from '@radix-ui/react-icons';
import { ZodError } from 'zod';
import { HierarchyCanvas } from '@/components/hierarchy-canvas';
import { EditorPanel } from '@/components/editor-panel';
import { LensSwitcher } from '@/components/lens-switcher';
import { CommandPalette } from '@/components/command-palette';
import { ScenarioManager } from '@/components/scenario-manager';
import { ScenarioComparison } from '@/components/scenario-comparison';
import { PathFinderPanel } from '@/components/path-finder-panel';
import { RelationshipExplorer } from '@/components/relationship-explorer';
import { AnalyticsSidebar } from '@/components/analytics-sidebar';
import { AIImportWizard } from '@/components/ai-import-wizard';
import { SearchFilterBar } from '@/components/search-filter-bar';
import { BulkOperationsPanel } from '@/components/bulk-operations-panel';
import { useGraphStore } from '@/store/graph-store';
import { LENS_BY_ID } from '@/lib/schema/lenses';
import { parseGraphDocument } from '@/lib/schema/validation';

export default function Home() {
  const documentMeta = useGraphStore((state) => state.document.metadata);
  const lens = useGraphStore((state) => state.document.lens);
  const setLens = useGraphStore((state) => state.setLens);
  const undo = useGraphStore((state) => state.undo);
  const redo = useGraphStore((state) => state.redo);
  const autoLayout = useGraphStore((state) => state.autoLayout);
  const exportDocument = useGraphStore((state) => state.exportDocument);
  const importDocument = useGraphStore((state) => state.importDocument);
  const resetToDemo = useGraphStore((state) => state.resetToDemo);
  const toggleCommandPalette = useGraphStore((state) => state.toggleCommandPalette);
  const scenarios = useGraphStore((state) => state.scenarios);
  const comparisonScenarioId = useGraphStore((state) => state.comparisonScenarioId);
  const setComparisonScenario = useGraphStore((state) => state.setComparisonScenario);
  const enterPathFinderMode = useGraphStore((state) => state.enterPathFinderMode);
  const enterExplorerMode = useGraphStore((state) => state.enterExplorerMode);
  const selection = useGraphStore((state) => state.selection);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isCanvasFullScreen, setCanvasFullScreen] = useState(false);
  const [showFullScreenPanel, setShowFullScreenPanel] = useState(false);
  const [showComparisonPicker, setShowComparisonPicker] = useState(false);
  const [showAIImport, setShowAIImport] = useState(false);

  const lensDescription = useMemo(() => LENS_BY_ID[lens].description, [lens]);

  const scenarioList = useMemo(() => Object.values(scenarios), [scenarios]);

  // Command palette keyboard shortcut (⌘/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleCommandPalette();
      }
      // Path finder mode (P key)
      if (e.key === 'p' && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
        e.preventDefault();
        enterPathFinderMode();
      }
      // Explorer mode (E key) - only if node is selected
      if (e.key === 'e' && !e.metaKey && !e.ctrlKey && !e.shiftKey && selection.nodeIds.length === 1) {
        e.preventDefault();
        enterExplorerMode(selection.nodeIds[0]);
      }
      // Quick dimension switcher (B, C, D keys)
      if ((e.key === 'b' || e.key === 'c' || e.key === 'd') && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        const target = e.target as HTMLElement;
        // Don't trigger if typing in an input
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
        e.preventDefault();
        if (e.key === 'b') setLens('brand');
        else if (e.key === 'c') setLens('channel');
        else if (e.key === 'd') setLens('department');
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggleCommandPalette, enterPathFinderMode, enterExplorerMode, selection.nodeIds, setLens]);

  useEffect(() => {
    if (isCanvasFullScreen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
    return undefined;
  }, [isCanvasFullScreen]);

  const handleExport = useCallback(() => {
    const doc = exportDocument();
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${doc.metadata.name.replace(/\s+/g, '-').toLowerCase()}-graph.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [exportDocument]);

  const handleImport = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const validated = parseGraphDocument(parsed);
      importDocument(validated);
    } catch (error) {
      console.error('Failed to import document', error);
      const message =
        error instanceof ZodError
          ? error.errors.map((issue) => issue.message).join('\n')
          : 'Unable to import file. Please ensure it is a valid export.';
      window.alert(message);
    } finally {
      event.target.value = '';
    }
  }, [importDocument]);

  return (
    <main className="min-h-screen bg-slate-100/70 pb-20 pt-14 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <CommandPalette />
      <ScenarioComparison />
      <PathFinderPanel />
      <RelationshipExplorer />
      <AnalyticsSidebar />
      <BulkOperationsPanel />
      {showAIImport && <AIImportWizard onClose={() => setShowAIImport(false)} />}
      {showComparisonPicker && (
        <ComparisonPickerDialog
          scenarios={scenarioList}
          onClose={() => setShowComparisonPicker(false)}
          onSelect={(id) => {
            setComparisonScenario(id);
            setShowComparisonPicker(false);
          }}
        />
      )}
      {isCanvasFullScreen ? (
        <FullScreenOverlay
          lens={lens}
          onClose={() => setCanvasFullScreen(false)}
          onTogglePanel={() => setShowFullScreenPanel((prev) => !prev)}
          panelVisible={showFullScreenPanel}
        />
      ) : null}
      <div className="mx-auto flex w-full max-w-none flex-col gap-10 px-6 sm:px-10 lg:px-16">
        <header className="relative isolate overflow-hidden rounded-[48px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 px-10 py-16 shadow-sm ring-1 ring-black/5 dark:border-white/10 dark:from-slate-900/80 dark:via-slate-950 dark:to-slate-900/60 dark:ring-white/10">
          <div className="absolute inset-0 -z-10 blur-2xl">
            <div className="absolute left-24 top-6 h-40 w-40 rounded-full bg-indigo-400/50" />
            <div className="absolute right-0 top-0 h-60 w-60 rounded-full bg-sky-300/40" />
            <div className="absolute bottom-0 left-10 h-48 w-48 rounded-full bg-amber-200/40" />
          </div>
          <div className="flex flex-col gap-8">
            <div className="max-w-3xl space-y-4">
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-500 ring-1 ring-black/5 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-400">
                {documentMeta.name}
              </span>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                Map Sonance’s matrix organization by brand, channel, and department with a canvas built for modern operators.
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-300">
                {documentMeta.description}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <LensSwitcher activeLens={lens} onChange={setLens} />
              <ScenarioManager />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ToolbarButton label="Undo" onClick={undo} />
              <ToolbarButton label="Redo" onClick={redo} />
              <ToolbarButton label="Auto layout" onClick={() => autoLayout(lens)} />
              <ToolbarButton label="Path Finder" onClick={enterPathFinderMode} icon={<MagnifyingGlassIcon className="h-4 w-4" />} />
              <ToolbarButton 
                label="Compare Scenarios" 
                onClick={() => setShowComparisonPicker(true)}
                disabled={scenarioList.length < 2}
                icon={<Component1Icon className="h-4 w-4" />}
              />
              <ToolbarButton 
                label="AI Import" 
                onClick={() => setShowAIImport(true)}
                icon={<MagnifyingGlassIcon className="h-4 w-4" />}
              />
              <ToolbarButton label="Export JSON" onClick={handleExport} icon={<DownloadIcon className="h-4 w-4" />} />
              <ToolbarButton
                label="Import JSON"
                onClick={() => fileInputRef.current?.click()}
                icon={<UploadIcon className="h-4 w-4" />}
              />
              <ToolbarButton
                label="Reset demo"
                onClick={resetToDemo}
                icon={<ReloadIcon className="h-4 w-4" />}
              />
            </div>
            <input
              type="file"
              accept="application/json"
              ref={fileInputRef}
              onChange={handleImport}
              className="hidden"
            />
            {/* Search and Filter Bar */}
            <SearchFilterBar />
            <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 ring-1 ring-black/5 backdrop-blur dark:border-white/10 dark:bg-slate-900/60 dark:ring-white/10 sm:max-w-2xl">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-100">
                {LENS_BY_ID[lens].label}
              </p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">{lensDescription}</p>
            </div>
          </div>
        </header>

        <div className={`flex flex-col gap-8 xl:flex-row xl:items-start ${isCanvasFullScreen ? 'pointer-events-none opacity-40 blur-sm' : ''}`} aria-hidden={isCanvasFullScreen}>
          <div className="flex-1">
            <div className="relative h-[min(1000px,calc(100vh-260px))] min-h-[620px] w-full">
              <HierarchyCanvas className="h-full" />
              <button
                type="button"
                onClick={() => {
                  setShowFullScreenPanel(false);
                  setCanvasFullScreen(true);
                }}
                className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 shadow-sm backdrop-blur transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-200 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-200"
              >
                <EnterFullScreenIcon className="h-3.5 w-3.5" />
                Full canvas
              </button>
            </div>
          </div>
          <EditorPanel />
        </div>
      </div>
    </main>
  );
}

const ToolbarButton = ({
  label,
  onClick,
  icon,
  disabled,
}: {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  disabled?: boolean;
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:border-white/20 dark:hover:text-white"
    >
      <span>{label}</span>
      {icon ?? <span className="text-xs uppercase tracking-wide text-slate-400">⌘</span>}
    </button>
  );
};

function ComparisonPickerDialog({
  scenarios,
  onClose,
  onSelect,
}: {
  scenarios: Array<{ id: string; name: string; description?: string }>;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900">
        <h3 className="mb-4 text-xl font-semibold text-slate-900 dark:text-white">
          Compare with Scenario
        </h3>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
          Select a scenario to compare with the current one
        </p>
        <div className="max-h-96 space-y-2 overflow-y-auto">
          {scenarios.map((scenario) => (
            <button
              key={scenario.id}
              onClick={() => onSelect(scenario.id)}
              className="w-full rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-sky-300 hover:bg-sky-50 dark:border-white/10 dark:bg-slate-800 dark:hover:border-sky-700 dark:hover:bg-sky-900/20"
            >
              <div className="font-medium text-slate-900 dark:text-white">{scenario.name}</div>
              {scenario.description && (
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {scenario.description}
                </div>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-4 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

type FullScreenOverlayProps = {
  lens: keyof typeof LENS_BY_ID;
  onClose: () => void;
  onTogglePanel: () => void;
  panelVisible: boolean;
};

const FullScreenOverlay = ({ lens, onClose, onTogglePanel, panelVisible }: FullScreenOverlayProps) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-lg">
      <div className="absolute inset-6 flex flex-col gap-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-widest text-white/70">
            <span>Full Screen Canvas</span>
            <span className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/70">
              {LENS_BY_ID[lens].label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onTogglePanel}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white/40"
            >
              <MixerHorizontalIcon className="h-3.5 w-3.5" />
              {panelVisible ? 'Hide panel' : 'Show panel'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white/40"
            >
              <ExitFullScreenIcon className="h-3.5 w-3.5" />
              Exit
            </button>
          </div>
        </div>
        <div className="flex flex-1 gap-6 overflow-hidden">
          <div className="flex-1 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/40 via-slate-900/20 to-slate-900/40 shadow-2xl">
            <HierarchyCanvas className="h-full" />
          </div>
          {panelVisible ? (
            <div className="w-[360px] overflow-y-auto rounded-3xl bg-white/95 p-4 text-slate-900 shadow-xl backdrop-blur dark:bg-slate-900/95">
              <EditorPanel />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
