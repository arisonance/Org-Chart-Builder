import { describe, expect, it } from "vitest";
import { buildManagerRoute } from "@/lib/graph/edge-routing";

describe("buildManagerRoute", () => {
  it("returns the orthogonal segments used by manager edges and audit checks", () => {
    const route = buildManagerRoute({
      id: "edge-manager-report",
      sourceId: "manager",
      sourceX: 100,
      sourceY: 150,
      targetX: 340,
      targetY: 420,
      routeLane: 0,
      routeBusY: 240,
      sourceRect: { x: 0, y: 0, width: 200, height: 150 },
      targetRect: { x: 240, y: 420, width: 200, height: 150 },
    });

    expect(route.path).toBe("M 100,150 L 100,240 L 340,240 L 340,420");
    expect(route.points).toEqual([
      { x: 100, y: 150 },
      { x: 100, y: 240 },
      { x: 340, y: 240 },
      { x: 340, y: 420 },
    ]);
    expect(route.labelX).toBe(220);
    expect(route.labelY).toBe(240);
  });

  it("falls back to a stable bus when a supplied bus would sit outside the gap", () => {
    const route = buildManagerRoute({
      id: "edge-manager-report",
      sourceId: "manager",
      sourceX: 100,
      sourceY: 150,
      targetX: 340,
      targetY: 420,
      routeLane: 1,
      routeBusY: 410,
      sourceRect: { x: 0, y: 0, width: 200, height: 150 },
      targetRect: { x: 240, y: 420, width: 200, height: 150 },
    });

    expect(route.points[1].y).toBe(248);
    expect(route.points[2].y).toBe(248);
  });

  it("routes around unrelated cards in the target column", () => {
    const route = buildManagerRoute({
      id: "edge-juan-ryan",
      sourceId: "person-juan-rincon",
      sourceX: 640,
      sourceY: 300,
      targetX: 500,
      targetY: 760,
      routeLane: 0,
      routeBusY: 500,
      sourceRect: { x: 510, y: 150, width: 260, height: 150 },
      targetRect: { x: 370, y: 760, width: 260, height: 150 },
      avoidRects: [{ x: 370, y: 520, width: 260, height: 150 }],
    });

    expect(route.points.length).toBeGreaterThan(4);
    const verticalSegments = route.points
      .slice(0, -1)
      .map((point, index) => [point, route.points[index + 1]] as const)
      .filter(([start, end]) => start.x === end.x);
    expect(
      verticalSegments.some(
        ([start, end]) =>
          start.x === 500 &&
          Math.max(Math.min(start.y, end.y), 520) <=
            Math.min(Math.max(start.y, end.y), 670),
      ),
    ).toBe(false);
  });
});
