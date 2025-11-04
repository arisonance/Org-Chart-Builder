'use client';

import { BaseEdge, EdgeLabelRenderer, EdgeProps, getBezierPath, getSmoothStepPath } from '@xyflow/react';
import { RELATIONSHIP_COLORS } from '@/lib/theme/palette';
import type { GraphEdge } from '@/lib/schema/types';

type EnhancedEdgeData = GraphEdge & {
  sharedDimensions?: {
    brands: string[];
    channels: string[];
    departments: string[];
  };
  isCrossDimension?: boolean;
};

export function ManagerEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
  data,
}: EdgeProps<EnhancedEdgeData>) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const sharedDimensions = data?.sharedDimensions;
  const isCrossDimension = data?.isCrossDimension;
  const hasSharedDimensions = sharedDimensions && (
    sharedDimensions.brands.length > 0 ||
    sharedDimensions.channels.length > 0 ||
    sharedDimensions.departments.length > 0
  );

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: selected ? RELATIONSHIP_COLORS.manager : style.stroke || RELATIONSHIP_COLORS.manager,
          strokeWidth: selected ? 3 : style.strokeWidth || 2.5,
        }}
      />
      {hasSharedDimensions && selected && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: 10,
              pointerEvents: 'all',
            }}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 shadow-lg dark:border-white/10 dark:bg-slate-900"
          >
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              Shared: {[
                ...(sharedDimensions.brands.length > 0 ? [`${sharedDimensions.brands.length} brand${sharedDimensions.brands.length > 1 ? 's' : ''}`] : []),
                ...(sharedDimensions.channels.length > 0 ? [`${sharedDimensions.channels.length} channel${sharedDimensions.channels.length > 1 ? 's' : ''}`] : []),
                ...(sharedDimensions.departments.length > 0 ? [`${sharedDimensions.departments.length} dept${sharedDimensions.departments.length > 1 ? 's' : ''}`] : []),
              ].join(', ')}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
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
  style = {},
  markerEnd,
  selected,
  data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

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
        style={{
          ...style,
          stroke: selected ? RELATIONSHIP_COLORS.sponsor : style.stroke || RELATIONSHIP_COLORS.sponsor,
          strokeWidth: selected ? 3 : style.strokeWidth || 2.5,
        }}
      />
    </>
  );
}

export function DottedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
  data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: selected ? RELATIONSHIP_COLORS.dotted : style.stroke || RELATIONSHIP_COLORS.dotted,
          strokeWidth: selected ? 3 : style.strokeWidth || 2.5,
          strokeDasharray: '6 6',
        }}
      />
    </>
  );
}

// Export edge types object for React Flow
export const customEdgeTypes = {
  manager: ManagerEdge,
  sponsor: SponsorEdge,
  dotted: DottedEdge,
};

