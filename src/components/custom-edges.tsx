'use client';

import { memo, useMemo } from 'react';
import { BaseEdge, EdgeLabelRenderer, EdgeProps, getSmoothStepPath } from '@xyflow/react';
import { RELATIONSHIP_COLORS } from '@/lib/theme/palette';
import type { GraphEdge } from '@/lib/schema/types';

type EnhancedEdgeData = GraphEdge & {
  relationshipLabel?: string;
  showLabel?: boolean;
};

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
  data,
}: EdgeProps<EnhancedEdgeData>) {
  const [edgePath, labelX, labelY] = useMemo(
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
      // Keep the line a constant width on screen so it stays visible when zoomed out
      vectorEffect: 'non-scaling-stroke' as const,
      ...(style || {}),
    }),
    [selected, style]
  );

  const edgeData = data as EnhancedEdgeData | undefined;
  const showLabel = selected || edgeData?.showLabel;

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{
          stroke: 'rgba(255, 255, 255, 0.92)',
          strokeWidth: selected ? 8 : 7,
          strokeLinecap: 'round',
          vectorEffect: 'non-scaling-stroke',
        }}
      />
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={edgeStyle}
      />
      {showLabel && edgeData?.relationshipLabel && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-none absolute max-w-[220px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-200 bg-white/95 px-2.5 py-1 text-[10px] font-semibold leading-tight text-sky-900 shadow-sm ring-1 ring-white/80 dark:border-sky-400/30 dark:bg-slate-950/95 dark:text-sky-100 dark:ring-slate-900"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            {edgeData.relationshipLabel}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
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
      vectorEffect: 'non-scaling-stroke' as const,
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
        style={{
          stroke: 'rgba(255, 255, 255, 0.9)',
          strokeWidth: selected ? 8 : 7,
          strokeLinecap: 'round',
          vectorEffect: 'non-scaling-stroke',
        }}
      />
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
      vectorEffect: 'non-scaling-stroke' as const,
      ...(style || {}),
    }),
    [selected, style]
  );

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{
          stroke: 'rgba(255, 255, 255, 0.9)',
          strokeWidth: selected ? 8 : 7,
          strokeLinecap: 'round',
          vectorEffect: 'non-scaling-stroke',
        }}
      />
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={edgeStyle}
      />
    </>
  );
}

export const DottedEdge = memo(DottedEdgeComponent);

// Export edge types object for React Flow
export const customEdgeTypes = {
  manager: ManagerEdge,
  sponsor: SponsorEdge,
  dotted: DottedEdge,
};
