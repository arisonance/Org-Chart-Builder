'use client';

import { LENSES, type LensId } from '@/lib/schema/lenses';

type LensSwitcherProps = {
  activeLens: LensId;
  onChange: (lens: LensId) => void;
  // The Business Grid is parked: keep it reachable for admins in edit mode,
  // but don't offer the roughest screen in the app to explore-mode viewers.
  hideGrid?: boolean;
};

const PRESET_LABELS: Partial<Record<LensId, string>> = {
  brand: "Brand",
  channel: "Channel",
  department: "Department",
  matrix: "Grid",
};

const PRESET_LENSES = LENSES.filter((lens) => lens.id !== "hierarchy");

export function LensSwitcher({ activeLens, onChange, hideGrid = false }: LensSwitcherProps) {
  const lenses = hideGrid ? PRESET_LENSES.filter((lens) => lens.id !== "matrix") : PRESET_LENSES;
  return (
    <div
      className="inline-flex h-10 items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 text-sm font-semibold shadow-sm dark:border-white/10 dark:bg-slate-800"
      aria-label="View presets"
    >
      {lenses.map((lens) => {
        const isActive = lens.id === activeLens;
        const label = PRESET_LABELS[lens.id] ?? lens.label;
        return (
          <button
            key={lens.id}
            type="button"
            onClick={() => onChange(lens.id)}
            title={lens.description}
            aria-label={`${label} view: ${lens.description}`}
            style={isActive ? { boxShadow: `inset 0 -3px 0 ${lens.accent}` } : undefined}
            className={[
              'inline-flex h-8 min-w-20 items-center justify-center rounded-lg px-3 text-center transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300',
              isActive
                ? 'bg-white text-slate-950 shadow-sm ring-1 ring-slate-200 dark:bg-slate-950 dark:text-white dark:ring-white/10'
                : 'text-slate-600 hover:bg-white/70 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-100',
            ].join(' ')}
          >
            <span className="text-sm font-semibold leading-tight">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
