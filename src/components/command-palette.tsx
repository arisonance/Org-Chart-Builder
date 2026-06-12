'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PersonNode } from "@/lib/schema/types";

export type PaletteAction = {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
};

type CommandPaletteProps = {
  people: PersonNode[];
  actions: PaletteAction[];
  onSelectPerson: (id: string) => void;
};

type Result =
  | { kind: "person"; person: PersonNode }
  | { kind: "action"; action: PaletteAction };

const MAX_PEOPLE = 8;

export function CommandPalette({ people, actions, onSelectPerson }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Global shortcut: Cmd/Ctrl+K toggles
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
        setQuery("");
        setActiveIndex(0);
      }
    };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, []);

  useEffect(() => {
    if (open) {
      // Focus after mount
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Empty query: surface actions plus a few people as examples
      return [
        ...actions.map((action) => ({ kind: "action", action }) as Result),
        ...people.slice(0, 4).map((person) => ({ kind: "person", person }) as Result),
      ];
    }
    const matchedPeople = people
      .filter((p) => {
        const hay = `${p.name} ${p.attributes.title} ${p.attributes.primaryDepartment ?? ""}`.toLowerCase();
        return q.split(/\s+/).every((token) => hay.includes(token));
      })
      .slice(0, MAX_PEOPLE)
      .map((person) => ({ kind: "person", person }) as Result);
    const matchedActions = actions
      .filter((a) => a.label.toLowerCase().includes(q))
      .map((action) => ({ kind: "action", action }) as Result);
    return [...matchedPeople, ...matchedActions];
  }, [query, people, actions]);

  // Keep active row in range and visible
  useEffect(() => {
    setActiveIndex((index) => Math.min(index, Math.max(0, results.length - 1)));
  }, [results.length]);
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const choose = useCallback(
    (result: Result | undefined) => {
      if (!result) return;
      setOpen(false);
      setQuery("");
      if (result.kind === "person") {
        onSelectPerson(result.person.id);
      } else {
        result.action.run();
      }
    },
    [onSelectPerson],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-900/30 pt-[12vh] backdrop-blur-[2px]"
      onMouseDown={() => setOpen(false)}
    >
      <div
        className="w-[600px] max-w-[92vw] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl ring-1 ring-black/5 dark:border-white/10 dark:bg-slate-900"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              setOpen(false);
            } else if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveIndex((i) => Math.min(i + 1, results.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((i) => Math.max(i - 1, 0));
            } else if (event.key === "Enter") {
              event.preventDefault();
              choose(results[activeIndex]);
            }
          }}
          placeholder="Jump to a person, or type a command…"
          className="w-full border-b border-slate-200 bg-transparent px-5 py-4 text-base text-slate-800 placeholder:text-slate-400 focus:outline-none dark:border-white/10 dark:text-slate-100"
        />
        <div ref={listRef} className="max-h-[46vh] overflow-y-auto p-2">
          {results.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-slate-400">No matches.</p>
          )}
          {results.map((result, index) => (
            <button
              key={result.kind === "person" ? result.person.id : result.action.id}
              type="button"
              data-index={index}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(result)}
              className={[
                "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm",
                index === activeIndex
                  ? "bg-sky-50 text-slate-900 dark:bg-sky-500/15 dark:text-white"
                  : "text-slate-600 dark:text-slate-300",
              ].join(" ")}
            >
              {result.kind === "person" ? (
                <>
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900/90 text-[10px] font-semibold uppercase text-white dark:bg-slate-200/30">
                      {result.person.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}
                    </span>
                    <span className="truncate font-medium">{result.person.name}</span>
                    <span className="truncate text-xs text-slate-400">
                      {result.person.attributes.title}
                    </span>
                  </span>
                  <span className="shrink-0 text-[10px] uppercase tracking-wide text-slate-400">
                    {result.person.attributes.primaryDepartment}
                  </span>
                </>
              ) : (
                <>
                  <span className="font-medium">{result.action.label}</span>
                  {result.action.hint && (
                    <span className="shrink-0 rounded-md border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 dark:border-white/10">
                      {result.action.hint}
                    </span>
                  )}
                </>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 border-t border-slate-200 px-4 py-2 text-[11px] text-slate-400 dark:border-white/10">
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
