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
