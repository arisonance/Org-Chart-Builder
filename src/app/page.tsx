'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { DownloadIcon, EnterFullScreenIcon, ExitFullScreenIcon, MixerHorizontalIcon, ReloadIcon, UploadIcon, DotsHorizontalIcon, Cross2Icon } from '@radix-ui/react-icons';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ZodError } from 'zod';
import { HierarchyCanvas } from '@/components/hierarchy-canvas';
import { EditorPanel } from '@/components/editor-panel';
import { LensSwitcher } from '@/components/lens-switcher';
import { ScenarioManager } from '@/components/scenario-manager';
import { ScenarioComparison } from '@/components/scenario-comparison';
import { AIImportWizard } from '@/components/ai-import-wizard';
import { SearchFilterBar } from '@/components/search-filter-bar';
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
  const scenarios = useGraphStore((state) => state.scenarios);
  const setComparisonScenario = useGraphStore((state) => state.setComparisonScenario);
  const selection = useGraphStore((state) => state.selection);
  const clearSelection = useGraphStore((state) => state.clearSelection);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isCanvasFullScreen, setCanvasFullScreen] = useState(false);
  const [showFullScreenPanel, setShowFullScreenPanel] = useState(false);
  const [showComparisonPicker, setShowComparisonPicker] = useState(false);
  const [showAIImport, setShowAIImport] = useState(false);

  const lensDescription = useMemo(() => LENS_BY_ID[lens].description, [lens]);

  const scenarioList = useMemo(() => Object.values(scenarios), [scenarios]);

  // Lens switcher keyboard shortcuts (1-4)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      
      // Lens switching (1, 2, 3, 4 keys)
      if (e.key === '1' && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        setLens('hierarchy');
      } else if (e.key === '2' && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        setLens('brand');
      } else if (e.key === '3' && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        setLens('channel');
      } else if (e.key === '4' && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        setLens('department');
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setLens]);

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
          ? error.issues.map((issue) => issue.message).join('\n')
          : 'Unable to import file. Please ensure it is a valid export.';
      window.alert(message);
    } finally {
      event.target.value = '';
    }
  }, [importDocument]);

  return (
    <main className="min-h-screen bg-slate-100/70 pb-20 pt-14 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <ScenarioComparison />
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
      <div className="mx-auto flex w-full max-w-none flex-col gap-4 px-6 sm:px-8">
        {/* Compact Toolbar */}
        <header className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
              {documentMeta.name}
            </h1>
            <LensSwitcher activeLens={lens} onChange={setLens} />
            <ScenarioManager />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAIImport(true)}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              <UploadIcon className="inline h-4 w-4 mr-1" /> AI Import
            </button>
            
            {/* More Actions Menu */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <DotsHorizontalIcon className="h-4 w-4" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="z-50 min-w-[200px] rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-white/10 dark:bg-slate-900"
                  sideOffset={5}
                  align="end"
                >
                  <DropdownMenu.Item
                    onSelect={() => autoLayout(lens)}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Auto Layout
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onSelect={undo}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Undo
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onSelect={redo}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Redo
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator className="my-1 h-px bg-slate-200 dark:bg-slate-700" />
                  <DropdownMenu.Item
                    onSelect={handleExport}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <DownloadIcon className="h-4 w-4" /> Export JSON
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onSelect={() => fileInputRef.current?.click()}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <UploadIcon className="h-4 w-4" /> Import JSON
                  </DropdownMenu.Item>
                  {scenarioList.length >= 2 && (
                    <DropdownMenu.Item
                      onSelect={() => setShowComparisonPicker(true)}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Compare Scenarios
                    </DropdownMenu.Item>
                  )}
                  <DropdownMenu.Separator className="my-1 h-px bg-slate-200 dark:bg-slate-700" />
                  <DropdownMenu.Item
                    onSelect={resetToDemo}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-600 outline-none hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20"
                  >
                    <ReloadIcon className="h-4 w-4" /> Reset Demo
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
          <input
            type="file"
            accept="application/json"
            ref={fileInputRef}
            onChange={handleImport}
            className="hidden"
          />
        </header>

        {/* Optional: Search/Filter - Collapsible */}
        <details className="group">
          <summary className="cursor-pointer list-none rounded-lg border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-200">
            <span className="inline-flex items-center gap-2">
              <svg className="h-4 w-4 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Search & Filter
            </span>
          </summary>
          <div className="mt-2">
            <SearchFilterBar />
          </div>
        </details>

        {/* Full-Width Canvas with Floating Editor Panel */}
        <div className={`relative ${isCanvasFullScreen ? 'pointer-events-none opacity-40 blur-sm' : ''}`} aria-hidden={isCanvasFullScreen}>
          <div className="relative h-[calc(100vh-180px)] min-h-[700px] w-full">
            <HierarchyCanvas className="h-full" />
            
            {/* Floating Editor Panel - Only shows when node is selected */}
            {selection.nodeIds.length > 0 && (
              <div className="absolute right-4 top-4 bottom-4 z-30 w-[360px] overflow-y-auto rounded-2xl border border-slate-200 bg-white/95 shadow-2xl backdrop-blur dark:border-white/10 dark:bg-slate-900/95">
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-slate-900/95">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Edit Person</h3>
                  <button
                    onClick={() => clearSelection()}
                    className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                  >
                    <Cross2Icon className="h-4 w-4" />
                  </button>
                </div>
                <div className="p-4">
                  <EditorPanel />
                </div>
              </div>
            )}
            
            <button
              type="button"
              onClick={() => {
                setShowFullScreenPanel(false);
                setCanvasFullScreen(true);
              }}
              className="absolute right-4 bottom-4 z-20 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 shadow-sm backdrop-blur transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-200 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-200"
            >
              <EnterFullScreenIcon className="h-3.5 w-3.5" />
              Full Screen
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

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
