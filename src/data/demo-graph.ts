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
  location?: string;
  email?: string;
};

const people: SeedPerson[] = [
  // ==================== CEO ====================
  {
    id: "person-ari-supran",
    name: "Ari Supran",
    title: "Chief Executive Officer",
    tier: "c-suite",
    departments: ["Executive Leadership"],
    primaryDepartment: "Executive Leadership",
    location: "San Clemente, CA",
  },

  // ==================== C-SUITE / DIRECT REPORTS TO CEO ====================
  {
    id: "person-derick-dahl",
    name: "Derick Dahl",
    title: "Head of Technology and Innovation",
    tier: "c-suite",
    departments: ["Technology"],
    primaryDepartment: "Technology",
    location: "San Clemente, CA",
  },
  {
    id: "person-jason-sloan",
    name: "Jason Sloan",
    title: "Chief Revenue Officer - Reseller",
    tier: "c-suite",
    departments: ["Sales"],
    primaryDepartment: "Sales",
    location: "San Clemente, CA",
  },
  {
    id: "person-michael-sonntag",
    name: "Michael Sonntag",
    title: "Chief Revenue Officer - Corporate",
    tier: "c-suite",
    departments: ["Sales"],
    primaryDepartment: "Sales",
    location: "San Clemente, CA",
  },
  {
    id: "person-pat-mcgaughan",
    name: "Pat McGaughan",
    title: "COO/CTO",
    tier: "c-suite",
    departments: ["Operations"],
    primaryDepartment: "Operations",
    location: "San Clemente, CA",
  },
  {
    id: "person-rob-roland",
    name: "Rob Roland",
    title: "Executive VP/CFO",
    tier: "c-suite",
    departments: ["Finance"],
    primaryDepartment: "Finance",
    location: "San Clemente, CA",
  },
  {
    id: "person-jeana-ceglia",
    name: "Jeana Ceglia",
    title: "Executive Assistant to the CEO",
    tier: "ic",
    departments: ["Executive Support"],
    primaryDepartment: "Executive Support",
    location: "San Clemente, CA",
  },

  // ==================== TECHNOLOGY TEAM (Reports to Derick Dahl) ====================
  {
    id: "person-elliana-annador",
    name: "Elliana Annador",
    title: "Specialist",
    tier: "ic",
    departments: ["Technology"],
    primaryDepartment: "Technology",
    location: "San Clemente, CA",
  },
  {
    id: "person-caroline-loit",
    name: "Caroline Loit",
    title: "Lead Backend Engineer",
    tier: "manager",
    departments: ["Technology"],
    primaryDepartment: "Technology",
    location: "San Clemente, CA",
  },
  {
    id: "person-thomas-palmer",
    name: "Thomas Palmer",
    title: "Technology Research Specialist",
    tier: "ic",
    departments: ["Technology"],
    primaryDepartment: "Technology",
    location: "San Clemente, CA",
  },

  // ==================== RESELLER SALES TEAM (Reports to Jason Sloan) ====================
  {
    id: "person-andy-borrowscal",
    name: "Andy Borrowscal",
    title: "Lead Product Manager",
    tier: "manager",
    departments: ["Sales"],
    primaryDepartment: "Sales",
    location: "San Clemente, CA",
  },
  {
    id: "person-arun-mckay",
    name: "Arun McKay",
    title: "Director of Sales Operations and Marketing",
    tier: "director",
    departments: ["Sales"],
    primaryDepartment: "Sales",
    location: "San Clemente, CA",
  },
  {
    id: "person-christian-serge-nielsen",
    name: "Christian Serge Nielsen",
    title: "Director of Brand Marketing",
    tier: "director",
    departments: ["Marketing"],
    primaryDepartment: "Marketing",
    location: "San Clemente, CA",
  },
  {
    id: "person-mark-schnoeff",
    name: "Mark Schnoeff",
    title: "Studio Mayno",
    tier: "ic",
    departments: ["Sales"],
    primaryDepartment: "Sales",
    location: "San Clemente, CA",
  },
  {
    id: "person-tyler-acengi",
    name: "Tyler Acengi",
    title: "VP Sales - Northeast, Head",
    tier: "vp",
    departments: ["Sales"],
    primaryDepartment: "Sales",
    location: "San Clemente, CA",
  },
  {
    id: "person-anna-grighins",
    name: "Anna Grighins",
    title: "Executive Assistant",
    tier: "ic",
    departments: ["Executive Support"],
    primaryDepartment: "Executive Support",
    location: "San Clemente, CA",
  },
  {
    id: "person-mike-casey",
    name: "Mike Casey",
    title: "Senior Director of Strategic Accounts",
    tier: "director",
    departments: ["Sales"],
    primaryDepartment: "Sales",
    location: "San Clemente, CA",
  },

  // ==================== CORPORATE SALES TEAM (Reports to Michael Sonntag) ====================
  {
    id: "person-chris-lawson",
    name: "Chris Lawson",
    title: "Head of Sales and Partnerships",
    tier: "vp",
    departments: ["Sales"],
    primaryDepartment: "Sales",
    location: "San Clemente, CA",
  },
  {
    id: "person-monica-jorgensen",
    name: "Monica Jorgensen",
    title: "Vice President of Professional Services",
    tier: "vp",
    departments: ["Professional Services"],
    primaryDepartment: "Professional Services",
    location: "San Clemente, CA",
  },
  {
    id: "person-steve-benoit",
    name: "Steve Benoit",
    title: "Business Development Project Manager",
    tier: "manager",
    departments: ["Business Development"],
    primaryDepartment: "Business Development",
    location: "San Clemente, CA",
  },
  {
    id: "person-sydney-fletcher",
    name: "Sydney Fletcher",
    title: "Executive Assistant to the CFO",
    tier: "ic",
    departments: ["Executive Support"],
    primaryDepartment: "Executive Support",
    location: "San Clemente, CA",
  },
  {
    id: "person-nathan-whisnot",
    name: "Nathan Whisnot",
    title: "Vice President of National Accounts",
    tier: "vp",
    departments: ["Sales"],
    primaryDepartment: "Sales",
    location: "San Clemente, CA",
  },
  {
    id: "person-vacant-international",
    name: "Vacant",
    title: "Vice President of International",
    tier: "vp",
    departments: ["Sales"],
    primaryDepartment: "Sales",
    location: "San Clemente, CA",
  },

  // ==================== OPERATIONS TEAM (Reports to Pat McGaughan) ====================
  {
    id: "person-keith-kozak",
    name: "Keith Kozak",
    title: "Vice President of Human Resources",
    tier: "vp",
    departments: ["Human Resources"],
    primaryDepartment: "Human Resources",
    location: "San Clemente, CA",
  },
  {
    id: "person-gigi-dwyer",
    name: "Gigi Dwyer",
    title: "Vice President of Human Resources",
    tier: "vp",
    departments: ["Human Resources"],
    primaryDepartment: "Human Resources",
    location: "San Clemente, CA",
  },
  {
    id: "person-erin-petera",
    name: "Erin Petera",
    title: "Accountant",
    tier: "ic",
    departments: ["Finance"],
    primaryDepartment: "Finance",
    location: "San Clemente, CA",
  },
  {
    id: "person-keith-harper",
    name: "Keith Harper",
    title: "Vice President of IT",
    tier: "vp",
    departments: ["Information Technology"],
    primaryDepartment: "Information Technology",
    location: "San Clemente, CA",
  },

  // ==================== FINANCE/PRODUCT TEAM (Reports to Rob Roland) ====================
  {
    id: "person-erin-blackson",
    name: "Erin Blackson",
    title: "Director of Product Management",
    tier: "director",
    departments: ["Product"],
    primaryDepartment: "Product",
    location: "San Clemente, CA",
  },
  {
    id: "person-skylar-gray",
    name: "Skylar Gray",
    title: "Director of Product Management",
    tier: "director",
    departments: ["Product"],
    primaryDepartment: "Product",
    location: "San Clemente, CA",
  },
  {
    id: "person-brad-thrope",
    name: "Brad Thrope",
    title: "Vice President of Services",
    tier: "vp",
    departments: ["Services"],
    primaryDepartment: "Services",
    location: "San Clemente, CA",
  },

  // ==================== EXECUTIVE SUPPORT TEAM (Reports to Jeana Ceglia) ====================
  {
    id: "person-debbie-schnells",
    name: "Debbie Schnells",
    title: "Director of Marketing",
    tier: "director",
    departments: ["Marketing"],
    primaryDepartment: "Marketing",
    location: "San Clemente, CA",
  },
  {
    id: "person-todd-spier",
    name: "Todd Spier",
    title: "Chief Support Engineer",
    tier: "director",
    departments: ["Engineering"],
    primaryDepartment: "Engineering",
    location: "San Clemente, CA",
  },
  {
    id: "person-morgan-west",
    name: "Morgan West",
    title: "Director of Operations - China",
    tier: "director",
    departments: ["Operations"],
    primaryDepartment: "Operations",
    location: "China",
  },

  // ==================== LEVEL 3 AND BELOW ====================
  {
    id: "person-jenna-campbell",
    name: "Jenna Campbell",
    title: "Senior Director of Sales Operations",
    tier: "director",
    departments: ["Sales"],
    primaryDepartment: "Sales",
    location: "San Clemente, CA",
  },
  {
    id: "person-jackie-conner",
    name: "Jackie Conner",
    title: "Customer Service Representative",
    tier: "ic",
    departments: ["Customer Service"],
    primaryDepartment: "Customer Service",
    location: "San Clemente, CA",
  },
  {
    id: "person-jorge-nodal",
    name: "Jorge Nodal",
    title: "Vice President of Operations",
    tier: "vp",
    departments: ["Operations"],
    primaryDepartment: "Operations",
    location: "San Clemente, CA",
  },
  {
    id: "person-mike-naves",
    name: "Mike Naves",
    title: "Senior Director of Associate Programs",
    tier: "director",
    departments: ["Programs"],
    primaryDepartment: "Programs",
    location: "San Clemente, CA",
  },
  {
    id: "person-nova-navarro",
    name: "Nova Navarro",
    title: "Executive Assistant",
    tier: "ic",
    departments: ["Executive Support"],
    primaryDepartment: "Executive Support",
    location: "San Clemente, CA",
  },
  {
    id: "person-tyson-madrigal",
    name: "Tyson Madrigal",
    title: "Director of Product Development",
    tier: "director",
    departments: ["Product"],
    primaryDepartment: "Product",
    location: "San Clemente, CA",
  },
  {
    id: "person-alex-birch",
    name: "Alex Birch",
    title: "Director of Product Management",
    tier: "director",
    departments: ["Product"],
    primaryDepartment: "Product",
    location: "San Clemente, CA",
  },
  {
    id: "person-julio-davis",
    name: "Julio Davis",
    title: "Executive Assistant",
    tier: "ic",
    departments: ["Executive Support"],
    primaryDepartment: "Executive Support",
    location: "San Clemente, CA",
  },
];

