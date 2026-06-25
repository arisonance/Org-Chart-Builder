'use client';

import { LENSES, type LensId } from '@/lib/schema/lenses';

type LensSwitcherProps = {
  activeLens: LensId;
  onChange: (lens: LensId) => void;
};

export function LensSwitcher({ activeLens, onChange }: LensSwitcherProps) {
  return (
    <div
      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-white/10 dark:bg-slate-800"
      aria-label="Operating views"
    >
      <span className="px-2 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
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
              'flex min-h-10 min-w-[7.5rem] flex-col justify-center rounded-lg px-3 py-1.5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300',
              isActive
                ? 'bg-white text-slate-950 shadow-sm ring-1 ring-slate-200 dark:bg-slate-950 dark:text-white dark:ring-white/10'
                : 'text-slate-600 hover:bg-white/70 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-100',
            ].join(' ')}
          >
            <span className="text-sm font-semibold leading-tight">{lens.label}</span>
            <span className="text-[10px] font-bold uppercase tracking-wide opacity-50">
              {lens.shortcut}
            </span>
          </button>
        );
      })}
    </div>
  );
}
