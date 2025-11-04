'use client';

import { useEffect, useState } from "react";
import { Cross2Icon } from "@radix-ui/react-icons";

type OnboardingOverlayProps = {
  show: boolean;
  onDismiss: () => void;
};

export function OnboardingOverlay({ show, onDismiss }: OnboardingOverlayProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => setVisible(true), 500);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [show]);

  if (!show) return null;

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-40 transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Center card for empty state */}
      <div className="pointer-events-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative flex flex-col items-center gap-6 rounded-3xl border border-slate-200 bg-white/95 px-10 py-12 shadow-2xl backdrop-blur dark:border-white/10 dark:bg-slate-900/95">
          <button
            type="button"
            onClick={onDismiss}
            className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10"
          >
            <Cross2Icon className="h-4 w-4" />
          </button>
          
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-3xl shadow-lg">
            👥
          </div>
          
          <div className="max-w-md space-y-4 text-center">
            <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">
              Build Your Org Chart
            </h3>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Start by adding your first person to the canvas. You can add team members, create
              reporting relationships, and visualize your organization structure.
            </p>
          </div>

          <div className="grid w-full max-w-lg gap-3">
            <QuickTip icon="➕" text="Right-click the canvas or use the + button to add people" />
            <QuickTip icon="🔗" text="Drag from connection handles to create relationships" />
            <QuickTip icon="⌨️" text="Press N to quickly add a person at the center" />
            <QuickTip icon="✏️" text="Double-click any card to edit details" />
          </div>
        </div>
      </div>

      {/* Pointer to FAB */}
      <div className="pointer-events-none absolute bottom-24 right-24 animate-bounce">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-sky-200 bg-sky-50/95 px-4 py-3 text-sm font-semibold text-sky-900 shadow-lg backdrop-blur dark:border-sky-800 dark:bg-sky-900/95 dark:text-sky-100">
            Click here to get started
          </div>
          <svg
            className="h-8 w-8 text-sky-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 8l4 4m0 0l-4 4m4-4H3"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

function QuickTip({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
      <span className="text-2xl">{icon}</span>
      <span className="text-sm text-slate-600 dark:text-slate-300">{text}</span>
    </div>
  );
}


