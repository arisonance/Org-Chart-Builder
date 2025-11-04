'use client';

import { useState, useCallback } from 'react';
import { Cross2Icon, UploadIcon, CheckIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { useGraphStore } from '@/store/graph-store';
import { parseOrgChartImage, fileToBase64, validateExtraction, type ParsedOrgChart, type ParsedPerson } from '@/lib/ai/vision-parser';
import { findDuplicates, suggestMergeStrategies, type MergeDecision, type DuplicateMatch } from '@/lib/ai/duplicate-detection';
import type { PersonNode } from '@/lib/schema/types';

type WizardStep = 'upload' | 'processing' | 'review' | 'complete';

export function AIImportWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<WizardStep>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ParsedOrgChart | null>(null);
  const [mergeDecisions, setMergeDecisions] = useState<MergeDecision[]>([]);
  const [error, setError] = useState<string | null>(null);

  const nodes = useGraphStore((state) => state.document.nodes);
  const addPerson = useGraphStore((state) => state.addPerson);
  const updatePerson = useGraphStore((state) => state.updatePerson);
  const addRelationship = useGraphStore((state) => state.addRelationship);

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    setError(null);

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }, []);

  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      handleFileSelect(file);
    } else {
      setError('Please upload an image (PNG, JPG) or PDF file');
    }
  }, [handleFileSelect]);

  const handleProcess = async () => {
    if (!selectedFile) return;

    setStep('processing');
    setError(null);

    try {
      // Convert file to base64
      const base64 = await fileToBase64(selectedFile);

      // Call AI vision parser
      const parsed = await parseOrgChartImage(base64, selectedFile.type);

      // Validate extraction
      const validation = validateExtraction(parsed);
      if (!validation.isValid) {
        setError(`Extraction failed: ${validation.errors.join(', ')}`);
        setStep('upload');
        return;
      }

      if (validation.warnings.length > 0) {
        console.warn('Extraction warnings:', validation.warnings);
      }

      setExtractedData(parsed);

      // Generate merge suggestions
      const decisions = suggestMergeStrategies(parsed.people, nodes);
      setMergeDecisions(decisions);

      setStep('review');
    } catch (err) {
      console.error('Processing error:', err);
      setError('Failed to process file. Please try again.');
      setStep('upload');
    }
  };

  const handleApplyChanges = async () => {
    if (!extractedData) return;

    const nodeIdMap = new Map<string, string>(); // parsed name -> created node ID

    // Process each decision
    for (const decision of mergeDecisions) {
      if (decision.strategy === 'skip') {
        // Use existing node
        if (decision.existingNodeId) {
          nodeIdMap.set(decision.parsedPerson.name, decision.existingNodeId);
        }
      } else if (decision.strategy === 'update') {
        // Update existing node
        if (decision.existingNodeId) {
          updatePerson(decision.existingNodeId, {
            name: decision.parsedPerson.name,
            attributes: {
              title: decision.parsedPerson.title,
              brands: decision.parsedPerson.brands || [],
              channels: decision.parsedPerson.channels || [],
              departments: decision.parsedPerson.departments || [],
              location: decision.parsedPerson.location,
            } as any,
          });
          nodeIdMap.set(decision.parsedPerson.name, decision.existingNodeId);
        }
      } else {
        // Create new node
        const newId = addPerson({
          name: decision.parsedPerson.name,
          title: decision.parsedPerson.title,
          brands: decision.parsedPerson.brands || [],
          channels: decision.parsedPerson.channels || [],
          departments: decision.parsedPerson.departments || [],
          location: decision.parsedPerson.location,
        });
        nodeIdMap.set(decision.parsedPerson.name, newId);
      }
    }

    // Create relationships
    for (const rel of extractedData.relationships) {
      const sourceId = nodeIdMap.get(rel.from);
      const targetId = nodeIdMap.get(rel.to);

      if (sourceId && targetId) {
        addRelationship(sourceId, targetId, rel.type);
      }
    }

    setStep('complete');
  };

  const handleDecisionChange = (index: number, strategy: MergeDecision['strategy']) => {
    const newDecisions = [...mergeDecisions];
    newDecisions[index].strategy = strategy;
    setMergeDecisions(newDecisions);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-white/10">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              AI Org Chart Import
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Upload a screenshot or PDF of an org chart
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <Cross2Icon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          {step === 'upload' && (
            <UploadStep
              selectedFile={selectedFile}
              previewUrl={previewUrl}
              error={error}
              onFileSelect={handleFileSelect}
              onFileDrop={handleFileDrop}
              onProcess={handleProcess}
            />
          )}

          {step === 'processing' && <ProcessingStep />}

          {step === 'review' && extractedData && (
            <ReviewStep
              extractedData={extractedData}
              mergeDecisions={mergeDecisions}
              nodes={nodes}
              onDecisionChange={handleDecisionChange}
              onApply={handleApplyChanges}
            />
          )}

          {step === 'complete' && (
            <CompleteStep
              count={mergeDecisions.filter((d) => d.strategy === 'create-new').length}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function UploadStep({
  selectedFile,
  previewUrl,
  error,
  onFileSelect,
  onFileDrop,
  onProcess,
}: {
  selectedFile: File | null;
  previewUrl: string | null;
  error: string | null;
  onFileSelect: (file: File) => void;
  onFileDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onProcess: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* File Drop Zone */}
      <div
        onDrop={onFileDrop}
        onDragOver={(e) => e.preventDefault()}
        className="group relative flex min-h-[300px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 transition hover:border-sky-400 hover:bg-sky-50 dark:border-white/20 dark:bg-slate-800/50 dark:hover:border-sky-600 dark:hover:bg-sky-950/20"
      >
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileSelect(file);
          }}
          className="absolute inset-0 cursor-pointer opacity-0"
        />

        {previewUrl ? (
          <div className="text-center">
            <img
              src={previewUrl}
              alt="Preview"
              className="mx-auto max-h-64 rounded-lg shadow-lg"
            />
            <p className="mt-4 text-sm font-medium text-slate-900 dark:text-white">
              {selectedFile?.name}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Click to change file
            </p>
          </div>
        ) : (
          <div className="text-center">
            <UploadIcon className="mx-auto h-12 w-12 text-slate-400 group-hover:text-sky-600" />
            <p className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
              Drop org chart here
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              or click to browse
            </p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Supports PNG, JPG, PDF
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-rose-50 p-4 dark:bg-rose-900/20">
          <div className="flex items-start gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0 text-rose-600" />
            <p className="text-sm text-rose-800 dark:text-rose-300">{error}</p>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="rounded-xl bg-sky-50 p-4 dark:bg-sky-900/20">
        <h4 className="mb-2 font-semibold text-sky-900 dark:text-sky-100">
          Tips for best results:
        </h4>
        <ul className="space-y-1 text-sm text-sky-800 dark:text-sky-200">
          <li>• Ensure names and titles are clearly visible</li>
          <li>• Reporting lines should be distinct</li>
          <li>• Higher resolution images work better</li>
          <li>• The AI will check for duplicates automatically</li>
        </ul>
      </div>

      {/* Process Button */}
      <button
        type="button"
        onClick={onProcess}
        disabled={!selectedFile}
        className="w-full rounded-xl bg-sky-600 px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Process with AI
      </button>
    </div>
  );
}

function ProcessingStep() {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center space-y-6">
      <div className="h-16 w-16 animate-spin rounded-full border-4 border-slate-200 border-t-sky-600 dark:border-slate-700 dark:border-t-sky-400"></div>
      <div className="text-center">
        <p className="text-lg font-semibold text-slate-900 dark:text-white">
          AI is analyzing your org chart...
        </p>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Extracting people, roles, and relationships
        </p>
      </div>
    </div>
  );
}

function ReviewStep({
  extractedData,
  mergeDecisions,
  nodes,
  onDecisionChange,
  onApply,
}: {
  extractedData: ParsedOrgChart;
  mergeDecisions: MergeDecision[];
  nodes: any[];
  onDecisionChange: (index: number, strategy: MergeDecision['strategy']) => void;
  onApply: () => void;
}) {
  const newCount = mergeDecisions.filter((d) => d.strategy === 'create-new').length;
  const updateCount = mergeDecisions.filter((d) => d.strategy === 'update').length;
  const skipCount = mergeDecisions.filter((d) => d.strategy === 'skip').length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-900/20">
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
            {newCount}
          </div>
          <div className="text-sm text-emerald-600 dark:text-emerald-500">New people</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-900/20">
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
            {updateCount}
          </div>
          <div className="text-sm text-amber-600 dark:text-amber-500">Updates</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
          <div className="text-2xl font-bold text-slate-700 dark:text-slate-300">{skipCount}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Duplicates</div>
        </div>
      </div>

      {/* Decisions List */}
      <div className="space-y-3">
        <h4 className="font-semibold text-slate-900 dark:text-white">
          Review {mergeDecisions.length} people
        </h4>
        <div className="max-h-96 space-y-2 overflow-y-auto">
          {mergeDecisions.map((decision, index) => (
            <PersonDecisionCard
              key={index}
              decision={decision}
              nodes={nodes}
              onChange={(strategy) => onDecisionChange(index, strategy)}
            />
          ))}
        </div>
      </div>

      {/* Apply Button */}
      <button
        type="button"
        onClick={onApply}
        className="w-full rounded-xl bg-sky-600 px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-sky-700"
      >
        Apply Changes
      </button>
    </div>
  );
}

