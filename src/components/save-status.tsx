'use client';

import { useEffect, useRef, useState } from "react";
import { CheckCircledIcon } from "@radix-ui/react-icons";
import { useGraphStore } from "@/store/graph-store";

/**
 * Lightweight "your work is safe" indicator. The store persists to this
 * browser's localStorage on every change, so edits are always saved — this
 * just makes that visible (briefly flashing "Saving…" when the document
 * changes, then settling on "Saved"), the way a doc editor would.
 */
export function SaveStatus() {
  const updatedAt = useGraphStore((s) => s.document.metadata.updatedAt);
  const [saving, setSaving] = useState(false);
  const firstRun = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setSaving(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setSaving(false), 700);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [updatedAt]);

  return (
    <span
      title="Your changes are saved automatically in this browser"
      className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-slate-400 dark:text-slate-500"
    >
      {saving ? (
        <>
          <span className="h-3 w-3 animate-spin rounded-full border-[1.5px] border-slate-300 border-t-slate-500 dark:border-slate-600 dark:border-t-slate-300" />
          Saving…
        </>
      ) : (
        <>
          <CheckCircledIcon className="h-3.5 w-3.5 text-emerald-500" />
          Saved
        </>
      )}
    </span>
  );
}
