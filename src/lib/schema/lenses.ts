export type LensId = "hierarchy" | "brand" | "channel" | "department";

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
    label: "Classic Hierarchy",
    description: "View reporting lines and executive sponsorship.",
    shortcut: "1",
    accent: "#0f172a",
  },
  {
    id: "brand",
    label: "Brand Lens",
    description: "Highlight responsibilities by brand family.",
    shortcut: "2",
    accent: "#1d4ed8",
  },
  {
    id: "channel",
    label: "Channel Lens",
    description: "Explore residential and professional alignment.",
    shortcut: "3",
    accent: "#0ea5e9",
  },
  {
    id: "department",
    label: "Department Lens",
    description: "Compare functional org structures across teams.",
    shortcut: "4",
    accent: "#9333ea",
  },
];

export const LENS_BY_ID = LENSES.reduce<Record<LensId, LensDefinition>>((acc, lens) => {
  acc[lens.id] = lens;
  return acc;
}, {} as Record<LensId, LensDefinition>);
