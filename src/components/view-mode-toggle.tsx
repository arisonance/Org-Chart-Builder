'use client';

type ViewMode = "hierarchy" | "matrix";

type ViewModeToggleProps = {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
};

const options: Array<{ value: ViewMode; label: string; description: string }> = [
  {
    value: "hierarchy",
    label: "Hierarchy",
    description: "Cascade reporting lines and drag to reposition people.",
  },
  {
    value: "matrix",
    label: "Matrix",
    description: "Explore by brand, channel, and department lanes.",
  },
];

export function ViewModeToggle({ mode, onChange }: ViewModeToggleProps) {
  return (
    <div className="flex flex-wrap gap-2 rounded-3xl border border-slate-200 bg-white/70 p-2 shadow-sm ring-1 ring-black/5 dark:border-white/10 dark:bg-slate-950/70 dark:ring-white/10">
      {options.map((option) => {
        const isActive = mode === option.value;
        return (
          <button
            type="button"
            key={option.value}
            onClick={() => onChange(option.value)}
            className={[
              "flex min-w-[180px] flex-1 flex-col items-start gap-1 rounded-2xl px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
              isActive
                ? "bg-slate-900 text-white shadow-sm focus-visible:ring-slate-400"
                : "bg-transparent text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-200 dark:text-slate-300 dark:hover:bg-white/5",
            ].join(" ")}
          >
            <span className="text-sm font-semibold">{option.label}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {option.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
