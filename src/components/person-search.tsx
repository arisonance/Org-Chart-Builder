'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import { MagnifyingGlassIcon, Cross2Icon } from "@radix-ui/react-icons";
import { useGraphStore } from "@/store/graph-store";
import { LENSES, type LensId } from "@/lib/schema/lenses";
import { PUBLISHED_OPERATING_VIEWS } from "@/lib/schema/operating-views";
import { UNIT_DEFS } from "@/lib/graph/org-units";
import type { PersonNode } from "@/lib/schema/types";

const MAX_RESULTS = 10;
const EMPTY_MENU_IDS = [
  "view:executive-overview",
  "view:all-residential",
  "view:luxury-residential",
  "view:north-america-professional",
  "view:shared-services",
  "lens:brand",
  "lens:channel",
  "lens:department",
  "lens:matrix",
];

type Destination =
  | {
      id: string;
      kind: "person";
      label: string;
      description: string;
      searchText: string;
      badge?: string;
      personId: string;
    }
  | {
      id: string;
      kind: "official";
      label: string;
      description: string;
      searchText: string;
      badge?: string;
      viewId: string;
    }
  | {
      id: string;
      kind: "lens";
      label: string;
      description: string;
      searchText: string;
      badge?: string;
      lens: LensId;
    }
  | {
      id: string;
      kind: "group";
      label: string;
      description: string;
      searchText: string;
      badge?: string;
      lens: LensId;
      focusIds: string[];
      token: string;
    };

const kindLabel: Record<Destination["kind"], string> = {
  person: "Person",
  official: "Official",
  lens: "View",
  group: "Group",
};

const groupLabelByLens: Record<LensId, string> = {
  hierarchy: "Org",
  brand: "Brand",
  channel: "Channel",
  department: "Dept",
  matrix: "Grid",
};

const scoreDestination = (destination: Destination, tokens: string[]) => {
  const search = destination.searchText;
  const label = destination.label.toLowerCase();
  let score = destination.kind === "person" ? 4 : destination.kind === "official" ? 3 : 2;
  tokens.forEach((token) => {
    if (label === token) score += 20;
    else if (label.startsWith(token)) score += 12;
    else if (label.includes(token)) score += 7;
    else if (search.includes(token)) score += 2;
  });
  return score;
};

const destinationMatches = (destination: Destination, tokens: string[]) =>
  tokens.every((token) => destination.searchText.includes(token));

const initials = (label: string) =>
  label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

/**
 * Header command search. It is the fastest way into the org: people, official
 * views, matrix presets, departments/channels/brands, and shared-service units.
 */
