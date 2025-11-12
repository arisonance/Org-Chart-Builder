'use client';

import { BaseEdge, EdgeProps, getSmoothStepPath } from '@xyflow/react';
import { RELATIONSHIP_COLORS } from '@/lib/theme/palette';
import type { GraphEdge } from '@/lib/schema/types';

type EnhancedEdgeData = GraphEdge;

export function ManagerEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  selected,
}: EdgeProps<EnhancedEdgeData>) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeStyle = {
    stroke: selected ? RELATIONSHIP_COLORS.manager : RELATIONSHIP_COLORS.manager,
    strokeWidth: selected ? 3 : 2.5,
    ...(style || {}),
  };

  return (
    <BaseEdge
      path={edgePath}
      markerEnd={markerEnd}
      style={edgeStyle}
    />
  );
}

export function SponsorEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  selected,
}: EdgeProps<EnhancedEdgeData>) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeStyle = {
    stroke: selected ? RELATIONSHIP_COLORS.sponsor : RELATIONSHIP_COLORS.sponsor,
    strokeWidth: selected ? 3 : 2.5,
    ...(style || {}),
  };

  return (
    <>
      <defs>
        <marker
          id={`diamond-${id}`}
          markerWidth="14"
          markerHeight="14"
          refX="7"
          refY="7"
          orient="auto"
        >
          <path
            d="M0,7 L7,0 L14,7 L7,14 z"
            fill="none"
            stroke={RELATIONSHIP_COLORS.sponsor}
            strokeWidth="2"
          />
        </marker>
      </defs>
      <BaseEdge
        path={edgePath}
        markerEnd={`url(#diamond-${id})`}
        style={edgeStyle}
      />
    </>
  );
}

export function DottedEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  selected,
}: EdgeProps<EnhancedEdgeData>) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeStyle = {
    stroke: selected ? RELATIONSHIP_COLORS.dotted : RELATIONSHIP_COLORS.dotted,
    strokeWidth: selected ? 3 : 2.5,
    strokeDasharray: '6 6',
    ...(style || {}),
  };

  return (
    <BaseEdge
      path={edgePath}
      markerEnd={markerEnd}
      style={edgeStyle}
    />
  );
}

// Export edge types object for React Flow
export const customEdgeTypes = {
  manager: ManagerEdge,
  sponsor: SponsorEdge,
  dotted: DottedEdge,
};

