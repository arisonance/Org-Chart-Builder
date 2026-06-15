'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import { MagnifyingGlassIcon, Cross2Icon } from "@radix-ui/react-icons";
import { useGraphStore } from "@/store/graph-store";
import type { PersonNode } from "@/lib/schema/types";

const MAX_RESULTS = 7;

/**
 * Always-visible "find anyone" box for the header. Typing filters people by
 * name / title / department; picking one asks the canvas to fly to and focus
 * them (via the store's focusRequest), routing straight into the focus
 * breadcrumb. This is the primary navigation for a large org — one obvious
 * front door rather than a buried filter panel.
 */
export function PersonSearch() {
  const nodes = useGraphStore((state) => state.document.nodes);
  const requestFocus = useGraphStore((state) => state.requestFocus);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const people = useMemo(
    () => nodes.filter((n): n is PersonNode => n.kind === "person"),
    [nodes],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as PersonNode[];
    return people
      .filter((p) => {
        const hay = `${p.name} ${p.attributes.title} ${p.attributes.primaryDepartment ?? ""}`.toLowerCase();
        return q.split(/\s+/).every((token) => hay.includes(token));
      })
      .slice(0, MAX_RESULTS);
  }, [query, people]);

  useEffect(() => {
    setActiveIndex(0);
  }, [results.length]);

  // Close the dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const choose = (person: PersonNode | undefined) => {
    if (!person) return;
    requestFocus(person.id);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-56 sm:w-64">
      <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => query.trim() && setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, results.length - 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
          } else if (event.key === "Enter") {
            event.preventDefault();
            choose(results[activeIndex]);
          } else if (event.key === "Escape") {
            setOpen(false);
            setQuery("");
          }
        }}
        placeholder="Find anyone…"
        aria-label="Find a person"
        className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-8 text-sm text-slate-800 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-white/10 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-400"
      />
      {query && (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            setOpen(false);
          }}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-300"
        >
          <Cross2Icon className="h-4 w-4" />
        </button>
      )}

      {open && query.trim() && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl ring-1 ring-black/5 dark:border-white/10 dark:bg-slate-900">
          {results.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-slate-400">No matches</p>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto p-1.5">
              {results.map((person, index) => (
                <button
                  key={person.id}
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => choose(person)}
                  className={[
                    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left",
                    index === activeIndex
                      ? "bg-sky-50 dark:bg-sky-500/15"
                      : "hover:bg-slate-50 dark:hover:bg-white/5",
                  ].join(" ")}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900/90 text-[10px] font-semibold uppercase text-white dark:bg-slate-200/30">
                    {person.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium text-slate-900 dark:text-white">
                      {person.name}
                    </span>
                    <span className="truncate text-xs text-slate-400">
                      {person.attributes.title}
                    </span>
                  </span>
                  {person.attributes.primaryDepartment && (
                    <span className="shrink-0 text-[10px] uppercase tracking-wide text-slate-400">
                      {person.attributes.primaryDepartment}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
