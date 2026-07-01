export type LensId = "hierarchy" | "brand" | "channel" | "department" | "matrix";

export type LensDefinition = {
  id: LensId;
  label: string;
  description: string;
  shortcut: string;
  accent: string;
};

export const LENSES: LensDefinition[] = [
  {
    id: "hierarchy",
    label: "Executive Map",
    description: "Formal reporting truth from the top of the company down.",
    shortcut: "1",
    accent: "#0f172a",
  },
  {
    id: "brand",
    label: "Brand Coverage",
    description: "Dedicated brand teams, shared support, and all-brand foundation services.",
    shortcut: "2",
    accent: "#1d4ed8",
  },
  {
    id: "channel",
    label: "Channel Support",
    description: "Who belongs to and supports each sales channel.",
    shortcut: "3",
    accent: "#0ea5e9",
  },
  {
    id: "department",
    label: "Department Map",
    description: "How functions, back office, and shared services are grouped.",
    shortcut: "4",
    accent: "#9333ea",
  },
  {
    id: "matrix",
    label: "Business Grid",
    description: "Brand rows and channel columns for business support views.",
    shortcut: "5",
    accent: "#0891b2",
  },
];

export const LENS_BY_ID = LENSES.reduce<Record<LensId, LensDefinition>>((acc, lens) => {
  acc[lens.id] = lens;
  return acc;
}, {} as Record<LensId, LensDefinition>);
