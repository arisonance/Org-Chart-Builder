'use client';

import type { OrgMatrix, Perspective } from "@/lib/org/types";
import { buildDimensionMap, buildGroupings } from "@/lib/org/utils";
import { CategoryColumn } from "@/components/category-column";

type OrgChartProps = {
  matrix: OrgMatrix;
  perspective: Perspective;
  selectedPersonId?: string;
  onSelectPerson?: (id: string) => void;
};

export function OrgChart({
  matrix,
  perspective,
  selectedPersonId,
  onSelectPerson,
}: OrgChartProps) {
  const brandMap = buildDimensionMap(matrix.brands);
  const channelMap = buildDimensionMap(matrix.channels);
  const departmentMap = buildDimensionMap(matrix.departments);
  const reportsToDirectory = matrix.leadership.reduce<Record<string, string>>(
    (acc, person) => {
      acc[person.id] = person.name;
      return acc;
    },
    {},
  );

  const groupings = buildGroupings(perspective, matrix);

  return (
    <div className="flex w-full flex-1 flex-col gap-6">
      <div className="grid w-full gap-5 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-5 ring-1 ring-black/5 backdrop-blur dark:border-white/10 dark:bg-slate-900/70 dark:ring-white/10 md:col-span-2 xl:col-span-3">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Executive Alignment
          </h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            The matrix model allows leaders to collaborate across brands, channels, and
            departments. Tap a dimension to explore how people connect across Sonance
            businesses without forcing a single massive chart.
          </p>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {groupings.map(({ dimension, people }) => (
          <CategoryColumn
            key={dimension.id}
            dimension={dimension}
            people={people}
            perspective={perspective}
            brandMap={brandMap}
            channelMap={channelMap}
            departmentMap={departmentMap}
            reportsToDirectory={reportsToDirectory}
            selectedPersonId={selectedPersonId}
            onSelectPerson={onSelectPerson}
          />
        ))}
      </div>
    </div>
  );
}
