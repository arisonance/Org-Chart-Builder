import { LENSES, type LensId } from "@/lib/schema/lenses";
import {
  buildDefaultLensState,
  createEmptyGraphDocument,
} from "@/lib/schema/defaults";
import type { GraphDocument, GraphEdge, GraphNode, PersonAttributes } from "@/lib/schema/types";
import { SCHEMA_VERSION } from "@/lib/schema/types";

type SeedPerson = {
  id: string;
  name: string;
  title: string;
  tier: PersonAttributes["tier"];
  departments: string[];
  primaryDepartment?: string;
  brands: string[];
  primaryBrand?: string;
  channels: string[];
  primaryChannel?: string;
  tags?: string[];
  location?: string;
  costCenter?: string;
};

const people: SeedPerson[] = [
  {
    id: "person-alex-morgan",
    name: "Alex Morgan",
    title: "Chief Executive Officer",
    tier: "c-suite",
    departments: ["Executive Leadership"],
    primaryDepartment: "Executive Leadership",
    brands: ["Sonance", "iPort", "James Cloud Speaker", "Blaze Audio"],
    primaryBrand: "Sonance",
    channels: [
      "Residential Retail",
      "Residential Mid-Market",
      "Residential Luxury",
      "Professional Enterprise",
      "Professional Audio",
    ],
    primaryChannel: "Professional Enterprise",
  },
  {
    id: "person-jules-meyer",
    name: "Jules Meyer",
    title: "Chief Financial Officer",
    tier: "c-suite",
    departments: ["Executive Leadership", "Finance"],
    primaryDepartment: "Finance",
    brands: ["Sonance", "Blaze Audio"],
    primaryBrand: "Blaze Audio",
    channels: ["Professional Enterprise", "Professional Audio"],
    primaryChannel: "Professional Enterprise",
  },
  {
    id: "person-ethan-rios",
    name: "Ethan Rios",
    title: "General Manager, Sonance",
    tier: "vp",
    departments: ["Product Development", "Sales"],
    primaryDepartment: "Product Development",
    brands: ["Sonance"],
    primaryBrand: "Sonance",
    channels: ["Residential Retail", "Residential Mid-Market", "Professional Enterprise"],
    primaryChannel: "Residential Retail",
  },
  {
    id: "person-amelia-park",
    name: "Amelia Park",
    title: "General Manager, iPort",
    tier: "vp",
    departments: ["Product Development", "Marketing"],
    primaryDepartment: "Product Development",
    brands: ["iPort"],
    primaryBrand: "iPort",
    channels: ["Residential Mid-Market", "Professional Enterprise"],
    primaryChannel: "Professional Enterprise",
  },
  {
    id: "person-zoe-harper",
    name: "Zoe Harper",
    title: "General Manager, James Cloud Speaker",
    tier: "vp",
    departments: ["Product Development", "Marketing"],
    primaryDepartment: "Marketing",
    brands: ["James Cloud Speaker"],
    primaryBrand: "James Cloud Speaker",
    channels: ["Residential Luxury"],
    primaryChannel: "Residential Luxury",
  },
  {
    id: "person-liam-dorsey",
    name: "Liam Dorsey",
    title: "General Manager, Blaze Audio",
    tier: "vp",
    departments: ["Sales", "Product Development"],
    primaryDepartment: "Sales",
    brands: ["Blaze Audio"],
    primaryBrand: "Blaze Audio",
    channels: ["Professional Audio", "Professional Enterprise"],
    primaryChannel: "Professional Audio",
  },
  {
    id: "person-sophia-ng",
    name: "Sophia Ng",
    title: "Chief Product Officer",
    tier: "c-suite",
    departments: ["Executive Leadership", "Product Development"],
    primaryDepartment: "Product Development",
    brands: ["Sonance", "James Cloud Speaker", "iPort"],
    primaryBrand: "Sonance",
    channels: ["Residential Luxury", "Residential Mid-Market", "Professional Audio"],
    primaryChannel: "Residential Luxury",
  },
  {
    id: "person-daniel-kim",
    name: "Daniel Kim",
    title: "VP, Integrated Marketing",
    tier: "vp",
    departments: ["Marketing"],
    primaryDepartment: "Marketing",
    brands: ["Sonance", "iPort", "Blaze Audio"],
    primaryBrand: "Sonance",
    channels: ["Residential Retail", "Professional Enterprise"],
    primaryChannel: "Residential Retail",
  },
  {
    id: "person-lena-ortiz",
    name: "Lena Ortiz",
    title: "VP, Residential Channel",
    tier: "vp",
    departments: ["Sales"],
    primaryDepartment: "Sales",
    brands: ["Sonance", "iPort", "James Cloud Speaker"],
    primaryBrand: "Sonance",
    channels: ["Residential Retail", "Residential Mid-Market", "Residential Luxury"],
    primaryChannel: "Residential Luxury",
  },
  {
    id: "person-omar-hassan",
    name: "Omar Hassan",
    title: "VP, Professional Channel",
    tier: "vp",
    departments: ["Sales"],
    primaryDepartment: "Sales",
    brands: ["Blaze Audio", "Sonance"],
    primaryBrand: "Blaze Audio",
    channels: ["Professional Enterprise", "Professional Audio"],
    primaryChannel: "Professional Enterprise",
  },
  {
    id: "person-natalie-wade",
    name: "Natalie Wade",
    title: "Head of People & Culture",
    tier: "director",
    departments: ["People & Culture"],
    primaryDepartment: "People & Culture",
    brands: ["Sonance", "iPort", "James Cloud Speaker", "Blaze Audio"],
    primaryBrand: "Sonance",
    channels: ["Residential Mid-Market", "Professional Enterprise"],
    primaryChannel: "Professional Enterprise",
  },
  {
    id: "person-ava-cho",
    name: "Ava Cho",
    title: "Director, Experience Design",
    tier: "director",
    departments: ["Product Development", "Marketing"],
    primaryDepartment: "Product Development",
    brands: ["James Cloud Speaker", "Sonance"],
    primaryBrand: "James Cloud Speaker",
    channels: ["Residential Luxury", "Professional Audio"],
    primaryChannel: "Residential Luxury",
  },
  {
    id: "person-victor-sloan",
    name: "Victor Sloan",
    title: "Director, Enterprise Programs",
    tier: "director",
    departments: ["Sales"],
    primaryDepartment: "Sales",
    brands: ["Sonance", "Blaze Audio"],
    primaryBrand: "Blaze Audio",
    channels: ["Professional Enterprise"],
    primaryChannel: "Professional Enterprise",
  },
  {
    id: "person-harper-ellis",
    name: "Harper Ellis",
    title: "Director, Luxury Partnerships",
    tier: "director",
    departments: ["Sales", "Marketing"],
    primaryDepartment: "Sales",
    brands: ["James Cloud Speaker", "Sonance"],
    primaryBrand: "James Cloud Speaker",
    channels: ["Residential Luxury"],
    primaryChannel: "Residential Luxury",
  },
  {
    id: "person-ryan-tate",
    name: "Ryan Tate",
    title: "Director, Retail Programs",
    tier: "director",
    departments: ["Sales", "Marketing"],
    primaryDepartment: "Sales",
    brands: ["Sonance", "iPort"],
    primaryBrand: "Sonance",
    channels: ["Residential Retail", "Residential Mid-Market"],
    primaryChannel: "Residential Retail",
  },
  {
    id: "person-joelle-carter",
    name: "Joelle Carter",
    title: "Director, Integrated Systems",
    tier: "director",
    departments: ["Product Development"],
    primaryDepartment: "Product Development",
    brands: ["iPort", "Sonance"],
    primaryBrand: "iPort",
    channels: ["Residential Mid-Market", "Professional Enterprise"],
    primaryChannel: "Residential Mid-Market",
  },
  {
    id: "person-sage-raman",
    name: "Sage Raman",
    title: "Director, Partner Enablement",
    tier: "director",
    departments: ["Marketing", "Sales"],
    primaryDepartment: "Marketing",
    brands: ["Blaze Audio", "Sonance"],
    primaryBrand: "Blaze Audio",
    channels: ["Professional Audio", "Professional Enterprise"],
    primaryChannel: "Professional Audio",
  },
];

