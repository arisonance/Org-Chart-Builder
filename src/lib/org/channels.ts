// Hierarchical sales-channel taxonomy. People are assigned to leaf channels
// (attributes.channels / primaryChannel); the groups give the Channel lens and the
// Brand×Channel grid their structure.

export type ChannelLeaf = string;
export type ChannelGroup = {
  key: string;
  label: string;
  children: Array<ChannelGroup | ChannelLeaf>;
};

export const CHANNEL_TAXONOMY: ChannelGroup[] = [
  {
    key: "Residential",
    label: "Residential",
    children: ["Luxury Residential", "National Accounts", "International Residential"],
  },
  {
    key: "Commercial",
    label: "Commercial",
    children: [
      {
        key: "Professional",
        label: "Professional",
        children: ["North America Professional", "International Professional"],
      },
      "Enterprise",
    ],
  },
  {
    key: "Other",
    label: "Other",
    children: ["Other"],
  },
];

export const CHANNEL_GROUP_ORDER = CHANNEL_TAXONOMY.map((g) => g.label);

const isGroup = (n: ChannelGroup | ChannelLeaf): n is ChannelGroup => typeof n !== "string";

// Walk the tree once to derive flat lookups
const leaves: string[] = [];
const topGroupOf: Record<string, string> = {};
const subGroupOf: Record<string, string> = {};
const pathOf: Record<string, string[]> = {};

const walk = (node: ChannelGroup | ChannelLeaf, ancestors: string[]) => {
  if (isGroup(node)) {
    node.children.forEach((c) => walk(c, [...ancestors, node.label]));
  } else {
    leaves.push(node);
    pathOf[node] = ancestors;
    topGroupOf[node] = ancestors[0] ?? node;
    subGroupOf[node] = ancestors[ancestors.length - 1] ?? node;
  }
};
CHANNEL_TAXONOMY.forEach((g) => walk(g, []));

/** Leaf channels in canonical (taxonomy) order. */
export const CHANNEL_LEAVES: string[] = leaves;

/** Top-level group ("Residential" | "Commercial" | "Other") for a leaf channel,
 *  or the label itself if a group label is passed in. */
export const channelTopGroup = (channel: string): string | null =>
  topGroupOf[channel] ?? (GROUP_LABELS.has(channel) ? channel : null);
/** Immediate parent group ("Residential" | "Professional" | "Commercial" | "Other"). */
export const channelSubGroup = (channel: string): string | null => subGroupOf[channel] ?? null;
/** Ancestor labels, outermost first. */
export const channelPath = (channel: string): string[] => pathOf[channel] ?? [];

const GROUP_LABELS = new Set(CHANNEL_TAXONOMY.map((g) => g.label));
export const isChannelGroupLabel = (s: string) => GROUP_LABELS.has(s);

const orderIndex: Record<string, number> = {};
CHANNEL_LEAVES.forEach((c, i) => (orderIndex[c] = i));
// A collapsed group's column/lane sorts to where its first channel would sit
const groupMinIndex: Record<string, number> = {};
CHANNEL_TAXONOMY.forEach((g) => {
  const idxs = CHANNEL_LEAVES.filter((leaf) => topGroupOf[leaf] === g.label).map((leaf) => orderIndex[leaf]);
  groupMinIndex[g.label] = idxs.length ? Math.min(...idxs) : 999;
});
/** Sort key that keeps a group's channels adjacent and in taxonomy order; handles
 *  collapsed group labels; shared/unknown last. */
export const channelSortKey = (channel: string): number =>
  channel in orderIndex ? orderIndex[channel] : channel in groupMinIndex ? groupMinIndex[channel] : 999;
