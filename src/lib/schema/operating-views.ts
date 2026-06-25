import type { LensId } from "@/lib/schema/lenses";
import type { LensDimension } from "@/lib/graph/layout";

export type PublishedOperatingView =
  | {
      id: string;
      label: string;
      description: string;
      owner: string;
      kind: "overview";
      lens: LensId;
    }
  | {
      id: string;
      label: string;
      description: string;
      owner: string;
      kind: "shared-services";
      lens: LensId;
    }
  | {
      id: string;
      label: string;
      description: string;
      owner: string;
      kind: "dimension";
      lens: LensId;
      dimension: LensDimension;
      value: string;
    };

export const PUBLISHED_OPERATING_VIEWS: PublishedOperatingView[] = [
  {
    id: "executive-overview",
    label: "Executive overview",
    description: "Formal top-level reporting map from the executive team.",
    owner: "CEO office",
    kind: "overview",
    lens: "hierarchy",
  },
  {
    id: "luxury-residential",
    label: "Luxury Residential",
    description: "Residential sales channel with its dedicated and supporting teams.",
    owner: "Residential SLT",
    kind: "dimension",
    lens: "channel",
    dimension: "channel",
    value: "Luxury Residential",
  },
  {
    id: "north-america-professional",
    label: "North America Professional",
    description: "Professional channel ownership and support in North America.",
    owner: "Commercial SLT",
    kind: "dimension",
    lens: "channel",
    dimension: "channel",
    value: "North America Professional",
  },
  {
    id: "national-accounts",
    label: "National Accounts",
    description: "National accounts team and supporting services.",
    owner: "Residential SLT",
    kind: "dimension",
    lens: "channel",
    dimension: "channel",
    value: "National Accounts",
  },
  {
    id: "international-residential",
    label: "International Residential",
    description: "Global residential channel coverage and support.",
    owner: "International SLT",
    kind: "dimension",
    lens: "channel",
    dimension: "channel",
    value: "International Residential",
  },
  {
    id: "enterprise",
    label: "Enterprise",
    description: "Enterprise channel ownership and supporting functions.",
    owner: "Enterprise SLT",
    kind: "dimension",
    lens: "channel",
    dimension: "channel",
    value: "Enterprise",
  },
  {
    id: "shared-services",
    label: "Shared services",
    description: "Back-office and specialist teams that support multiple businesses.",
    owner: "Operations SLT",
    kind: "shared-services",
    lens: "hierarchy",
  },
];

export const PUBLISHED_OPERATING_VIEW_BY_ID = Object.fromEntries(
  PUBLISHED_OPERATING_VIEWS.map((view) => [view.id, view]),
) as Record<string, PublishedOperatingView>;
