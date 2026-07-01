'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { DownloadIcon, EnterFullScreenIcon, ExitFullScreenIcon, MixerHorizontalIcon, ReloadIcon, UploadIcon, DotsHorizontalIcon, Cross2Icon } from '@radix-ui/react-icons';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Dialog from '@radix-ui/react-dialog';
import { ZodError } from 'zod';
import { HierarchyCanvas } from '@/components/hierarchy-canvas';
import { EditorPanel } from '@/components/editor-panel';
import { LensSwitcher } from '@/components/lens-switcher';
import { PublishedViewSwitcher } from '@/components/published-view-switcher';
import { WorkspaceModeSwitcher } from '@/components/workspace-mode-switcher';
import { ScenarioManager } from '@/components/scenario-manager';
import { ScenarioComparison } from '@/components/scenario-comparison';
import { AIImportWizard } from '@/components/ai-import-wizard';
import { SpreadsheetView } from '@/components/spreadsheet-view';
import { SearchFilterBar } from '@/components/search-filter-bar';
import { PersonSearch } from '@/components/person-search';
import { SaveStatus } from '@/components/save-status';
import { useGraphStore } from '@/store/graph-store';
import { LENS_BY_ID } from '@/lib/schema/lenses';
import { DEFAULT_OPERATING_VIEW_ID } from '@/lib/schema/operating-views';
import { parseGraphDocument } from '@/lib/schema/validation';

const LENS_PRESET_TRANSITION_EVENT = "org-chart:lens-preset-transition";

