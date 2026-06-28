import type { LensId } from "@/lib/schema/lenses";
import type { LensDimension } from "@/lib/graph/layout";

export type PublishedOperatingView =
  | {
      id: string;
      label: string;
      description: string;
      owner: string;
      publishedBy: string;
      publishedAt: string;
      kind: "overview";
      lens: LensId;
    }
  | {
      id: string;
      label: string;
      description: string;
      owner: string;
      publishedBy: string;
      publishedAt: string;
      kind: "shared-services";
      lens: LensId;
    }
  | {
      id: string;
      label: string;
      description: string;
      owner: string;
      publishedBy: string;
      publishedAt: string;
      kind: "formation";
      lens: LensId;
      formation: "residential";
    }
  | {
      id: string;
      label: string;
      description: string;
      owner: string;
      publishedBy: string;
      publishedAt: string;
      kind: "dimension";
      lens: LensId;
      dimension: LensDimension;
      value: string;
    };

export const DEFAULT_OPERATING_VIEW_ID = "executive-overview";

export const PUBLISHED_OPERATING_VIEWS: PublishedOperatingView[] = [
  {
    id: DEFAULT_OPERATING_VIEW_ID,
    label: "Senior Leadership Team",
    description: "Home view: Ari and the senior leaders, with drill-down from there.",
    owner: "CEO office",
    publishedBy: "CEO office",
    publishedAt: "2026-06-24",
    kind: "overview",
    lens: "hierarchy",
  },
  {
    id: "all-residential",
    label: "All Residential",
    description: "Residential formation: branch owners, direct support pods, and shared foundation.",
    owner: "Residential SLT",
    publishedBy: "Residential SLT",
    publishedAt: "2026-06-24",
    kind: "formation",
    lens: "hierarchy",
    formation: "residential",
  },
  {
    id: "luxury-residential",
    label: "Luxury Residential",
    description: "Residential sales channel with its dedicated and supporting teams.",
    owner: "Residential SLT",
    publishedBy: "Residential SLT",
    publishedAt: "2026-06-24",
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
    publishedBy: "Commercial SLT",
    publishedAt: "2026-06-24",
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
    publishedBy: "Residential SLT",
    publishedAt: "2026-06-24",
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
    publishedBy: "International SLT",
    publishedAt: "2026-06-24",
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
    publishedBy: "Enterprise SLT",
    publishedAt: "2026-06-24",
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
    publishedBy: "Operations SLT",
    publishedAt: "2026-06-24",
    kind: "shared-services",
    lens: "hierarchy",
  },
];

export const PUBLISHED_OPERATING_VIEW_BY_ID = Object.fromEntries(
  PUBLISHED_OPERATING_VIEWS.map((view) => [view.id, view]),
) as Record<string, PublishedOperatingView>;
