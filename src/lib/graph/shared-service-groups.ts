import type { PersonNode, NodeRoleTier } from "@/lib/schema/types";

export type SharedServiceMirrorGroup = {
  id: string;
  service: string;
  label: string;
  homeLane: string;
  members: PersonNode[];
  lead?: PersonNode;
};

const TIER_RANK: Record<NodeRoleTier, number> = {
  "c-suite": 5,
  vp: 4,
  director: 3,
  manager: 2,
  ic: 1,
};

const clean = (value: string | undefined) => value?.trim() || "Shared Services";

const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const includesAny = (haystack: string, needles: string[]) =>
  needles.some((needle) => haystack.includes(needle));

export const getSharedServiceGroupForPerson = (
  person: PersonNode,
): { service: string; label: string } => {
  const department = clean(person.attributes.primaryDepartment ?? person.attributes.departments[0]);
  const title = person.attributes.title.toLowerCase();

  if (department === "Dealer Services") {
    if (includesAny(title, ["technical support", "tech support"])) {
      return { service: "Dealer Services", label: "Technical Support" };
    }
    if (title.includes("design services")) {
      return { service: "Dealer Services", label: "Design Services" };
    }
    if (includesAny(title, ["james custom", "custom engineer"])) {
      return { service: "Dealer Services", label: "James Custom Engineering" };
    }
    if (title.includes("field support")) {
      return { service: "Dealer Services", label: "Field Support" };
    }
    return { service: "Dealer Services", label: "Dealer Services" };
  }

  if (department === "Sales Ops") {
    if (title.includes("inside sales")) {
      return { service: "Sales Operations", label: "Inside Sales" };
    }
    if (includesAny(title, ["customer service", "rma"])) {
      return { service: "Sales Operations", label: "Customer Service" };
    }
    if (title.includes("digital operations")) {
      return { service: "Sales Operations", label: "Digital Operations" };
    }
    if (includesAny(title, ["demand", "planner", "forecast"])) {
      return { service: "Sales Operations", label: "Demand Planning" };
    }
    return { service: "Sales Operations", label: "Sales Operations" };
  }

  if (department === "Sales") {
    return { service: "Sales Support", label: "Sales Support" };
  }

  if (department.startsWith("R&D")) {
    if (title.includes("product")) {
      return { service: "Engineering & Product", label: "Product Management" };
    }
    if (title.includes("software")) {
      return { service: "Engineering & Product", label: "Software Engineering" };
    }
    if (department.includes("Electronics")) {
      return { service: "Engineering & Product", label: "Electronics Engineering" };
    }
    if (department.includes("Speaker")) {
      return { service: "Engineering & Product", label: "Speaker Engineering" };
    }
    if (department.includes("iPort")) {
      return { service: "Engineering & Product", label: "iPort Engineering" };
    }
    return { service: "Engineering & Product", label: "Engineering" };
  }

  if (department === "Technology and Innovation") {
    return { service: "Technology & Innovation", label: "Technology & Innovation" };
  }

  if (department === "Quality Control") {
    return { service: "Operations", label: "Quality" };
  }

  if (department.startsWith("Ops ")) {
    return { service: "Operations", label: department.replace(/^Ops /, "") };
  }

  if (department.includes("Marketing")) {
    return { service: "Marketing", label: department };
  }

  return { service: department, label: department };
};

const pickLead = (members: PersonNode[]) =>
  [...members].sort((a, b) => {
    const rankDelta =
      (TIER_RANK[b.attributes.tier ?? "ic"] ?? 0) -
      (TIER_RANK[a.attributes.tier ?? "ic"] ?? 0);
    if (rankDelta !== 0) return rankDelta;
    return a.name.localeCompare(b.name);
  })[0];

export const groupSharedServiceMirrors = (
  people: PersonNode[],
  getHomeLane: (person: PersonNode) => string,
): SharedServiceMirrorGroup[] => {
  const groups = new Map<string, SharedServiceMirrorGroup>();

  people.forEach((person) => {
    const { service, label } = getSharedServiceGroupForPerson(person);
    const homeLane = getHomeLane(person);
    const id = `shared:${slug(service)}:${slug(label)}:${slug(homeLane)}`;
    const existing = groups.get(id);
    if (existing) {
      existing.members.push(person);
      existing.lead = pickLead(existing.members);
    } else {
      groups.set(id, {
        id,
        service,
        label,
        homeLane,
        members: [person],
        lead: person,
      });
    }
  });

  return [...groups.values()].sort((a, b) => {
    const serviceDelta = a.service.localeCompare(b.service);
    if (serviceDelta !== 0) return serviceDelta;
    return a.label.localeCompare(b.label);
  });
};