export default function Home() {
  const documentMeta = useGraphStore((state) => state.document.metadata);
  const lens = useGraphStore((state) => state.document.lens);
  const setLens = useGraphStore((state) => state.setLens);
  const clearOperatingView = useGraphStore((state) => state.clearOperatingView);
  const undo = useGraphStore((state) => state.undo);
  const redo = useGraphStore((state) => state.redo);
  const autoLayout = useGraphStore((state) => state.autoLayout);
  const exportDocument = useGraphStore((state) => state.exportDocument);
  const importDocument = useGraphStore((state) => state.importDocument);
  const resetToDemo = useGraphStore((state) => state.resetToDemo);
  const scenarios = useGraphStore((state) => state.scenarios);
  const setComparisonScenario = useGraphStore((state) => state.setComparisonScenario);
  const selection = useGraphStore((state) => state.selection);
  const editorPersonId = useGraphStore((state) => state.editorPersonId);
  const closeEditor = useGraphStore((state) => state.closeEditor);
  const workspaceMode = useGraphStore((state) => state.workspaceMode);
  const activeOperatingViewId = useGraphStore((state) => state.activeOperatingViewId);
  const requestOperatingView = useGraphStore((state) => state.requestOperatingView);
  const canEdit = workspaceMode !== 'explore';

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const requestedDefaultViewRef = useRef(Boolean(activeOperatingViewId));
  const [isCanvasFullScreen, setCanvasFullScreen] = useState(false);
  const [showFullScreenPanel, setShowFullScreenPanel] = useState(false);
  const [showComparisonPicker, setShowComparisonPicker] = useState(false);
  const [showAIImport, setShowAIImport] = useState(false);
  const [showSpreadsheet, setShowSpreadsheet] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const lensChangeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scenarioList = useMemo(() => Object.values(scenarios), [scenarios]);

  const handleLensChange = useCallback((nextLens: typeof lens) => {
    if (lensChangeTimerRef.current) {
      clearTimeout(lensChangeTimerRef.current);
    }
    window.dispatchEvent(new CustomEvent(LENS_PRESET_TRANSITION_EVENT));
    lensChangeTimerRef.current = setTimeout(() => {
      clearOperatingView();
      setLens(nextLens);
      lensChangeTimerRef.current = null;
    }, 24);
  }, [clearOperatingView, setLens]);

  const goToSeniorTeam = useCallback(() => {
    requestOperatingView(DEFAULT_OPERATING_VIEW_ID);
  }, [requestOperatingView]);

  useEffect(() => {
    if (!activeOperatingViewId && !requestedDefaultViewRef.current) {
      requestedDefaultViewRef.current = true;
      requestOperatingView(DEFAULT_OPERATING_VIEW_ID);
    }
  }, [activeOperatingViewId, requestOperatingView]);

  useEffect(() => {
    return () => {
      if (lensChangeTimerRef.current) {
        clearTimeout(lensChangeTimerRef.current);
      }
    };
  }, []);

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
      } else if (e.key === '5' && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        setLens('matrix');
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
      <SpreadsheetView open={showSpreadsheet} onClose={() => setShowSpreadsheet(false)} readOnly={!canEdit} />
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
        {/* No overflow-hidden (it clipped the search dropdown to a sliver),
            and z-40 so the dropdown paints above the canvas card that follows
            (backdrop-blur makes the header its own stacking context). */}
        <header className="relative z-40 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/80 xl:flex-nowrap">
          <div className="flex min-w-0 flex-1 items-center gap-3 xl:min-w-[14rem] xl:flex-none">
            <h1 className="text-lg font-semibold leading-tight text-slate-900 dark:text-white">
              {documentMeta.name}
            </h1>
            <SaveStatus />
          </div>
          <nav className="order-3 flex w-full min-w-0 shrink-0 items-center gap-2 overflow-x-auto xl:order-none xl:w-auto xl:flex-1" aria-label="Primary organization navigation">
            <button
              type="button"
              onClick={goToSeniorTeam}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-950 px-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              title="Return to the Senior Leadership Team home view"
            >
              Senior team
            </button>
            <LensSwitcher activeLens={lens} onChange={handleLensChange} />
            <PublishedViewSwitcher />
            <WorkspaceModeSwitcher />
          </nav>

          <div className="order-2 ml-auto flex shrink-0 items-center gap-2 xl:order-none">
            <div className="hidden xl:block">
              <PersonSearch />
            </div>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  aria-label="More tools"
                >
                  <DotsHorizontalIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">More</span>
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="z-50 max-h-[min(70vh,36rem)] min-w-[240px] overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-slate-900"
                  sideOffset={5}
                  align="end"
                >
                  <DropdownMenu.Item
                    onSelect={() => setShowFilters((value) => !value)}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 outline-none hover:bg-slate-100 data-[highlighted]:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 dark:data-[highlighted]:bg-slate-800"
                  >
                    <MixerHorizontalIcon className="h-4 w-4" /> {showFilters ? "Hide filters" : "Search & filters"}
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator className="my-2 h-px bg-slate-200 dark:bg-slate-700" />
                  <DropdownMenu.Item
                    onSelect={() => setShowSpreadsheet(true)}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 outline-none hover:bg-slate-100 data-[highlighted]:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 dark:data-[highlighted]:bg-slate-800"
                  >
                    <MixerHorizontalIcon className="h-4 w-4" /> Spreadsheet
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onSelect={() => setShowAIImport(true)}
                    title={canEdit ? undefined : "Switch to Edit mode (top right) to use this"}
                    disabled={!canEdit}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 outline-none hover:bg-slate-100 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40 data-[highlighted]:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 dark:data-[highlighted]:bg-slate-800"
                  >
                    <UploadIcon className="h-4 w-4" /> AI Import
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onSelect={handleExport}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 outline-none hover:bg-slate-100 data-[highlighted]:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 dark:data-[highlighted]:bg-slate-800"
                  >
                    <DownloadIcon className="h-4 w-4" /> Export JSON
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onSelect={() => fileInputRef.current?.click()}
                    title={canEdit ? undefined : "Switch to Edit mode (top right) to use this"}
                    disabled={!canEdit}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 outline-none hover:bg-slate-100 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40 data-[highlighted]:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 dark:data-[highlighted]:bg-slate-800"
                  >
                    <UploadIcon className="h-4 w-4" /> Import JSON
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator className="my-2 h-px bg-slate-200 dark:bg-slate-700" />
                  <DropdownMenu.Item
                    onSelect={() => autoLayout(lens)}
                    title={canEdit ? undefined : "Switch to Edit mode (top right) to use this"}
                    disabled={!canEdit}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 outline-none hover:bg-slate-100 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40 data-[highlighted]:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 dark:data-[highlighted]:bg-slate-800"
                  >
                    Auto Layout
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onSelect={undo}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 outline-none hover:bg-slate-100 data-[highlighted]:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 dark:data-[highlighted]:bg-slate-800"
                  >
                    Undo
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onSelect={redo}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 outline-none hover:bg-slate-100 data-[highlighted]:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 dark:data-[highlighted]:bg-slate-800"
                  >
                    Redo
                  </DropdownMenu.Item>
                  {scenarioList.length >= 2 && (
                    <DropdownMenu.Item
                      onSelect={() => setShowComparisonPicker(true)}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 outline-none hover:bg-slate-100 data-[highlighted]:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 dark:data-[highlighted]:bg-slate-800"
                    >
                      Compare Scenarios
                    </DropdownMenu.Item>
                  )}
                  <DropdownMenu.Separator className="my-2 h-px bg-slate-200 dark:bg-slate-700" />
                  <DropdownMenu.Item
                    onSelect={() => setConfirmResetOpen(true)}
                    title={canEdit ? undefined : "Switch to Edit mode (top right) to use this"}
                    disabled={!canEdit}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-rose-600 outline-none hover:bg-rose-50 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40 data-[highlighted]:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20 dark:data-[highlighted]:bg-rose-900/20"
                  >
                    <ReloadIcon className="h-4 w-4" /> Replace with demo data…
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
          {/* Destructive action gate: replacing the org with demo data wipes
              every person, relationship, and layout in this browser. */}
          <Dialog.Root open={confirmResetOpen} onOpenChange={setConfirmResetOpen}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm" />
              <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-950">
                <Dialog.Title className="text-base font-bold text-slate-900 dark:text-slate-50">
                  Replace everything with demo data?
                </Dialog.Title>
                <Dialog.Description className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  This discards the current org — people, relationships, and saved
                  layouts — and reloads the built-in demo dataset. If you might need
                  today&apos;s data again, use Export JSON first.
                </Dialog.Description>
                <div className="mt-5 flex justify-end gap-2">
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
                    >
                      Cancel
                    </button>
                  </Dialog.Close>
                  <button
                    type="button"
                    onClick={() => {
                      resetToDemo();
                      setConfirmResetOpen(false);
                    }}
                    className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-500"
                  >
                    Replace with demo data
                  </button>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </header>

        {workspaceMode === 'publish' && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900 shadow-sm dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-100">
            <div>
              <span className="font-bold">Publish review</span>
              <span className="ml-2 text-emerald-700 dark:text-emerald-200/80">
                {activeOperatingViewId
                  ? "Review this official view before employees rely on it."
                  : "Choose an official view to review ownership and publish status."}
              </span>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-800 ring-1 ring-emerald-100 dark:bg-slate-950 dark:text-emerald-100 dark:ring-emerald-400/20">
              Reporting lines remain locked to formal manager data
            </span>
          </div>
        )}

        {showFilters && (
          <div className="rounded-xl border border-slate-200 bg-white/85 px-3 py-3 shadow-sm dark:border-white/10 dark:bg-slate-900/70">
            <div className="flex flex-wrap items-center gap-3">
              <SearchFilterBar />
              <ScenarioManager />
            </div>
          </div>
        )}

        {/* Full-Width Canvas with Floating Editor Panel */}
        <div className={`relative ${isCanvasFullScreen ? 'pointer-events-none opacity-40 blur-sm' : ''}`} aria-hidden={isCanvasFullScreen}>
          <div className="relative h-[calc(100vh-180px)] min-h-[700px] w-full">
            <HierarchyCanvas className="h-full" />
            
            {/* Floating Editor Panel - Only for single selections; multi-select
                uses the canvas bulk-assign toolbar instead */}
            {canEdit && editorPersonId && selection.nodeIds.length === 1 && selection.nodeIds[0] === editorPersonId && (
              <div className="absolute bottom-3 right-3 top-3 z-30 w-[min(340px,calc(100%_-_1.5rem))] overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200 bg-white shadow-xl [transform:translateZ(0)] dark:border-white/10 dark:bg-slate-900">
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-3 py-2.5 dark:border-white/10 dark:bg-slate-900">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Edit Person</h3>
                  <button
                    onClick={() => closeEditor()}
                    className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                  >
                    <Cross2Icon className="h-4 w-4" />
                  </button>
                </div>
                <div className="p-3">
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
              className="absolute right-4 bottom-4 z-20 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-200 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
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
        <div className="max-h-96 space-y-2 overflow-y-auto [transform:translateZ(0)]">
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
            <div className="w-[min(360px,calc(100vw_-_2rem))] overflow-y-auto overflow-x-hidden rounded-3xl bg-white p-4 text-slate-900 shadow-xl [transform:translateZ(0)] dark:bg-slate-900">
              <EditorPanel />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