export const DEMO_BRANDS = ["Sonance", "iPort", "James Cloud Speaker", "Blaze Audio"];

export const DEMO_CHANNELS = [
  "Residential Retail",
  "Residential Mid-Market",
  "Residential Luxury",
  "Professional Enterprise",
  "Professional Audio",
];

type MatrixAssignment = {
  brands: string[];
  primaryBrand?: string;
  channels: string[];
  primaryChannel?: string;
};

// Matrix-org assignments: who works on which brand and serves which channel,
// independent of the reporting hierarchy. Primary determines lane placement.
const matrixAssignments: Record<string, MatrixAssignment> = {
  // Executive leadership spans the whole portfolio
  "person-ari-supran": {
    brands: DEMO_BRANDS,
    primaryBrand: "Sonance",
    channels: DEMO_CHANNELS,
    primaryChannel: "Residential Luxury",
  },
  "person-jeana-ceglia": {
    brands: ["Sonance"],
    primaryBrand: "Sonance",
    channels: ["Residential Retail"],
    primaryChannel: "Residential Retail",
  },

  // Technology
  "person-derick-dahl": {
    brands: ["Sonance", "iPort"],
    primaryBrand: "Sonance",
    channels: ["Professional Enterprise"],
    primaryChannel: "Professional Enterprise",
  },
  "person-elliana-annador": {
    brands: ["iPort"],
    primaryBrand: "iPort",
    channels: ["Professional Enterprise"],
    primaryChannel: "Professional Enterprise",
  },
  "person-caroline-loit": {
    brands: ["Sonance"],
    primaryBrand: "Sonance",
    channels: ["Professional Audio"],
    primaryChannel: "Professional Audio",
  },
  "person-thomas-palmer": {
    brands: ["Blaze Audio"],
    primaryBrand: "Blaze Audio",
    channels: ["Professional Audio"],
    primaryChannel: "Professional Audio",
  },

  // Reseller sales organization
  "person-jason-sloan": {
    brands: ["Sonance", "James Cloud Speaker"],
    primaryBrand: "Sonance",
    channels: ["Residential Retail", "Residential Mid-Market", "Residential Luxury"],
    primaryChannel: "Residential Retail",
  },
  "person-andy-borrowscal": {
    brands: ["iPort", "Sonance"],
    primaryBrand: "iPort",
    channels: ["Residential Mid-Market"],
    primaryChannel: "Residential Mid-Market",
  },
  "person-arun-mckay": {
    brands: ["Sonance"],
    primaryBrand: "Sonance",
    channels: ["Residential Retail"],
    primaryChannel: "Residential Retail",
  },
  "person-christian-serge-nielsen": {
    brands: DEMO_BRANDS,
    primaryBrand: "James Cloud Speaker",
    channels: ["Residential Luxury"],
    primaryChannel: "Residential Luxury",
  },
  "person-mark-schnoeff": {
    brands: ["James Cloud Speaker"],
    primaryBrand: "James Cloud Speaker",
    channels: ["Residential Luxury"],
    primaryChannel: "Residential Luxury",
  },
  "person-tyler-acengi": {
    brands: ["Sonance"],
    primaryBrand: "Sonance",
    channels: ["Residential Mid-Market"],
    primaryChannel: "Residential Mid-Market",
  },
  "person-anna-grighins": {
    brands: ["Sonance"],
    primaryBrand: "Sonance",
    channels: ["Residential Retail"],
    primaryChannel: "Residential Retail",
  },
  "person-mike-casey": {
    brands: ["Blaze Audio", "Sonance"],
    primaryBrand: "Blaze Audio",
    channels: ["Professional Audio"],
    primaryChannel: "Professional Audio",
  },

  // Corporate sales organization
  "person-michael-sonntag": {
    brands: ["Sonance", "Blaze Audio"],
    primaryBrand: "Sonance",
    channels: ["Professional Enterprise", "Professional Audio"],
    primaryChannel: "Professional Enterprise",
  },
  "person-chris-lawson": {
    brands: ["iPort"],
    primaryBrand: "iPort",
    channels: ["Professional Enterprise"],
    primaryChannel: "Professional Enterprise",
  },
  "person-monica-jorgensen": {
    brands: ["Sonance"],
    primaryBrand: "Sonance",
    channels: ["Professional Enterprise"],
    primaryChannel: "Professional Enterprise",
  },
  "person-steve-benoit": {
    brands: ["iPort"],
    primaryBrand: "iPort",
    channels: ["Professional Enterprise"],
    primaryChannel: "Professional Enterprise",
  },
  "person-sydney-fletcher": {
    brands: ["Sonance"],
    primaryBrand: "Sonance",
    channels: ["Residential Retail"],
    primaryChannel: "Residential Retail",
  },
  "person-nathan-whisnot": {
    brands: ["Blaze Audio"],
    primaryBrand: "Blaze Audio",
    channels: ["Professional Audio"],
    primaryChannel: "Professional Audio",
  },
  "person-vacant-international": {
    brands: ["Sonance"],
    primaryBrand: "Sonance",
    channels: ["Professional Enterprise"],
    primaryChannel: "Professional Enterprise",
  },

  // Operations
  "person-pat-mcgaughan": {
    brands: ["Sonance"],
    primaryBrand: "Sonance",
    channels: ["Professional Enterprise"],
    primaryChannel: "Professional Enterprise",
  },
  "person-keith-kozak": {
    brands: ["Sonance"],
    primaryBrand: "Sonance",
    channels: ["Residential Retail"],
    primaryChannel: "Residential Retail",
  },
  "person-gigi-dwyer": {
    brands: ["Sonance"],
    primaryBrand: "Sonance",
    channels: ["Residential Mid-Market"],
    primaryChannel: "Residential Mid-Market",
  },
  "person-erin-petera": {
    brands: ["Sonance"],
    primaryBrand: "Sonance",
    channels: ["Residential Retail"],
    primaryChannel: "Residential Retail",
  },
  "person-keith-harper": {
    brands: ["Sonance"],
    primaryBrand: "Sonance",
    channels: ["Professional Enterprise"],
    primaryChannel: "Professional Enterprise",
  },

  // Finance / product
  "person-rob-roland": {
    brands: ["Sonance", "iPort"],
    primaryBrand: "Sonance",
    channels: ["Residential Luxury"],
    primaryChannel: "Residential Luxury",
  },
  "person-erin-blackson": {
    brands: ["iPort"],
    primaryBrand: "iPort",
    channels: ["Professional Enterprise"],
    primaryChannel: "Professional Enterprise",
  },
  "person-skylar-gray": {
    brands: ["James Cloud Speaker"],
    primaryBrand: "James Cloud Speaker",
    channels: ["Residential Luxury"],
    primaryChannel: "Residential Luxury",
  },
  "person-brad-thrope": {
    brands: ["Sonance"],
    primaryBrand: "Sonance",
    channels: ["Professional Audio"],
    primaryChannel: "Professional Audio",
  },

  // Executive support reports
  "person-debbie-schnells": {
    brands: ["James Cloud Speaker", "Sonance"],
    primaryBrand: "James Cloud Speaker",
    channels: ["Residential Luxury"],
    primaryChannel: "Residential Luxury",
  },
  "person-todd-spier": {
    brands: ["Blaze Audio"],
    primaryBrand: "Blaze Audio",
    channels: ["Professional Audio"],
    primaryChannel: "Professional Audio",
  },
  "person-morgan-west": {
    brands: ["Sonance"],
    primaryBrand: "Sonance",
    channels: ["Professional Enterprise"],
    primaryChannel: "Professional Enterprise",
  },

  // Level 3 and below
  "person-jenna-campbell": {
    brands: ["Sonance"],
    primaryBrand: "Sonance",
    channels: ["Residential Retail"],
    primaryChannel: "Residential Retail",
  },
  "person-jackie-conner": {
    brands: ["James Cloud Speaker"],
    primaryBrand: "James Cloud Speaker",
    channels: ["Residential Luxury"],
    primaryChannel: "Residential Luxury",
  },
  "person-jorge-nodal": {
    brands: ["Sonance"],
    primaryBrand: "Sonance",
    channels: ["Professional Enterprise"],
    primaryChannel: "Professional Enterprise",
  },
  "person-mike-naves": {
    brands: ["Sonance"],
    primaryBrand: "Sonance",
    channels: ["Residential Mid-Market"],
    primaryChannel: "Residential Mid-Market",
  },
  "person-nova-navarro": {
    brands: ["Sonance"],
    primaryBrand: "Sonance",
    channels: ["Residential Retail"],
    primaryChannel: "Residential Retail",
  },
  "person-tyson-madrigal": {
    brands: ["iPort"],
    primaryBrand: "iPort",
    channels: ["Professional Enterprise"],
    primaryChannel: "Professional Enterprise",
  },
  "person-alex-birch": {
    brands: ["Blaze Audio"],
    primaryBrand: "Blaze Audio",
    channels: ["Professional Audio"],
    primaryChannel: "Professional Audio",
  },
  "person-julio-davis": {
    brands: ["Blaze Audio"],
    primaryBrand: "Blaze Audio",
    channels: ["Professional Audio"],
    primaryChannel: "Professional Audio",
  },
};

