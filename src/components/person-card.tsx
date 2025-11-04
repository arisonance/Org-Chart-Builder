'use client';

import type { OrgDimension, Perspective, Person } from "@/lib/org/types";

const badgeClasses =
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide";

type PersonCardProps = {
  person: Person;
  perspective: Perspective;
  brandMap: Record<string, OrgDimension>;
  channelMap: Record<string, OrgDimension>;
  departmentMap: Record<string, OrgDimension>;
  reportsToName?: string;
  isActive?: boolean;
  onSelect?: (id: string) => void;
};

const initialColor = (name: string) => {
  if (!name) return "#1e293b";
  const code = name
    .toUpperCase()
    .split("")
    .reduce((acc, letter) => acc + letter.charCodeAt(0), 0);
  const colors = ["#0ea5e9", "#6366f1", "#ec4899", "#f97316", "#22c55e", "#a855f7"];
  return colors[code % colors.length];
};

export function PersonCard({
  person,
  perspective,
  brandMap,
  channelMap,
  departmentMap,
  reportsToName,
  isActive = false,
  onSelect,
}: PersonCardProps) {
  const initials =
    person.avatarInitials ??
    person.name
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  const affinityBadges = (() => {
    const entries: { id: string; label: string; tone: string }[] = [];

    if (perspective !== "brand") {
      person.brandIds.forEach((id) => {
        const dimension = brandMap[id];
        if (dimension) {
          entries.push({ id, label: dimension.label, tone: dimension.color ?? "#1d4ed8" });
        }
      });
    }

    if (perspective !== "channel") {
      person.channelIds.forEach((id) => {
        const dimension = channelMap[id];
        if (dimension) {
          entries.push({
            id,
            label: dimension.label,
            tone: dimension.color ?? "#2563eb",
          });
        }
      });
    }

    if (perspective !== "department") {
      person.departmentIds.forEach((id) => {
        const dimension = departmentMap[id];
        if (dimension) {
          entries.push({
            id,
            label: dimension.label,
            tone: dimension.color ?? "#334155",
          });
        }
      });
    }

    return entries;
  })();

  const cardAccent = (() => {
    if (perspective === "brand" && person.primaryBrandId) {
      return brandMap[person.primaryBrandId]?.color;
    }
    if (perspective === "channel" && person.primaryChannelId) {
      return channelMap[person.primaryChannelId]?.color;
    }
    if (perspective === "department" && person.primaryDepartmentId) {
      return departmentMap[person.primaryDepartmentId]?.color;
    }
    return affinityBadges[0]?.tone ?? initialColor(person.name);
  })();

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onSelect?.(person.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect?.(person.id);
        }
      }}
      className={[
        "relative flex cursor-pointer flex-col gap-3 rounded-2xl border bg-white/80 p-4 shadow-sm ring-1 ring-black/5 backdrop-blur transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:bg-slate-900/70 dark:ring-white/10",
        isActive
          ? "border-sky-400 ring-2 ring-sky-200/80 ring-offset-2 dark:border-sky-300/70 dark:ring-sky-500/40"
          : "border-slate-100 hover:-translate-y-0.5 hover:shadow-md dark:border-white/10",
      ].join(" ")}
    >
      <div
        className="pointer-events-none absolute inset-x-4 top-0 h-1 rounded-full"
        style={{ background: cardAccent ?? "#0284c7" }}
      />
      <div className="flex items-center gap-3 pt-1">
        <span
          className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold text-white shadow-inner"
          style={{ background: initialColor(person.name) }}
          aria-hidden
        >
          {initials}
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {person.name}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{person.title}</p>
        </div>
      </div>

      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
        {reportsToName ? `Reports to ${reportsToName}` : "Executive sponsor"}
      </p>

      {affinityBadges.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {affinityBadges.map((badge) => (
            <span
              key={badge.id}
              className={`${badgeClasses} border-transparent text-white shadow`}
              style={{ background: badge.tone }}
            >
              {badge.label}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