function PersonDecisionCard({
  decision,
  nodes,
  onChange,
}: {
  decision: MergeDecision;
  nodes: any[];
  onChange: (strategy: MergeDecision['strategy']) => void;
}) {
  const existingNode = decision.existingNodeId
    ? nodes.find((n) => n.id === decision.existingNodeId)
    : null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-800">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="font-medium text-slate-900 dark:text-white">
            {decision.parsedPerson.name}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-300">
            {decision.parsedPerson.title}
          </div>
          {existingNode && (
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Matches: {existingNode.name}
            </div>
          )}
          {decision.conflicts && decision.conflicts.length > 0 && (
            <div className="mt-2 space-y-1">
              {decision.conflicts.map((conflict, i) => (
                <div key={i} className="text-xs text-amber-600 dark:text-amber-400">
                  ⚠️ {conflict}
                </div>
              ))}
            </div>
          )}
        </div>
        <select
          value={decision.strategy}
          onChange={(e) => onChange(e.target.value as MergeDecision['strategy'])}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-white/10 dark:bg-slate-700"
        >
          <option value="create-new">Create New</option>
          <option value="update">Update Existing</option>
          <option value="skip">Skip (Duplicate)</option>
        </select>
      </div>
    </div>
  );
}

function CompleteStep({ count, onClose }: { count: number; onClose: () => void }) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center space-y-6">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
        <CheckIcon className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div className="text-center">
        <p className="text-lg font-semibold text-slate-900 dark:text-white">
          Successfully imported {count} people!
        </p>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Your org chart has been updated with the extracted data.
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="rounded-xl bg-sky-600 px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-sky-700"
      >
        Done
      </button>
    </div>
  );
}

