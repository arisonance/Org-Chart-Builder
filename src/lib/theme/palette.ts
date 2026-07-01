export const BRAND_COLORS: Record<string, string> = {
  Sonance: "#1d4ed8",
  James: "#ea580c",
  iPort: "#0f766e",
  "All Brands": "#475569",
};

export const CHANNEL_COLORS: Record<string, string> = {
  // Residential family — purples
  "Luxury Residential": "#a855f7",
  "National Accounts": "#7c3aed",
  "International Residential": "#c026d3",
  // Commercial / Professional family — blues/teals
  "North America Professional": "#2563eb",
  "International Professional": "#0891b2",
  Enterprise: "#0d9488",
  // Catch-all
  Other: "#64748b",
  "All Channels": "#64748b",
};

// Top-level channel-group colours, used for the grouped lens bands / grid headers
export const CHANNEL_GROUP_COLORS: Record<string, string> = {
  Residential: "#9333ea",
  Commercial: "#0e7490",
  Professional: "#2563eb",
  Other: "#64748b",
};

export const DEPARTMENT_COLORS: Record<string, string> = {
  "Executive Leadership": "#111827",
  "Product Development": "#0891b2",
  Marketing: "#9333ea",
  Sales: "#f97316",
  "People & Culture": "#2563eb",
  Finance: "#0f172a",
  Technology: "#0d9488",
  Operations: "#65a30d",
  "Human Resources": "#2563eb",
  "Information Technology": "#0369a1",
  Product: "#0891b2",
  Services: "#c026d3",
  "Professional Services": "#7c3aed",
  "Business Development": "#d97706",
  Engineering: "#dc2626",
  "Executive Support": "#475569",
  Programs: "#059669",
  "Customer Service": "#db2777",
};

export const UNASSIGNED_LANE_COLOR = "#94a3b8";

// Two-type model: reporting is blue, supports is teal. Legacy type keys map
// to the support color so un-migrated edges can't invent a third meaning.
export const RELATIONSHIP_COLORS: Record<string, string> = {
  manager: "#0284c7",
  support: "#0d9488",
  dedicated: "#0d9488",
  "shared-service": "#0d9488",
  sponsor: "#0d9488",
  dotted: "#0d9488",
  group: "#64748b",
};

export const dottedEdgeDash = "6 6";
