'use client';

import { memo, useMemo } from 'react';
import { BaseEdge, EdgeProps, getSmoothStepPath } from '@xyflow/react';
import { RELATIONSHIP_COLORS } from '@/lib/theme/palette';
import type { GraphEdge } from '@/lib/schema/types';

type EnhancedEdgeData = GraphEdge;

function ManagerEdgeComponent({
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
  const [edgePath] = useMemo(
    () =>
      getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
      }),
    [sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition]
  );

  const edgeStyle = useMemo(
    () => ({
      stroke: RELATIONSHIP_COLORS.manager,
      strokeWidth: selected ? 3 : 2.5,
      ...(style || {}),
    }),
    [selected, style]
  );

  return (
    <BaseEdge
      path={edgePath}
      markerEnd={markerEnd}
      style={edgeStyle}
    />
  );
}

export const ManagerEdge = memo(ManagerEdgeComponent);

function SponsorEdgeComponent({
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
  const [edgePath] = useMemo(
    () =>
      getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
      }),
    [sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition]
  );

  const edgeStyle = useMemo(
    () => ({
      stroke: RELATIONSHIP_COLORS.sponsor,
      strokeWidth: selected ? 3 : 2.5,
      ...(style || {}),
    }),
    [selected, style]
  );

  const markerId = `diamond-${id}`;

  return (
    <>
      <defs>
        <marker
          id={markerId}
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
        markerEnd={`url(#${markerId})`}
        style={edgeStyle}
      />
    </>
  );
}

export const SponsorEdge = memo(SponsorEdgeComponent);

function DottedEdgeComponent({
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
  const [edgePath] = useMemo(
    () =>
      getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
      }),
    [sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition]
  );

  const edgeStyle = useMemo(
    () => ({
      stroke: RELATIONSHIP_COLORS.dotted,
      strokeWidth: selected ? 3 : 2.5,
      strokeDasharray: '6 6',
      ...(style || {}),
    }),
    [selected, style]
  );

  return (
    <BaseEdge
      path={edgePath}
      markerEnd={markerEnd}
      style={edgeStyle}
    />
  );
}

export const DottedEdge = memo(DottedEdgeComponent);

// Export edge types object for React Flow
export const customEdgeTypes = {
  manager: ManagerEdge,
  sponsor: SponsorEdge,
  dotted: DottedEdge,
};

