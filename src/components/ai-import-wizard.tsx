'use client';

import { Cross2Icon, ExclamationTriangleIcon } from '@radix-ui/react-icons';

export function AIImportWizard({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-amber-200 bg-white p-6 shadow-2xl dark:border-amber-500/30 dark:bg-slate-900">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          aria-label="Close AI import notice"
        >
          <Cross2Icon className="h-5 w-5" />
        </button>
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
          <ExclamationTriangleIcon className="h-6 w-6" />
        </div>
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">AI Import is paused</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          We are leaving AI-based chart parsing disabled until Cortex/Okta-style sign-in is in place and the import flow is clearly defined. For now, use manual editing plus JSON import/export so the core org builder stays reliable and does not expose an open AI endpoint.
        </p>
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
          <p className="font-semibold text-slate-900 dark:text-white">Available now</p>
          <ul className="mt-2 space-y-1">
            <li>• Add/edit people directly on the canvas</li>
            <li>• Create reporting, sponsor, and dotted-line relationships</li>
            <li>• Save and restore full workspaces with JSON import/export</li>
          </ul>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          Back to builder
        </button>
      </div>
    </div>
  );
}
