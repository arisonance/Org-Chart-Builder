'use client';

import { useEffect } from "react";
import { Cross2Icon } from "@radix-ui/react-icons";
import { RELATIONSHIP_COLORS } from "@/lib/theme/palette";

type ShortcutGroup = { title: string; items: Array<{ keys: string[]; label: string }> };

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "Navigate",
    items: [
      { keys: ["⌘", "K"], label: "Command palette — jump to anyone" },
      { keys: ["1"], label: "Executive Map" },
      { keys: ["2"], label: "Brand Ownership" },
      { keys: ["3"], label: "Channel Support" },
      { keys: ["4"], label: "Department Map" },
      { keys: ["5"], label: "Business Grid" },
      { keys: ["0"], label: "Fit everything to view" },
      { keys: ["Click manager"], label: "Open that person's org view" },
      { keys: ["+"], label: "Zoom in" },
      { keys: ["−"], label: "Zoom out" },
    ],
  },
  {
    title: "Build",
    items: [
      { keys: ["N"], label: "Add a new person" },
      { keys: ["R"], label: "Add a direct report to the selected person" },
      { keys: ["M"], label: "Add a manager above the selected person" },
      { keys: ["⌘", "D"], label: "Duplicate the selection" },
      { keys: ["Delete"], label: "Remove the selection" },
      { keys: ["⌘", "Z"], label: "Undo" },
      { keys: ["⌘", "⇧", "Z"], label: "Redo" },
      { keys: ["?"], label: "Open this help" },
    ],
  },
];

const TIPS = [
  "Right-click a person — or the canvas — for the full action menu.",
  "Drag from the colored handles on a card to wire a new relationship.",
  "Click a manager to highlight their reporting chain and downstream team.",
];

/** Reusable mini line sample matching the on-canvas edge styles. */
function LineSample({ color, dashed, diamond }: { color: string; dashed?: boolean; diamond?: boolean }) {
  return (
    <svg width="48" height="16" viewBox="0 0 48 16" className="overflow-visible">
      <line
        x1="0"
        y1="8"
        x2="44"
        y2="8"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={dashed ? "6 6" : undefined}
      />
      {diamond ? (
        <path d="M40,8 L44,4 L48,8 L44,12 z" fill="none" stroke={color} strokeWidth="2" />
      ) : (
        <path d="M40,4 L48,8 L40,12 z" fill={color} />
      )}
    </svg>
  );
}

const LEGEND = [
  { color: RELATIONSHIP_COLORS.manager, label: "Reports to", desc: "Formal manager relationship" },
  { color: RELATIONSHIP_COLORS.sponsor, label: "Executive support", desc: "Sponsor or operating support", diamond: true },
  { color: RELATIONSHIP_COLORS.dotted, label: "Matrix support", desc: "Collaborative / advisory support", dashed: true },
];

export function HelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-label="Keyboard shortcuts and legend"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Shortcuts &amp; guide
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close help"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <Cross2Icon className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {group.title}
              </h3>
              <ul className="space-y-1.5">
                {group.items.map((item) => (
                  <li key={item.label} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-600 dark:text-slate-300">{item.label}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {item.keys.map((k) => (
                        <kbd
                          key={k}
                          className="min-w-[1.5rem] rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-center text-[11px] font-semibold text-slate-500 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300"
                        >
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-6 border-t border-slate-200 pt-5 dark:border-white/10 sm:grid-cols-2">
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              What the lines mean
            </h3>
            <ul className="space-y-2.5">
              {LEGEND.map((row) => (
                <li key={row.label} className="flex items-center gap-3">
                  <span className="flex h-4 w-12 shrink-0 items-center">
                    <LineSample color={row.color} dashed={row.dashed} diamond={row.diamond} />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      {row.label}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{row.desc}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Tips
            </h3>
            <ul className="space-y-2">
              {TIPS.map((tip) => (
                <li key={tip} className="flex gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <span className="text-sky-500">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
