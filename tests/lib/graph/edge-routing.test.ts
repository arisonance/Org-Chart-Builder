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
});
