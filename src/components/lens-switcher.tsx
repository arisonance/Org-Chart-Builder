'use client';

import { LENSES, type LensId } from '@/lib/schema/lenses';

type LensSwitcherProps = {
  activeLens: LensId;
  onChange: (lens: LensId) => void;
};

export function LensSwitcher({ activeLens, onChange }: LensSwitcherProps) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-white/10 dark:bg-slate-800">
      {LENSES.map((lens) => {
        const isActive = lens.id === activeLens;
        return (
          <button
            key={lens.id}
            type="button"
            onClick={() => onChange(lens.id)}
            title={lens.description}
            className={[
              'rounded-md px-3 py-1.5 text-sm font-medium transition',
              isActive
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200',
            ].join(' ')}
          >
            {lens.label}
          </button>
        );
      })}
    </div>
  );
}
