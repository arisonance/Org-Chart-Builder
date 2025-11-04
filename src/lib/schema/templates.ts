import type { PersonAttributes } from "./types";

export type RoleTemplate = {
  id: string;
  label: string;
  description: string;
  icon: string;
  defaultName: string;
  defaultTitle: string;
  tier: PersonAttributes["tier"];
  suggestedBrands?: string[];
  suggestedChannels?: string[];
  suggestedDepartments?: string[];
};

export const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    id: "c-suite",
    label: "C-Suite Executive",
    description: "CEO, CFO, COO, or other executive leader",
    icon: "👔",
    defaultName: "New Executive",
    defaultTitle: "Chief Executive Officer",
    tier: "c-suite",
  },
  {
    id: "vp",
    label: "Vice President",
    description: "VP-level leader overseeing major functions",
    icon: "🎯",
    defaultName: "New VP",
    defaultTitle: "Vice President",
    tier: "vp",
  },
  {
    id: "director",
    label: "Director",
    description: "Director managing teams or programs",
    icon: "📊",
    defaultName: "New Director",
    defaultTitle: "Director",
    tier: "director",
  },
  {
    id: "manager",
    label: "Manager",
    description: "People manager leading a team",
    icon: "👥",
    defaultName: "New Manager",
    defaultTitle: "Manager",
    tier: "manager",
  },
  {
    id: "ic",
    label: "Individual Contributor",
    description: "Individual contributor or specialist",
    icon: "⚡",
    defaultName: "New Team Member",
    defaultTitle: "Specialist",
    tier: "ic",
  },
];

export const getTemplateById = (id: string): RoleTemplate | undefined => {
  return ROLE_TEMPLATES.find((template) => template.id === id);
};


