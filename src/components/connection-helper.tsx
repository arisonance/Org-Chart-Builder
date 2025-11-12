'use client';

import { useState } from "react";
import { ChevronDownIcon, ChevronUpIcon, QuestionMarkCircledIcon } from "@radix-ui/react-icons";

export function ConnectionHelper() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="absolute left-2 top-32 z-30 w-48 sm:left-4 sm:top-40 sm:w-56 md:left-6 md:top-[280px] md:w-64 lg:max-w-xs">
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white/95 shadow-lg backdrop-blur sm:rounded-xl md:rounded-2xl dark:border-white/10 dark:bg-slate-900/95">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-between gap-2 px-2 py-2 text-left transition hover:bg-slate-50 sm:gap-2.5 sm:px-3 sm:py-2.5 md:gap-3 md:px-4 md:py-3 dark:hover:bg-white/5"
        >
          <div className="flex items-center gap-1.5 sm:gap-2">
            <QuestionMarkCircledIcon className="h-3 w-3 flex-shrink-0 text-sky-500 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
            <span className="text-xs font-semibold text-slate-900 sm:text-sm dark:text-white">
              Connection Guide
            </span>
          </div>
          {expanded ? (
            <ChevronUpIcon className="h-3 w-3 flex-shrink-0 text-slate-400 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
          ) : (
            <ChevronDownIcon className="h-3 w-3 flex-shrink-0 text-slate-400 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
          )}
        </button>

        {expanded && (
          <div className="space-y-2 border-t border-slate-200 px-2 py-2 sm:space-y-3 sm:px-3 sm:py-3 md:space-y-4 md:px-4 md:py-4 dark:border-white/10">
            <div className="space-y-2 sm:space-y-2.5 md:space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:text-xs dark:text-slate-500">
                Connection Types
              </p>
              
              <ConnectionType
                color="bg-sky-500"
                label="Manager"
                description="Direct reporting relationship"
                position="Top & Bottom handles"
              />
              
              <ConnectionType
                color="bg-amber-500"
                label="Sponsor"
                description="Executive sponsor or advisor"
                position="Right handle"
              />
              
              <ConnectionType
                color="bg-indigo-500"
                label="Dotted Line"
                description="Indirect or matrix reporting"
                position="Left handle"
              />
            </div>

            <div className="space-y-1.5 border-t border-slate-200 pt-2 sm:space-y-2 sm:pt-2.5 md:pt-3 dark:border-white/10">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:text-xs dark:text-slate-500">
                Quick Tips
              </p>
              <ul className="space-y-1 text-[10px] leading-snug text-slate-600 sm:space-y-1.5 sm:text-xs dark:text-slate-300">
                <li className="flex gap-1.5 sm:gap-2">
                  <span className="flex-shrink-0 text-slate-400">•</span>
                  <span>Drag from a handle to create connections</span>
                </li>
                <li className="flex gap-1.5 sm:gap-2">
                  <span className="flex-shrink-0 text-slate-400">•</span>
                  <span>Right-click edges to change type</span>
                </li>
                <li className="flex gap-1.5 sm:gap-2">
                  <span className="flex-shrink-0 text-slate-400">•</span>
                  <span>Use hover buttons for quick actions</span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ConnectionType({
  color,
  label,
  description,
  position,
}: {
  color: string;
  label: string;
  description: string;
  position: string;
}) {
  return (
    <div className="flex items-start gap-2 sm:gap-2.5 md:gap-3">
      <div className={`mt-0.5 h-2 w-2 flex-shrink-0 rounded-full sm:h-2.5 sm:w-2.5 md:h-3 md:w-3 ${color}`} />
      <div className="flex-1 space-y-0.5 overflow-hidden">
        <p className="text-[10px] font-semibold text-slate-900 sm:text-xs dark:text-white">{label}</p>
        <p className="truncate text-[10px] text-slate-500 sm:text-xs dark:text-slate-400">{description}</p>
        <p className="text-[9px] uppercase tracking-wide text-slate-400 sm:text-[10px]">{position}</p>
      </div>
    </div>
  );
}


