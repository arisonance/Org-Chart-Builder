import type { OrgDimension, OrgMatrix, Person, Perspective } from "./types";

type GroupDescriptor = {
  dimension: OrgDimension;
  people: Person[];
};

export const perspectiveOrder: Perspective[] = [
  "brand",
  "channel",
  "department",
];

export const perspectiveLabels: Record<Perspective, string> = {
  brand: "Brand",
  channel: "Channel",
  department: "Department",
};

export const perspectiveDescriptions: Record<Perspective, string> = {
  brand:
    "View brand ownership and how leaders align across Sonance, iPort, James Cloud Speaker, and Blaze Audio.",
  channel:
    "Explore how channel leaders support residential and professional programs and where responsibilities overlap.",
  department:
    "See matrixed department leadership spanning Product, Marketing, Sales, Finance, and People & Culture.",
};

export const buildGroupings = (
  perspective: Perspective,
  matrix: OrgMatrix,
): GroupDescriptor[] => {
  const dimensionKey =
    perspective === "brand"
      ? "brands"
      : perspective === "channel"
        ? "channels"
        : "departments";

  return matrix[dimensionKey].map((dimension) => {
    const people = matrix.leadership.filter((person) => {
      if (perspective === "brand") {
        return person.brandIds.includes(dimension.id);
      }
      if (perspective === "channel") {
        return person.channelIds.includes(dimension.id);
      }
      return person.departmentIds.includes(dimension.id);
    });

    return { dimension, people };
  });
};

export const buildDimensionMap = (dimensions: OrgDimension[]) =>
  dimensions.reduce<Record<string, OrgDimension>>((acc, dimension) => {
    acc[dimension.id] = dimension;
    return acc;
  }, {});
