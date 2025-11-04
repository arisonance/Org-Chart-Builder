'use client';

import { LENSES, type LensId } from '@/lib/schema/lenses';

type LensSwitcherProps = {
  activeLens: LensId;
  onChange: (lens: LensId) => void;
};

export function LensSwitcher({ activeLens, onChange }: LensSwitcherProps) {
  return (
    <div className="flex w-full flex-wrap gap-2">
      {LENSES.map((lens) => {
        const isActive = lens.id === activeLens;
        return (
          <button
            key={lens.id}
            type="button"
            onClick={() => onChange(lens.id)}
            className={[
              'flex flex-1 min-w-[180px] flex-col items-start gap-1 rounded-2xl border px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
              isActive
                ? 'border-transparent bg-slate-900 text-white focus-visible:ring-slate-400'
                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700 focus-visible:ring-slate-200 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-300',
            ].join(' ')}
          >
            <span className="text-sm font-semibold">{lens.label}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{lens.description}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Shortcut • {lens.shortcut}
            </span>
          </button>
        );
      })}
    </div>
  );
}
