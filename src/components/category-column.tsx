'use client';

import type { OrgDimension, Perspective, Person } from "@/lib/org/types";
import { PersonCard } from "@/components/person-card";

type CategoryColumnProps = {
  dimension: OrgDimension;
  people: Person[];
  perspective: Perspective;
  brandMap: Record<string, OrgDimension>;
  channelMap: Record<string, OrgDimension>;
  departmentMap: Record<string, OrgDimension>;
  reportsToDirectory: Record<string, string>;
  selectedPersonId?: string;
  onSelectPerson?: (id: string) => void;
};

export function CategoryColumn({
  dimension,
  people,
  perspective,
  brandMap,
  channelMap,
  departmentMap,
  reportsToDirectory,
  selectedPersonId,
  onSelectPerson,
}: CategoryColumnProps) {
  return (
    <section className="flex min-w-[260px] flex-1 flex-col gap-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm ring-1 ring-black/5 dark:border-white/10 dark:bg-slate-900/80 dark:ring-white/10">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: dimension.color ?? "#0ea5e9" }}
          />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {dimension.label}
          </h2>
        </div>
        {dimension.description ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">{dimension.description}</p>
        ) : null}
      </header>

      <div className="flex flex-col gap-3">
        {people.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs text-slate-400 dark:border-white/10 dark:bg-slate-800/60 dark:text-slate-500">
            No leaders assigned yet.
          </p>
        ) : (
          people.map((person) => (
            <PersonCard
              key={person.id}
              person={person}
              perspective={perspective}
              brandMap={brandMap}
              channelMap={channelMap}
              departmentMap={departmentMap}
              reportsToName={
                person.reportsToId ? reportsToDirectory[person.reportsToId] : undefined
              }
              isActive={selectedPersonId === person.id}
              onSelect={onSelectPerson}
            />
          ))
        )}
      </div>
    </section>
  );
}