const createPersonNode = (seed: SeedPerson): GraphNode => {
  const timestamp = new Date().toISOString();
  const matrix = matrixAssignments[seed.id];
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
      tags: [],
      location: seed.location,
      tier: seed.tier,
      brands: matrix?.brands ?? [],
      primaryBrand: matrix?.primaryBrand,
      channels: matrix?.channels ?? [],
      primaryChannel: matrix?.primaryChannel,
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
  // CEO's direct reports
  edge("person-ari-supran", "person-derick-dahl", "manager"),
  edge("person-ari-supran", "person-jason-sloan", "manager"),
  edge("person-ari-supran", "person-michael-sonntag", "manager"),
  edge("person-ari-supran", "person-pat-mcgaughan", "manager"),
  edge("person-ari-supran", "person-rob-roland", "manager"),
  edge("person-ari-supran", "person-jeana-ceglia", "manager"),
  
  // Technology Team (reports to Derick Dahl)
  edge("person-derick-dahl", "person-elliana-annador", "manager"),
  edge("person-derick-dahl", "person-caroline-loit", "manager"),
  edge("person-derick-dahl", "person-thomas-palmer", "manager"),
  
  // Reseller Sales Team (reports to Jason Sloan)
  edge("person-jason-sloan", "person-andy-borrowscal", "manager"),
  edge("person-jason-sloan", "person-arun-mckay", "manager"),
  edge("person-jason-sloan", "person-christian-serge-nielsen", "manager"),
  edge("person-jason-sloan", "person-mark-schnoeff", "manager"),
  edge("person-jason-sloan", "person-tyler-acengi", "manager"),
  edge("person-jason-sloan", "person-anna-grighins", "manager"),
  edge("person-jason-sloan", "person-mike-casey", "manager"),
  
  // Corporate Sales Team (reports to Michael Sonntag)
  edge("person-michael-sonntag", "person-chris-lawson", "manager"),
  edge("person-michael-sonntag", "person-monica-jorgensen", "manager"),
  edge("person-michael-sonntag", "person-steve-benoit", "manager"),
  edge("person-michael-sonntag", "person-sydney-fletcher", "manager"),
  edge("person-michael-sonntag", "person-nathan-whisnot", "manager"),
  edge("person-michael-sonntag", "person-vacant-international", "manager"),
  
  // Operations Team (reports to Pat McGaughan)
  edge("person-pat-mcgaughan", "person-keith-kozak", "manager"),
  edge("person-pat-mcgaughan", "person-gigi-dwyer", "manager"),
  edge("person-pat-mcgaughan", "person-erin-petera", "manager"),
  edge("person-pat-mcgaughan", "person-keith-harper", "manager"),
  
  // Finance/Product Team (reports to Rob Roland)
  edge("person-rob-roland", "person-erin-blackson", "manager"),
  edge("person-rob-roland", "person-skylar-gray", "manager"),
  edge("person-rob-roland", "person-brad-thrope", "manager"),
  
  // Executive Support Team (reports to Jeana Ceglia)
  edge("person-jeana-ceglia", "person-debbie-schnells", "manager"),
  edge("person-jeana-ceglia", "person-todd-spier", "manager"),
  edge("person-jeana-ceglia", "person-morgan-west", "manager"),
  
  // Level 3 and below (will add as we identify reporting relationships)
  edge("person-arun-mckay", "person-jenna-campbell", "manager"),
  edge("person-chris-lawson", "person-jorge-nodal", "manager"),
  edge("person-monica-jorgensen", "person-mike-naves", "manager"),
  edge("person-sydney-fletcher", "person-nova-navarro", "manager"),
  edge("person-erin-blackson", "person-tyson-madrigal", "manager"),
  edge("person-skylar-gray", "person-alex-birch", "manager"),
  edge("person-debbie-schnells", "person-jackie-conner", "manager"),
  edge("person-todd-spier", "person-julio-davis", "manager"),
];

