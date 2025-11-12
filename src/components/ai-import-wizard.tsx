'use client';

import { useState, useCallback } from 'react';
import { Cross2Icon, UploadIcon, CheckIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { useGraphStore } from '@/store/graph-store';
import { parseOrgChartImage, fileToBase64, validateExtraction, type ParsedOrgChart, type ParsedPerson } from '@/lib/ai/vision-parser';
import { suggestMergeStrategies, type MergeDecision } from '@/lib/ai/duplicate-detection';
import type { GraphNode, PersonAttributes } from '@/lib/schema/types';

type WizardStep = 'upload' | 'processing' | 'review' | 'complete';

type FileWithStatus = {
  file: File;
  status: 'pending' | 'processing' | 'success' | 'error';
  extractedData?: ParsedOrgChart;
  error?: string;
  previewUrl: string;
};

export function AIImportWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<WizardStep>('upload');
  const [selectedFiles, setSelectedFiles] = useState<FileWithStatus[]>([]);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState(0);
  const [allExtractedData, setAllExtractedData] = useState<ParsedOrgChart[]>([]);
  const [mergeDecisions, setMergeDecisions] = useState<MergeDecision[]>([]);
  const [error, setError] = useState<string | null>(null);

  const nodes = useGraphStore((state) => state.document.nodes);
  const addPerson = useGraphStore((state) => state.addPerson);
  const updatePerson = useGraphStore((state) => state.updatePerson);
  const addRelationship = useGraphStore((state) => state.addRelationship);

  const handleFilesSelect = useCallback((files: FileList) => {
    setError(null);
    const newFiles: FileWithStatus[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        newFiles.push({
          file,
          status: 'pending',
          previewUrl: URL.createObjectURL(file),
        });
      }
    }
    
    if (newFiles.length === 0) {
      setError('Please upload valid image (PNG, JPG) or PDF files');
      return;
    }
    
    setSelectedFiles(prev => [...prev, ...newFiles]);
  }, []);

  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      handleFilesSelect(e.dataTransfer.files);
    }
  }, [handleFilesSelect]);

  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].previewUrl);
      newFiles.splice(index, 1);
      return newFiles;
    });
  }, []);

  const handleProcess = async () => {
    if (selectedFiles.length === 0) return;

    setStep('processing');
    setError(null);
    setCurrentProcessingIndex(0);

    const extractedResults: ParsedOrgChart[] = [];

    // Process each file sequentially
    for (let i = 0; i < selectedFiles.length; i++) {
      const fileStatus = selectedFiles[i];
      setCurrentProcessingIndex(i);
      
      // Update status to processing
      setSelectedFiles(prev => {
        const updated = [...prev];
        updated[i].status = 'processing';
        return updated;
      });

      try {
        // Convert file to base64
        const base64 = await fileToBase64(fileStatus.file);

        // Call AI vision parser
        const parsed = await parseOrgChartImage(base64, fileStatus.file.type);

        // Validate extraction
        const validation = validateExtraction(parsed);
        if (!validation.isValid) {
          throw new Error(validation.errors.join(', '));
        }

        if (validation.warnings.length > 0) {
          console.warn('Extraction warnings:', validation.warnings);
        }

        extractedResults.push(parsed);

        // Update status to success
        setSelectedFiles(prev => {
          const updated = [...prev];
          updated[i].status = 'success';
          updated[i].extractedData = parsed;
          return updated;
        });
      } catch (err) {
        console.error('Processing error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to process file';
        
        // Update status to error
        setSelectedFiles(prev => {
          const updated = [...prev];
          updated[i].status = 'error';
          updated[i].error = errorMessage;
          return updated;
        });
      }
    }

    // Combine all extracted people and relationships
    const allPeople: ParsedPerson[] = [];
    const allRelationships: ParsedOrgChart['relationships'] = [];
    
    for (const data of extractedResults) {
      allPeople.push(...data.people);
      allRelationships.push(...data.relationships);
    }

    const combinedData: ParsedOrgChart = {
      people: allPeople,
      relationships: allRelationships,
      metadata: {
        source: `${extractedResults.length} files`,
        extractedAt: new Date().toISOString(),
        modelUsed: extractedResults[0]?.metadata.modelUsed || 'unknown',
      },
    };

    setAllExtractedData(extractedResults);

    // Generate merge suggestions for all people
    const decisions = suggestMergeStrategies(combinedData.people, nodes);
    setMergeDecisions(decisions);

    setStep('review');
  };

  const handleApplyChanges = async () => {
    if (allExtractedData.length === 0) return;

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
          const updates: Partial<GraphNode> = {
            name: decision.parsedPerson.name,
            attributes: {
              title: decision.parsedPerson.title,
              brands: decision.parsedPerson.brands || [],
              channels: decision.parsedPerson.channels || [],
              departments: decision.parsedPerson.departments || [],
              tags: [],
              location: decision.parsedPerson.location,
            } as PersonAttributes,
          };
          updatePerson(decision.existingNodeId, updates);
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

    // Create relationships from all extracted data
    for (const data of allExtractedData) {
      for (const rel of data.relationships) {
        const sourceId = nodeIdMap.get(rel.from);
        const targetId = nodeIdMap.get(rel.to);

        if (sourceId && targetId) {
          addRelationship(sourceId, targetId, rel.type);
        }
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
              selectedFiles={selectedFiles}
              error={error}
              onFilesSelect={handleFilesSelect}
              onFileDrop={handleFileDrop}
              onRemoveFile={removeFile}
              onProcess={handleProcess}
            />
          )}

          {step === 'processing' && (
            <ProcessingStep 
              files={selectedFiles}
              currentIndex={currentProcessingIndex}
            />
          )}

          {step === 'review' && (
            <ReviewStep
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
  selectedFiles,
  error,
  onFilesSelect,
  onFileDrop,
  onRemoveFile,
  onProcess,
}: {
  selectedFiles: FileWithStatus[];
  error: string | null;
  onFilesSelect: (files: FileList) => void;
  onFileDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onRemoveFile: (index: number) => void;
  onProcess: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* File Drop Zone */}
      <div
        onDrop={onFileDrop}
        onDragOver={(e) => e.preventDefault()}
        className="group relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 transition hover:border-sky-400 hover:bg-sky-50 dark:border-white/20 dark:bg-slate-800/50 dark:hover:border-sky-600 dark:hover:bg-sky-950/20"
      >
        <input
          type="file"
          accept="image/*,application/pdf"
          multiple
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onFilesSelect(e.target.files);
            }
          }}
          className="absolute inset-0 cursor-pointer opacity-0"
        />

        <div className="text-center">
          <UploadIcon className="mx-auto h-12 w-12 text-slate-400 group-hover:text-sky-600" />
          <p className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
            Drop org charts here
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            or click to browse (multiple files supported)
          </p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Supports PNG, JPG, PDF
          </p>
        </div>
      </div>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-slate-900 dark:text-white">
            Selected Files ({selectedFiles.length})
          </h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {selectedFiles.map((fileStatus, index) => (
              <div
                key={index}
                className="group relative overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-800"
              >
                <img
                  src={fileStatus.previewUrl}
                  alt={fileStatus.file.name}
                  className="aspect-video w-full object-cover"
                />
                <button
                  onClick={() => onRemoveFile(index)}
                  className="absolute right-1 top-1 rounded-full bg-rose-600 p-1 text-white opacity-0 transition hover:bg-rose-700 group-hover:opacity-100"
                  type="button"
                >
                  <Cross2Icon className="h-3 w-3" />
                </button>
                <div className="p-2">
                  <p className="truncate text-xs text-slate-600 dark:text-slate-300">
                    {fileStatus.file.name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
        disabled={selectedFiles.length === 0}
        className="w-full rounded-xl bg-sky-600 px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Process {selectedFiles.length} {selectedFiles.length === 1 ? 'File' : 'Files'} with AI
      </button>
    </div>
  );
}

function ProcessingStep({
  files,
  currentIndex,
}: {
  files: FileWithStatus[];
  currentIndex: number;
}) {
  const completedCount = files.filter(f => f.status === 'success').length;
  const progressPercent = (completedCount / files.length) * 100;

  return (
    <div className="space-y-6">
      <div className="flex min-h-[200px] flex-col items-center justify-center space-y-6">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-slate-200 border-t-sky-600 dark:border-slate-700 dark:border-t-sky-400"></div>
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-900 dark:text-white">
            AI is analyzing your org charts...
          </p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Processing file {currentIndex + 1} of {files.length}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-slate-900 dark:text-white">Progress</span>
          <span className="text-slate-600 dark:text-slate-300">
            {completedCount} / {files.length} complete
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className="h-full bg-sky-600 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* File Status List */}
      <div className="max-h-60 space-y-2 overflow-y-auto">
        {files.map((file, index) => (
          <div
            key={index}
            className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-800"
          >
            <div className="flex-shrink-0">
              {file.status === 'success' && (
                <CheckIcon className="h-5 w-5 text-emerald-600" />
              )}
              {file.status === 'error' && (
                <ExclamationTriangleIcon className="h-5 w-5 text-rose-600" />
              )}
              {file.status === 'processing' && (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-sky-600" />
              )}
              {file.status === 'pending' && (
                <div className="h-5 w-5 rounded-full border-2 border-slate-300" />
              )}
            </div>
            <div className="flex-1 truncate">
              <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                {file.file.name}
              </p>
              {file.error && (
                <p className="truncate text-xs text-rose-600 dark:text-rose-400">{file.error}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewStep({
  mergeDecisions,
  nodes,
  onDecisionChange,
  onApply,
}: {
  mergeDecisions: MergeDecision[];
  nodes: GraphNode[];
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
  nodes: GraphNode[];
  onChange: (strategy: MergeDecision['strategy']) => void;
}) {
  const existingNode = decision.existingNodeId
    ? nodes.find((n) => n.id === decision.existingNodeId)
    : null;

  const confidence = decision.parsedPerson.confidence;
  const confidenceBadge = confidence < 0.6 ? (
    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
      Low Confidence ({Math.round(confidence * 100)}%)
    </span>
  ) : confidence < 0.8 ? (
    <span className="inline-flex items-center rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">
      Medium ({Math.round(confidence * 100)}%)
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
      High ({Math.round(confidence * 100)}%)
    </span>
  );

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-800">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <div className="font-medium text-slate-900 dark:text-white">
              {decision.parsedPerson.name}
            </div>
            {confidenceBadge}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-300">
            {decision.parsedPerson.title}
          </div>
          {(decision.parsedPerson.brands?.length || decision.parsedPerson.departments?.length) && (
            <div className="flex flex-wrap gap-1">
              {decision.parsedPerson.brands?.map((brand) => (
                <span
                  key={brand}
                  className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                >
                  {brand}
                </span>
              ))}
              {decision.parsedPerson.departments?.map((dept) => (
                <span
                  key={dept}
                  className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                >
                  {dept}
                </span>
              ))}
            </div>
          )}
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
          className="flex-shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-white/10 dark:bg-slate-700"
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

