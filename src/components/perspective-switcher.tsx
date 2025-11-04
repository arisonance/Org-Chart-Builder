'use client';

import { perspectiveLabels, perspectiveOrder } from "@/lib/org/utils";
import type { Perspective } from "@/lib/org/types";

type PerspectiveSwitcherProps = {
  perspective: Perspective;
  onChange: (value: Perspective) => void;
};

export function PerspectiveSwitcher({
  perspective,
  onChange,
}: PerspectiveSwitcherProps) {
  return (
    <div className="flex flex-wrap gap-2 rounded-full bg-white/40 p-2 shadow-sm ring-1 ring-black/5 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:bg-white/5 dark:ring-white/10">
      {perspectiveOrder.map((value) => {
        const isActive = perspective === value;

        return (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            className={[
              "rounded-full px-4 py-1.5 text-sm font-medium transition",
              isActive
                ? "bg-sky-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10",
            ].join(" ")}
          >
            {perspectiveLabels[value]}
          </button>
        );
      })}
    </div>
  );
}