const createPersonNode = (seed: SeedPerson): GraphNode => {
  const timestamp = new Date().toISOString();
  return {
    id: seed.id,
    kind: "person",
    name: seed.name,
    createdAt: timestamp,
    updatedAt: timestamp,
    attributes: {
      title: seed.title,
      departments: seed.departments,
      primaryDepartment: seed.primaryDepartment,
      brands: seed.brands,
      primaryBrand: seed.primaryBrand,
      channels: seed.channels,
      primaryChannel: seed.primaryChannel,
      tags: seed.tags ?? [],
      location: seed.location,
      costCenter: seed.costCenter,
      tier: seed.tier,
    },
  };
};

let edgeCounter = 0;
const nextEdgeId = () => {
  edgeCounter += 1;
  return edgeCounter.toString().padStart(4, "0");
};

const edge = (
  source: string,
  target: string,
  type: GraphEdge["metadata"]["type"],
  options: Partial<GraphEdge["metadata"]> = {},
): GraphEdge => {
  const timestamp = new Date().toISOString();
  return {
    id: `edge-${type}-${nextEdgeId()}`,
    source,
    target,
    metadata: {
      type,
      ...options,
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

const nodes = people.map(createPersonNode);

const managerEdges: GraphEdge[] = [
  edge("person-alex-morgan", "person-jules-meyer", "manager"),
  edge("person-alex-morgan", "person-ethan-rios", "manager"),
  edge("person-alex-morgan", "person-amelia-park", "manager"),
  edge("person-alex-morgan", "person-zoe-harper", "manager"),
  edge("person-alex-morgan", "person-liam-dorsey", "manager"),
  edge("person-alex-morgan", "person-sophia-ng", "manager"),
  edge("person-alex-morgan", "person-daniel-kim", "manager"),
  edge("person-alex-morgan", "person-lena-ortiz", "manager"),
  edge("person-alex-morgan", "person-omar-hassan", "manager"),
  edge("person-alex-morgan", "person-natalie-wade", "manager"),
  edge("person-amelia-park", "person-joelle-carter", "manager"),
  edge("person-sophia-ng", "person-ava-cho", "manager"),
  edge("person-omar-hassan", "person-victor-sloan", "manager"),
  edge("person-lena-ortiz", "person-harper-ellis", "manager"),
  edge("person-lena-ortiz", "person-ryan-tate", "manager"),
  edge("person-omar-hassan", "person-sage-raman", "manager"),
];

const sponsorEdges: GraphEdge[] = [
  edge("person-sophia-ng", "person-ethan-rios", "sponsor", {
    lenses: ["hierarchy", "department"],
  }),
  edge("person-daniel-kim", "person-harper-ellis", "sponsor"),
  edge("person-sophia-ng", "person-ava-cho", "sponsor"),
  edge("person-jules-meyer", "person-natalie-wade", "sponsor"),
];

const dottedEdges: GraphEdge[] = [
  edge("person-amelia-park", "person-ryan-tate", "dotted", {
    label: "Retail initiatives",
  }),
  edge("person-liam-dorsey", "person-victor-sloan", "dotted", {
    label: "Blaze enterprise GTM",
  }),
  edge("person-sage-raman", "person-ava-cho", "dotted", {
    label: "Partner experiences",
  }),
];

const defaultLensState = buildDefaultLensState();

const demoDocument: GraphDocument = {
  ...createEmptyGraphDocument(),
  schema_version: SCHEMA_VERSION,
  metadata: {
    name: "Sonance Matrix Organization",
    description:
      "Matrixed structure spanning Sonance brands, residential and professional channels, and functional departments.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  lens: "hierarchy",
  nodes,
  edges: [...managerEdges, ...sponsorEdges, ...dottedEdges],
  lens_state: defaultLensState,
};

export const DEMO_GRAPH_DOCUMENT: GraphDocument = demoDocument;

export const DEMO_LENS_LABELS: Record<LensId, string[]> = LENSES.reduce(
  (acc, lens) => {
    if (lens.id === "brand") {
      acc[lens.id] = [
        "Sonance",
        "iPort",
        "James Cloud Speaker",
        "Blaze Audio",
      ];
    } else if (lens.id === "channel") {
      acc[lens.id] = [
        "Residential Retail",
        "Residential Mid-Market",
        "Residential Luxury",
        "Professional Enterprise",
        "Professional Audio",
      ];
    } else if (lens.id === "department") {
      acc[lens.id] = [
        "Executive Leadership",
        "Product Development",
        "Marketing",
        "Sales",
        "People & Culture",
        "Finance",
      ];
    } else {
      acc[lens.id] = [];
    }
    return acc;
  },
  {} as Record<LensId, string[]>,
);