// Matrix relationships: dotted lines connect brand/channel leads to the
// cross-functional people on their virtual teams; sponsor edges mark
// executive sponsorship of a brand. These cut across the reporting hierarchy.
const matrixEdges: GraphEdge[] = [
  // iPort brand team (led by Andy Borrowscal)
  edge("person-andy-borrowscal", "person-erin-blackson", "dotted", { label: "iPort brand team" }),
  edge("person-andy-borrowscal", "person-tyson-madrigal", "dotted", { label: "iPort brand team" }),
  edge("person-andy-borrowscal", "person-chris-lawson", "dotted", { label: "iPort brand team" }),
  edge("person-andy-borrowscal", "person-steve-benoit", "dotted", { label: "iPort brand team" }),
  edge("person-andy-borrowscal", "person-elliana-annador", "dotted", { label: "iPort brand team" }),

  // James Cloud Speaker brand team (led by Christian Serge Nielsen)
  edge("person-christian-serge-nielsen", "person-skylar-gray", "dotted", { label: "James Cloud brand team" }),
  edge("person-christian-serge-nielsen", "person-mark-schnoeff", "dotted", { label: "James Cloud brand team" }),
  edge("person-christian-serge-nielsen", "person-debbie-schnells", "dotted", { label: "James Cloud brand team" }),
  edge("person-christian-serge-nielsen", "person-jackie-conner", "dotted", { label: "James Cloud brand team" }),

  // Blaze Audio brand team (led by Mike Casey)
  edge("person-mike-casey", "person-alex-birch", "dotted", { label: "Blaze Audio brand team" }),
  edge("person-mike-casey", "person-nathan-whisnot", "dotted", { label: "Blaze Audio brand team" }),
  edge("person-mike-casey", "person-todd-spier", "dotted", { label: "Blaze Audio brand team" }),
  edge("person-mike-casey", "person-thomas-palmer", "dotted", { label: "Blaze Audio brand team" }),

  // Channel coordination
  edge("person-jason-sloan", "person-debbie-schnells", "dotted", { label: "Residential channel" }),
  edge("person-jason-sloan", "person-skylar-gray", "dotted", { label: "Residential channel" }),
  edge("person-michael-sonntag", "person-brad-thrope", "dotted", { label: "Professional channel" }),
  edge("person-michael-sonntag", "person-caroline-loit", "dotted", { label: "Professional channel" }),

  // Executive sponsorship of brands
  edge("person-rob-roland", "person-andy-borrowscal", "sponsor", { label: "iPort P&L sponsor" }),
  edge("person-derick-dahl", "person-mike-casey", "sponsor", { label: "Blaze Audio sponsor" }),
  edge("person-ari-supran", "person-christian-serge-nielsen", "sponsor", { label: "James Cloud sponsor" }),
];