export function PersonSearch() {
  const nodes = useGraphStore((state) => state.document.nodes);
  const requestFocus = useGraphStore((state) => state.requestFocus);
  const requestGroupFocus = useGraphStore((state) => state.requestGroupFocus);
  const requestOperatingView = useGraphStore((state) => state.requestOperatingView);
  const clearOperatingView = useGraphStore((state) => state.clearOperatingView);
  const setLens = useGraphStore((state) => state.setLens);
  const setLensFilters = useGraphStore((state) => state.setLensFilters);
  const clearSelection = useGraphStore((state) => state.clearSelection);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const people = useMemo(
    () => nodes.filter((n): n is PersonNode => n.kind === "person"),
    [nodes],
  );

  const destinations = useMemo<Destination[]>(() => {
    const out: Destination[] = [];
    const peopleById = new Map(people.map((person) => [person.id, person]));

    people.forEach((person) => {
      out.push({
        id: `person:${person.id}`,
        kind: "person",
        label: person.name,
        description: person.attributes.title,
        badge: person.attributes.primaryDepartment ?? undefined,
        personId: person.id,
        searchText: [
          person.name,
          person.attributes.title,
          person.attributes.primaryDepartment,
          person.attributes.primaryBrand,
          person.attributes.primaryChannel,
          ...person.attributes.brands,
          ...person.attributes.channels,
          ...person.attributes.departments,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase(),
      });
    });

    PUBLISHED_OPERATING_VIEWS.forEach((view) => {
      out.push({
        id: `view:${view.id}`,
        kind: "official",
        label: view.label,
        description: view.description,
        badge: view.owner,
        viewId: view.id,
        searchText: `${view.label} ${view.description} ${view.owner} ${view.kind}`.toLowerCase(),
      });
    });

    LENSES.forEach((lens) => {
      out.push({
        id: `lens:${lens.id}`,
        kind: "lens",
        label: lens.id === "hierarchy" ? "Senior team" : lens.label,
        description: lens.description,
        badge: groupLabelByLens[lens.id],
        lens: lens.id,
        searchText: `${lens.label} ${lens.description} ${lens.id === "hierarchy" ? "senior team executive map hierarchy" : ""}`.toLowerCase(),
      });
    });

    const addGroup = (lens: LensId, label: string, focusIds: string[], description: string) => {
      if (focusIds.length === 0) return;
      out.push({
        id: `group:${lens}:${label}`,
        kind: "group",
        label,
        description,
        badge: groupLabelByLens[lens],
        lens,
        focusIds,
        token: label,
        searchText: `${label} ${description} ${groupLabelByLens[lens]}`.toLowerCase(),
      });
    };

    const uniqueValues = (values: Array<string | undefined>) =>
      Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort((a, b) => a.localeCompare(b));

    uniqueValues(people.flatMap((person) => person.attributes.brands)).forEach((brand) => {
      addGroup(
        "brand",
        brand,
        people.filter((person) => person.attributes.brands.includes(brand)).map((person) => person.id),
        `Show ${brand} brand coverage`,
      );
    });
    uniqueValues(people.flatMap((person) => person.attributes.channels)).forEach((channel) => {
      addGroup(
        "channel",
        channel,
        people.filter((person) => person.attributes.channels.includes(channel)).map((person) => person.id),
        `Show ${channel} channel support`,
      );
    });
    uniqueValues(people.flatMap((person) => person.attributes.departments)).forEach((department) => {
      addGroup(
        "department",
        department,
        people.filter((person) => person.attributes.departments.includes(department)).map((person) => person.id),
        `Show ${department} department map`,
      );
    });
    UNIT_DEFS.forEach((unit) => {
      addGroup(
        unit.type === "facility" ? "department" : "hierarchy",
        unit.type === "shared-service" ? `${unit.label} team` : unit.label,
        people
          .filter((person) => {
            const primary = person.attributes.primaryDepartment;
            const departments = person.attributes.departments;
            return Boolean(
              (primary && unit.departments.includes(primary)) ||
                departments.some((department) => unit.departments.includes(department)),
            );
          })
          .map((person) => person.id)
          .filter((id) => peopleById.has(id)),
        unit.serves,
      );
    });

    return out;
  }, [people]);

  const visibleResults = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      const byId = new Map(destinations.map((destination) => [destination.id, destination]));
      return EMPTY_MENU_IDS.map((id) => byId.get(id)).filter((item): item is Destination => Boolean(item));
    }
    const tokens = trimmed.split(/\s+/);
    return destinations
      .filter((destination) => destinationMatches(destination, tokens))
      .sort((a, b) => scoreDestination(b, tokens) - scoreDestination(a, tokens))
      .slice(0, MAX_RESULTS);
  }, [destinations, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [visibleResults.length, query]);

  // Close the dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const choose = (destination: Destination | undefined) => {
    if (!destination) return;
    if (destination.kind === "person") {
      requestFocus(destination.personId);
    } else if (destination.kind === "official") {
      requestOperatingView(destination.viewId);
    } else if (destination.kind === "lens") {
      clearOperatingView();
      clearSelection();
      setLens(destination.lens);
      setLensFilters(destination.lens, { focusIds: [], hiddenIds: [], activeTokens: [] });
    } else {
      requestGroupFocus({
        lens: destination.lens,
        label: destination.label,
        token: destination.token,
        focusIds: destination.focusIds,
      });
    }
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-64 xl:w-72">
      <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((i) => Math.min(i + 1, Math.max(visibleResults.length - 1, 0)));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((i) => Math.max(i - 1, 0));
          } else if (event.key === "Enter") {
            event.preventDefault();
            choose(visibleResults[activeIndex]);
          } else if (event.key === "Escape") {
            setOpen(false);
            setQuery("");
          }
        }}
        placeholder="Find person, team, view..."
        aria-label="Find person, team, or view"
        className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-8 text-sm text-slate-800 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-white/10 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-400"
      />
      {query && (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            setOpen(true);
          }}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-300"
        >
          <Cross2Icon className="h-4 w-4" />
        </button>
      )}

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-[min(28rem,calc(100vw_-_2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl ring-1 ring-black/5 dark:border-white/10 dark:bg-slate-900">
          <div className="border-b border-slate-100 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:border-white/10">
            {query.trim() ? "Go to" : "Common destinations"}
          </div>
          {visibleResults.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-slate-400">No matches</p>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto p-1.5">
              {visibleResults.map((destination, index) => (
                <button
                  key={destination.id}
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => choose(destination)}
                  className={[
                    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left",
                    index === activeIndex
                      ? "bg-sky-50 dark:bg-sky-500/15"
                      : "hover:bg-slate-50 dark:hover:bg-white/5",
                  ].join(" ")}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900/90 text-[10px] font-semibold uppercase text-white dark:bg-slate-200/30">
                    {destination.kind === "person" ? initials(destination.label) : kindLabel[destination.kind][0]}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {destination.label}
                    </span>
                    <span className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {destination.description}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:bg-white/10 dark:text-slate-300">
                      {kindLabel[destination.kind]}
                    </span>
                    {destination.badge ? (
                      <span className="max-w-[7rem] truncate text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        {destination.badge}
                      </span>
                    ) : null}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
