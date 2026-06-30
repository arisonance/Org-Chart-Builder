export type EdgeRouteRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ManagerRouteInput = {
  id: string;
  sourceId?: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  routeLane?: number;
  routeBusY?: number;
  sourceRect?: EdgeRouteRect;
  targetRect?: EdgeRouteRect;
  avoidRect?: EdgeRouteRect;
  avoidRects?: EdgeRouteRect[];
};

const hashString = (value: string) =>
  value.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);

const expandRect = (rect: EdgeRouteRect, margin: number): EdgeRouteRect => ({
  x: rect.x - margin,
  y: rect.y - margin,
  width: rect.width + margin * 2,
  height: rect.height + margin * 2,
});

const segmentHitsRect = (
  a: { x: number; y: number },
  b: { x: number; y: number },
  rect: EdgeRouteRect,
) => {
  const left = rect.x;
  const right = rect.x + rect.width;
  const top = rect.y;
  const bottom = rect.y + rect.height;

  if (Math.abs(a.x - b.x) < 0.1) {
    const x = a.x;
    const minY = Math.min(a.y, b.y);
    const maxY = Math.max(a.y, b.y);
    return x >= left && x <= right && Math.max(minY, top) <= Math.min(maxY, bottom);
  }

  if (Math.abs(a.y - b.y) < 0.1) {
    const y = a.y;
    const minX = Math.min(a.x, b.x);
    const maxX = Math.max(a.x, b.x);
    return y >= top && y <= bottom && Math.max(minX, left) <= Math.min(maxX, right);
  }

  return false;
};

const firstHitRect = (
  points: Array<{ x: number; y: number }>,
  avoidRects: EdgeRouteRect[],
) => {
  for (const rect of avoidRects) {
    for (let index = 0; index < points.length - 1; index += 1) {
      if (segmentHitsRect(points[index], points[index + 1], rect)) {
        return rect;
      }
    }
  }
  return null;
};

export const buildManagerRoute = ({
  id,
  sourceId,
  sourceX,
  sourceY,
  targetX,
  targetY,
  routeLane,
  routeBusY,
  sourceRect,
  targetRect,
  avoidRect,
  avoidRects,
}: ManagerRouteInput) => {
  const branchKey = sourceId ?? id;
  const branchLane = routeLane ?? hashString(branchKey) % 4;

  if (sourceRect && targetRect) {
    const sourceCenterX = sourceRect.x + sourceRect.width / 2;
    const sourceBottomY = sourceRect.y + sourceRect.height;
    const targetCenterX = targetRect.x + targetRect.width / 2;
    const targetTopY = targetRect.y;
    const verticalGap = targetTopY - sourceBottomY;

    if (verticalGap > 36) {
      const startX = sourceCenterX;
      const startY = sourceBottomY;
      const targetEntryX = targetCenterX;
      const targetEntryY = targetTopY;
      const desiredDrop = Math.max(42, Math.min(86, verticalGap * 0.32));
      const laneOffset = branchLane * 12;
      const routedBusY =
        routeBusY && routeBusY > startY + 24 && routeBusY < targetEntryY - 24
          ? routeBusY
          : undefined;
      const busY = routedBusY ?? Math.min(
        targetEntryY - 28,
        startY + desiredDrop + laneOffset,
      );
      const points = [
        { x: startX, y: startY },
        { x: startX, y: busY },
        { x: targetEntryX, y: busY },
        { x: targetEntryX, y: targetEntryY },
      ];
      const obstacles = [
        ...(avoidRect ? [avoidRect] : []),
        ...(avoidRects ?? []),
      ].map((rect) => expandRect(rect, 24));
      const hit = firstHitRect(points, obstacles);
      if (hit) {
        const obstacleBottom = hit.y + hit.height;
        const routeLeft = targetEntryX < startX;
        const sideX = routeLeft ? hit.x : hit.x + hit.width;
        const upperY = Math.max(startY + 18, Math.min(hit.y - 12, startY + 34));
        const lowerY = Math.min(
          targetEntryY - 30,
          Math.max(obstacleBottom + 18, upperY + 34),
        );
        const detourPoints = [
          { x: startX, y: startY },
          { x: startX, y: upperY },
          { x: sideX, y: upperY },
          { x: sideX, y: lowerY },
          { x: targetEntryX, y: lowerY },
          { x: targetEntryX, y: targetEntryY },
        ];
        return {
          path: `M ${startX},${startY} L ${startX},${upperY} L ${sideX},${upperY} L ${sideX},${lowerY} L ${targetEntryX},${lowerY} L ${targetEntryX},${targetEntryY}`,
          labelX: (sideX + targetEntryX) / 2,
          labelY: lowerY,
          points: detourPoints,
        };
      }
      return {
        path: `M ${startX},${startY} L ${startX},${busY} L ${targetEntryX},${busY} L ${targetEntryX},${targetEntryY}`,
        labelX: (startX + targetEntryX) / 2,
        labelY: busY,
        points,
      };
    }
  }

  const verticalGap = targetY - sourceY;
  const busOffset = verticalGap > 170 ? 46 + branchLane * 14 : Math.max(30, verticalGap * 0.45);
  const busY = targetY - busOffset;
  const points = [
    { x: sourceX, y: sourceY },
    { x: sourceX, y: busY },
    { x: targetX, y: busY },
    { x: targetX, y: targetY },
  ];

  return {
    path: `M ${sourceX},${sourceY} L ${sourceX},${busY} L ${targetX},${busY} L ${targetX},${targetY}`,
    labelX: (sourceX + targetX) / 2,
    labelY: busY,
    points,
  };
};

export const buildCuratedPeerReportRoute = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourceRect,
  targetRect,
}: ManagerRouteInput) => {
  const sourceBottom = sourceRect ? sourceRect.y + sourceRect.height : sourceY;
  const targetBottom = targetRect ? targetRect.y + targetRect.height : targetY;
  const rowBottom = Math.max(sourceBottom, targetBottom);
  const busY = rowBottom + 10;
  const labelY = busY + 14;
  const points = [
    { x: sourceX, y: sourceY },
    { x: sourceX, y: busY },
    { x: targetX, y: busY },
    { x: targetX, y: targetY },
  ];

  return {
    path: `M ${sourceX},${sourceY} L ${sourceX},${busY} L ${targetX},${busY} L ${targetX},${targetY}`,
    labelX: targetX,
    labelY,
    points,
  };
};
