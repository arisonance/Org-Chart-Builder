'use client';

import { useState } from "react";
import { ChevronDownIcon, ChevronUpIcon, QuestionMarkCircledIcon } from "@radix-ui/react-icons";

export function ConnectionHelper() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="absolute left-6 top-[280px] z-30 max-w-xs">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-lg backdrop-blur dark:border-white/10 dark:bg-slate-900/95">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-white/5"
        >
          <div className="flex items-center gap-2">
            <QuestionMarkCircledIcon className="h-4 w-4 text-sky-500" />
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              Connection Guide
            </span>
          </div>
          {expanded ? (
            <ChevronUpIcon className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDownIcon className="h-4 w-4 text-slate-400" />
          )}
        </button>

        {expanded && (
          <div className="space-y-4 border-t border-slate-200 px-4 py-4 dark:border-white/10">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
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

            <div className="space-y-2 border-t border-slate-200 pt-3 dark:border-white/10">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Quick Tips
              </p>
              <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                <li className="flex gap-2">
                  <span className="text-slate-400">•</span>
                  <span>Drag from a handle to create connections</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-slate-400">•</span>
                  <span>Right-click edges to change type</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-slate-400">•</span>
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
    <div className="flex items-start gap-3">
      <div className={`mt-0.5 h-3 w-3 rounded-full ${color}`} />
      <div className="flex-1 space-y-0.5">
        <p className="text-xs font-semibold text-slate-900 dark:text-white">{label}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
        <p className="text-[10px] uppercase tracking-wide text-slate-400">{position}</p>
      </div>
    </div>
  );
}


