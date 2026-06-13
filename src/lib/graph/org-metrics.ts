import type { GraphEdge, GraphNode, PersonNode } from "@/lib/schema/types";

export type SpanEntry = { id: string; name: string; title: string; span: number };
export type GapEntry = { brand: string; channel: string };

export type OrgMetrics = {
  totalPeople: number;
  managerCount: number;
  spanMax: number;
  spanMedian: number;
  maxDepth: number;
  // Managers carrying too many direct reports (overload risk)
  overloadedManagers: SpanEntry[];
  // Managers with a single report (candidate layers to flatten)
  thinManagers: SpanEntry[];
  // People living in 2+ brands AND 2+ channels (conflicting-priorities risk)
  heavyMatrix: string[];
  // People at the deepest tiers of the tree
  deepReports: string[];
  // Brand × channel intersections with no one assigned (coverage exposure)
  coverageGaps: GapEntry[];
  // Brands / channels actually used (excludes the shared "All …" buckets)
  brands: string[];
  channels: string[];
};

const OVERLOAD_SPAN = 8;
const DEEP_LEVEL = 6;
const isShared = (key: string) => key.startsWith("All ");

const median = (values: number[]) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
};

export const computeOrgMetrics = (nodes: GraphNode[], edges: GraphEdge[]): OrgMetrics => {
  const people = nodes.filter((n): n is PersonNode => n.kind === "person");
  const byId = new Map(people.map((p) => [p.id, p]));

  // Direct manager + direct-report counts from solid reporting edges
  const parentOf: Record<string, string> = {};
  const reportCount: Record<string, number> = {};
  edges
    .filter((e) => e.metadata.type === "manager")
    .forEach((e) => {
      if (!(e.target in parentOf)) parentOf[e.target] = e.source;
      reportCount[e.source] = (reportCount[e.source] ?? 0) + 1;
    });

  const depthOf = (id: string, seen = new Set<string>()): number => {
    if (seen.has(id)) return 0;
    seen.add(id);
    const parent = parentOf[id];
    return parent ? depthOf(parent, seen) + 1 : 0;
  };

  const spanEntries: SpanEntry[] = Object.entries(reportCount).map(([id, span]) => ({
    id,
    name: byId.get(id)?.name ?? id,
    title: byId.get(id)?.attributes.title ?? "",
    span,
  }));
  const spans = spanEntries.map((e) => e.span);

  const brands = [
    ...new Set(
      people.map((p) => p.attributes.primaryBrand).filter((b): b is string => !!b && !isShared(b)),
    ),
  ];
  const channels = [
    ...new Set(
      people
        .map((p) => p.attributes.primaryChannel)
        .filter((c): c is string => !!c && !isShared(c)),
    ),
  ];

  // Coverage matrix on primary brand × primary channel
  const cellCount = new Map<string, number>();
  people.forEach((p) => {
    const b = p.attributes.primaryBrand;
    const c = p.attributes.primaryChannel;
    if (b && c && !isShared(b) && !isShared(c)) {
      cellCount.set(`${b}|||${c}`, (cellCount.get(`${b}|||${c}`) ?? 0) + 1);
    }
  });
  const coverageGaps: GapEntry[] = [];
  brands.forEach((brand) => {
    channels.forEach((channel) => {
      if (!cellCount.get(`${brand}|||${channel}`)) {
        coverageGaps.push({ brand, channel });
      }
    });
  });

  return {
    totalPeople: people.length,
    managerCount: spanEntries.length,
    spanMax: spans.length ? Math.max(...spans) : 0,
    spanMedian: median(spans),
    maxDepth: Math.max(0, ...people.map((p) => depthOf(p.id))),
    overloadedManagers: spanEntries
      .filter((e) => e.span > OVERLOAD_SPAN)
      .sort((a, b) => b.span - a.span),
    thinManagers: spanEntries.filter((e) => e.span === 1).sort((a, b) => a.name.localeCompare(b.name)),
    heavyMatrix: people
      .filter((p) => p.attributes.brands.length >= 2 && p.attributes.channels.length >= 2)
      .map((p) => p.id),
    deepReports: people.filter((p) => depthOf(p.id) >= DEEP_LEVEL).map((p) => p.id),
    coverageGaps,
    brands,
    channels,
  };
};
