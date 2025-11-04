'use client';

import { useState, useMemo, useCallback } from 'react';
import { Cross2Icon, CheckIcon } from '@radix-ui/react-icons';
import { useGraphStore } from '@/store/graph-store';
import type { PersonNode } from '@/lib/schema/types';
import { DEMO_LENS_LABELS } from '@/data/demo-graph';
import { BRAND_COLORS, CHANNEL_COLORS, DEPARTMENT_COLORS } from '@/lib/theme/palette';

type MatrixAssignmentWizardProps = {
  nodeId: string;
  onClose: () => void;
};

export function MatrixAssignmentWizard({ nodeId, onClose }: MatrixAssignmentWizardProps) {
  const nodes = useGraphStore((state) => state.document.nodes);
  const updatePerson = useGraphStore((state) => state.updatePerson);
  const pushHistory = useGraphStore((state) => state.pushHistory);
  
  const node = nodes.find((n): n is PersonNode => n.kind === 'person' && n.id === nodeId);
  
  const [step, setStep] = useState<'brands' | 'channels' | 'departments'>('brands');
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set(node?.attributes.brands || []));
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set(node?.attributes.channels || []));
  const [selectedDepartments, setSelectedDepartments] = useState<Set<string>>(new Set(node?.attributes.departments || []));
  const [primaryBrand, setPrimaryBrand] = useState<string | undefined>(node?.attributes.primaryBrand);
  const [primaryChannel, setPrimaryChannel] = useState<string | undefined>(node?.attributes.primaryChannel);
  const [primaryDepartment, setPrimaryDepartment] = useState<string | undefined>(node?.attributes.primaryDepartment);

  const getDimensionColor = (dimension: string, type: 'brand' | 'channel' | 'department') => {
    if (type === 'brand') return BRAND_COLORS[dimension] || '#64748b';
    if (type === 'channel') return CHANNEL_COLORS[dimension] || '#64748b';
    return DEPARTMENT_COLORS[dimension] || '#64748b';
  };

  const handleToggle = (value: string, type: 'brands' | 'channels' | 'departments') => {
    if (type === 'brands') {
      const newSet = new Set(selectedBrands);
      if (newSet.has(value)) {
        newSet.delete(value);
        if (primaryBrand === value) setPrimaryBrand(undefined);
      } else {
        newSet.add(value);
        if (!primaryBrand) setPrimaryBrand(value);
      }
      setSelectedBrands(newSet);
    } else if (type === 'channels') {
      const newSet = new Set(selectedChannels);
      if (newSet.has(value)) {
        newSet.delete(value);
        if (primaryChannel === value) setPrimaryChannel(undefined);
      } else {
        newSet.add(value);
        if (!primaryChannel) setPrimaryChannel(value);
      }
      setSelectedChannels(newSet);
    } else {
      const newSet = new Set(selectedDepartments);
      if (newSet.has(value)) {
        newSet.delete(value);
        if (primaryDepartment === value) setPrimaryDepartment(undefined);
      } else {
        newSet.add(value);
        if (!primaryDepartment) setPrimaryDepartment(value);
      }
      setSelectedDepartments(newSet);
    }
  };

  const handleBulkAssign = (type: 'brands' | 'channels' | 'departments', exclude?: string) => {
    const allValues = type === 'brands' 
      ? DEMO_LENS_LABELS.brand 
      : type === 'channels' 
        ? DEMO_LENS_LABELS.channel 
        : DEMO_LENS_LABELS.department;
    
    const newSet = new Set(allValues.filter(v => v !== exclude));
    
    if (type === 'brands') {
      setSelectedBrands(newSet);
      if (!primaryBrand && newSet.size > 0) setPrimaryBrand(Array.from(newSet)[0]);
    } else if (type === 'channels') {
      setSelectedChannels(newSet);
      if (!primaryChannel && newSet.size > 0) setPrimaryChannel(Array.from(newSet)[0]);
    } else {
      setSelectedDepartments(newSet);
      if (!primaryDepartment && newSet.size > 0) setPrimaryDepartment(Array.from(newSet)[0]);
    }
  };

  const handleApply = useCallback(() => {
    if (!node) return;
    
    pushHistory();
    updatePerson(node.id, {
      attributes: {
        ...node.attributes,
        brands: Array.from(selectedBrands),
        channels: Array.from(selectedChannels),
        departments: Array.from(selectedDepartments),
        primaryBrand,
        primaryChannel,
        primaryDepartment,
      },
    });
    onClose();
  }, [node, selectedBrands, selectedChannels, selectedDepartments, primaryBrand, primaryChannel, primaryDepartment, updatePerson, pushHistory, onClose]);

  if (!node) return null;

  const currentValues = step === 'brands' 
    ? DEMO_LENS_LABELS.brand 
    : step === 'channels' 
      ? DEMO_LENS_LABELS.channel 
      : DEMO_LENS_LABELS.department;
  
  const currentSelected = step === 'brands' 
    ? selectedBrands 
    : step === 'channels' 
      ? selectedChannels 
      : selectedDepartments;
  
  const currentPrimary = step === 'brands' 
    ? primaryBrand 
    : step === 'channels' 
      ? primaryChannel 
      : primaryDepartment;

  const getProgress = () => {
    const total = 3;
    const completed = step === 'brands' ? 0 : step === 'channels' ? 1 : 2;
    return { completed, total, percentage: (completed / total) * 100 };
  };

  const progress = getProgress();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
              Matrix Assignment Wizard
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Assign {node.name} across brands, channels, and departments
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <Cross2Icon className="h-5 w-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>Step {progress.completed + 1} of {progress.total}</span>
            <span>{Math.round(progress.percentage)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-indigo-600 transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>

        {/* Step Navigation */}
        <div className="mb-6 flex gap-2">
          {(['brands', 'channels', 'departments'] as const).map((s) => {
            const isActive = step === s;
            const isCompleted = (s === 'brands' && progress.completed > 0) ||
              (s === 'channels' && progress.completed > 1) ||
              (s === 'departments' && progress.completed > 2);
            
            return (
              <button
                key={s}
                onClick={() => setStep(s)}
                className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'border-sky-500 bg-sky-50 text-sky-700 dark:border-sky-600 dark:bg-sky-900/30 dark:text-sky-300'
                    : isCompleted
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            );
          })}
        </div>

        {/* Selection Area */}
        <div className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Select {step.charAt(0).toUpperCase() + step.slice(1)}
            </h4>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkAssign(step)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300"
              >
                Select All
              </button>
              <button
                onClick={() => {
                  if (step === 'brands') setSelectedBrands(new Set());
                  else if (step === 'channels') setSelectedChannels(new Set());
                  else setSelectedDepartments(new Set());
                }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300"
              >
                Clear All
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {currentValues.map((value) => {
              const isSelected = currentSelected.has(value);
              const isPrimary = currentPrimary === value;
              
              return (
                <button
                  key={value}
                  onClick={() => handleToggle(value, step)}
                  className={`group relative flex items-center justify-between rounded-xl border p-3 text-left transition ${
                    isSelected
                      ? 'border-sky-500 bg-sky-50 ring-2 ring-sky-200 dark:border-sky-600 dark:bg-sky-900/30 dark:ring-sky-800'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800 dark:hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: getDimensionColor(value, step.slice(0, -1) as 'brand' | 'channel' | 'department') }}
                    />
                    <span className={`text-sm font-medium ${isSelected ? 'text-sky-900 dark:text-sky-100' : 'text-slate-700 dark:text-slate-300'}`}>
                      {value}
                    </span>
                  </div>
                  {isSelected && (
                    <div className="flex items-center gap-2">
                      {isPrimary && (
                        <span className="rounded-full bg-sky-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                          Primary
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (step === 'brands') setPrimaryBrand(isPrimary ? undefined : value);
                          else if (step === 'channels') setPrimaryChannel(isPrimary ? undefined : value);
                          else setPrimaryDepartment(isPrimary ? undefined : value);
                        }}
                        className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                      >
                        {isPrimary ? 'Remove primary' : 'Set primary'}
                      </button>
                      <CheckIcon className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Summary */}
        <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-800">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
            Summary
          </div>
          <div className="mt-2 flex gap-4 text-sm text-slate-700 dark:text-slate-300">
            <div>
              <span className="font-medium">{selectedBrands.size}</span> brands
            </div>
            <div>
              <span className="font-medium">{selectedChannels.size}</span> channels
            </div>
            <div>
              <span className="font-medium">{selectedDepartments.size}</span> departments
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          {step !== 'departments' ? (
            <button
              onClick={() => {
                if (step === 'brands') setStep('channels');
                else setStep('departments');
              }}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleApply}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Apply Changes
            </button>
          )}
        </div>
      </div>
    </div>
  );
}



