import type { PersonNode } from "@/lib/schema/types";

export type UnitType = "facility" | "shared-service";

export type UnitDef = {
  id: string;
  label: string;
  type: UnitType;
  /** Departments (primaryDepartment values) that roll up into this unit. */
  departments: string[];
  /** Short note on what it serves, shown on the rolled-up card. */
  serves: string;
};

// Cross-cutting org units: physical facilities and corporate shared services that
// serve every brand/channel. In Brand/Channel/Grid views these roll up into a single
// card instead of scattering dozens of people across every lane. Driven by the
// department attribute (the membership model chosen for this org).
export const UNIT_DEFS: UnitDef[] = [
  {
    id: "unit-fontana-warehouse",
    label: "Fontana Warehouse",
    type: "facility",
    departments: ["Ops FNT"],
    serves: "Distribution · all brands",
  },
  {
    id: "unit-minden-production",
    label: "Minden Production",
    type: "facility",
    departments: ["James Manufacturing - Direct", "James Manufacturing - Indirect"],
    serves: "Assembly & finishing · James",
  },
  {
    id: "unit-minden-operations",
    label: "Minden Operations",
    type: "facility",
    departments: ["Ops MND"],
    serves: "Warehouse & site ops · all brands",
  },
  {
    id: "unit-finance",
    label: "Finance",
    type: "shared-service",
    departments: ["Finance"],
    serves: "Shared service · all brands",
  },
  {
    id: "unit-administration",
    label: "Administration & HR",
    type: "shared-service",
    departments: ["Administration"],
    serves: "Shared service · all brands",
  },
  {
    id: "unit-it",
    label: "Information Technology",
    type: "shared-service",
    departments: ["IT"],
    serves: "Shared service · all brands",
  },
];

const deptToUnit = new Map<string, UnitDef>();
UNIT_DEFS.forEach((def) => def.departments.forEach((d) => deptToUnit.set(d, def)));

/** The unit a person rolls up into, or null if they belong on the regular chart. */
export const getUnitForPerson = (node: PersonNode): UnitDef | null => {
  // Executives are never "part of" a facility/shared service even if tagged its
  // department (e.g. the CEO's office sits under Administration) — keep them on the chart.
  if (node.attributes.tier === "c-suite") return null;
  const dept = node.attributes.primaryDepartment;
  return dept ? deptToUnit.get(dept) ?? null : null;
};

export type ComputedUnit = {
  def: UnitDef;
  members: PersonNode[];
  /** Best-guess unit lead: the highest-tier member, or whoever has the most reports. */
  lead?: PersonNode;
};

const TIER_RANK: Record<string, number> = {
  "c-suite": 5,
  vp: 4,
  director: 3,
  manager: 2,
  ic: 1,
};

/** Group the given people into their cross-cutting units, preserving UNIT_DEFS order. */
export const computeOrgUnits = (people: PersonNode[]): ComputedUnit[] => {
  const byUnit = new Map<string, PersonNode[]>();
  people.forEach((p) => {
    const unit = getUnitForPerson(p);
    if (!unit) return;
    if (!byUnit.has(unit.id)) byUnit.set(unit.id, []);
    byUnit.get(unit.id)!.push(p);
  });

  return UNIT_DEFS.filter((def) => byUnit.has(def.id)).map((def) => {
    const members = byUnit.get(def.id)!;
    const lead = [...members].sort(
      (a, b) => (TIER_RANK[b.attributes.tier ?? "ic"] ?? 0) - (TIER_RANK[a.attributes.tier ?? "ic"] ?? 0),
    )[0];
    return { def, members, lead };
  });
};

/** Ids of everyone who rolls up into any unit (used to remove them from regular lanes). */
export const unitMemberIdSet = (people: PersonNode[]): Set<string> => {
  const ids = new Set<string>();
  people.forEach((p) => {
    if (getUnitForPerson(p)) ids.add(p.id);
  });
  return ids;
};

export type UnitAnchor = { id: string; def: UnitDef };

/**
 * Where each unit "enters" the reporting tree: a member whose manager is NOT in the
 * same unit. Collapsing these anchors hides every other member (all non-anchor members
 * report to someone inside their unit), so each anchor can stand in for the facility /
 * shared service as a single container card on the hierarchy.
 */
/** Minimum people in a clean subtree before it's worth showing as a container card. */
const MIN_CONTAINER_SIZE = 5;

export const computeUnitAnchors = (
  people: PersonNode[],
  parentOf: Record<string, string>,
  childOf: Record<string, string[]>,
): UnitAnchor[] => {
  const unitOf = new Map<string, UnitDef>();
  people.forEach((p) => {
    const u = getUnitForPerson(p);
    if (u) unitOf.set(p.id, u);
  });

  // Walk a subtree: it's "pure" only if every node belongs to the same unit (so a
  // container can never swallow the wider org, e.g. an exec who manages the unit lead).
  const inspect = (id: string, def: UnitDef): { pure: boolean; size: number } => {
    const stack = [...(childOf[id] ?? [])];
    const seen = new Set<string>([id]);
    let pure = true;
    while (stack.length) {
      const next = stack.pop()!;
      if (seen.has(next)) continue;
      seen.add(next);
      if (unitOf.get(next) !== def) pure = false;
      (childOf[next] ?? []).forEach((c) => stack.push(c));
    }
    return { pure, size: seen.size };
  };

  const anchors: UnitAnchor[] = [];
  unitOf.forEach((def, id) => {
    const parent = parentOf[id];
    const isEntryPoint = !parent || unitOf.get(parent) !== def;
    if (!isEntryPoint) return;
    const { pure, size } = inspect(id, def);
    if (pure && size >= MIN_CONTAINER_SIZE) anchors.push({ id, def });
  });
  return anchors;
};

