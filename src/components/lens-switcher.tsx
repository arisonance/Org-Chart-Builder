'use client';

import { LENSES, type LensId } from '@/lib/schema/lenses';

type LensSwitcherProps = {
  activeLens: LensId;
  onChange: (lens: LensId) => void;
};

export function LensSwitcher({ activeLens, onChange }: LensSwitcherProps) {
  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-100 p-1 text-sm font-semibold dark:border-white/10 dark:bg-slate-800"
      aria-label="Operating views"
    >
      <span className="px-2 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Views
      </span>
      {LENSES.map((lens) => {
        const isActive = lens.id === activeLens;
        return (
          <button
            key={lens.id}
            type="button"
            onClick={() => onChange(lens.id)}
            title={lens.description}
            aria-label={`${lens.label}: ${lens.description}`}
            className={[
              'inline-flex h-9 items-center justify-center rounded-md px-3 text-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300',
              isActive
                ? 'bg-white text-slate-950 shadow-sm ring-1 ring-slate-200 dark:bg-slate-950 dark:text-white dark:ring-white/10'
                : 'text-slate-600 hover:bg-white/70 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-100',
            ].join(' ')}
          >
            <span className="text-sm font-semibold leading-tight">{lens.label}</span>
          </button>
        );
      })}
    </div>
  );
}
