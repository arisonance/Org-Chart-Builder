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
};

const hashString = (value: string) =>
  value.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);

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
}: ManagerRouteInput) => {
  const branchKey = sourceId ?? id;
  const branchLane = routeLane ?? hashString(branchKey) % 4;

  if (sourceRect && targetRect) {
    const sourceCenterX = sourceRect.x + sourceRect.width / 2;
    const targetCenterX = targetRect.x + targetRect.width / 2;
    const verticalGap = targetY - sourceY;

    if (verticalGap > 36) {
      const startX = sourceX || sourceCenterX;
      const startY = sourceY;
      const targetEntryX = targetX || targetCenterX;
      const targetEntryY = targetY;
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