const allEdges = [...managerEdges, ...matrixEdges];

const defaultLensState = buildDefaultLensState();

const demoDocument: GraphDocument = {
  ...createEmptyGraphDocument(),
  schema_version: SCHEMA_VERSION,
  metadata: {
    name: "Sonance Organization",
    description:
      "Sonance organizational structure with reporting relationships.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  lens: "hierarchy",
  nodes,
  edges: allEdges,
  lens_state: defaultLensState,
};

export const DEMO_GRAPH_DOCUMENT: GraphDocument = demoDocument;

export const DEMO_LENS_LABELS: Record<LensId, string[]> = LENSES.reduce(
  (acc, lens) => {
    if (lens.id === "department") {
      acc[lens.id] = [
        "Executive Leadership",
        "Technology",
        "Sales",
        "Marketing",
        "Operations",
        "Finance",
        "Human Resources",
        "Information Technology",
        "Product",
        "Services",
        "Professional Services",
        "Business Development",
        "Engineering",
        "Executive Support",
        "Programs",
        "Customer Service",
      ];
    } else if (lens.id === "brand") {
      acc[lens.id] = [...DEMO_BRANDS];
    } else if (lens.id === "channel") {
      acc[lens.id] = [...DEMO_CHANNELS];
    } else {
      acc[lens.id] = [];
    }
    return acc;
  },
  {} as Record<LensId, string[]>,
);
