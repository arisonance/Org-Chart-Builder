import type {
  GraphEdge,
  GraphNode,
  PersonNode,
  PersonAttributes,
} from "@/lib/schema/types";

export const makePerson = (
  id: string,
  overrides: Partial<PersonAttributes> & { name?: string } = {},
): PersonNode => {
  const { name, ...attrs } = overrides;
  return {
    id,
    kind: "person",
    name: name ?? id,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    attributes: {
      title: "",
      departments: [],
      brands: [],
      channels: [],
      tags: [],
      ...attrs,
    },
  };
};

export const makeManagerEdge = (source: string, target: string): GraphEdge => ({
  id: `edge-${source}-${target}`,
  source,
  target,
  metadata: { type: "manager" },
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
});

export const makeEdge = (
  id: string,
  source: string,
  target: string,
  type: GraphEdge["metadata"]["type"] = "manager",
): GraphEdge => ({
  id,
  source,
  target,
  metadata: { type },
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
});

export const asNodes = (people: PersonNode[]): GraphNode[] => people;
