'use client';

import { memo, useMemo } from 'react';
import { BaseEdge, EdgeLabelRenderer, EdgeProps, getSmoothStepPath } from '@xyflow/react';
import { RELATIONSHIP_COLORS } from '@/lib/theme/palette';
import type { GraphEdge } from '@/lib/schema/types';
import { buildCuratedPeerReportRoute, buildManagerRoute } from '@/lib/graph/edge-routing';
import { getRelationshipDefinition } from '@/lib/schema/relationships';

type EnhancedEdgeData = GraphEdge & {
  relationshipLabel?: string;
  showLabel?: boolean;
  routeLane?: number;
  routeBusY?: number;
  sourceRect?: CardRect;
  targetRect?: CardRect;
  visualTreatment?: "curated-peer-report";
  truthIssue?: {
    level: "warning" | "danger";
    message: string;
    blockerNames?: string[];
  };
  showTruthIssue?: boolean;
};

type CardRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function ManagerEdgeComponent({
  id,
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
  const edgeData = data as EnhancedEdgeData | undefined;
  const truthIssue = edgeData?.showTruthIssue ? edgeData.truthIssue : undefined;
  const truthColor = truthIssue?.level === "danger" ? "#ef4444" : "#f59e0b";
  const isCuratedPeerReport = edgeData?.visualTreatment === "curated-peer-report";
  const shouldUseManagerRoute =
    edgeData?.sourceRect && edgeData?.targetRect
      ? edgeData.targetRect.y > edgeData.sourceRect.y + edgeData.sourceRect.height
      : targetY > sourceY;
  const [edgePath, labelX, labelY] = useMemo(
    () => {
      if (isCuratedPeerReport) {
        const route = buildCuratedPeerReportRoute({
          id,
          sourceId: edgeData?.source,
          sourceX,
          sourceY,
          targetX,
          targetY,
          routeLane: edgeData?.routeLane,
          sourceRect: edgeData?.sourceRect,
          targetRect: edgeData?.targetRect,
        });
        return [route.path, route.labelX, route.labelY] as const;
      }
      if (shouldUseManagerRoute) {
        const route = buildManagerRoute({
          id,
          sourceId: edgeData?.source,
          sourceX,
          sourceY,
          targetX,
          targetY,
          routeLane: edgeData?.routeLane,
          routeBusY: edgeData?.routeBusY,
          sourceRect: edgeData?.sourceRect,
          targetRect: edgeData?.targetRect,
        });
        return [route.path, route.labelX, route.labelY] as const;
      }
      return getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
      });
    },
    [edgeData?.routeBusY, edgeData?.routeLane, edgeData?.source, edgeData?.sourceRect, edgeData?.targetRect, id, isCuratedPeerReport, shouldUseManagerRoute, sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition]
  );

  const edgeStyle = useMemo(
    () => ({
      stroke: truthIssue ? truthColor : RELATIONSHIP_COLORS.manager,
      strokeWidth: selected || truthIssue ? 3 : 2.5,
      // Keep the line a constant width on screen so it stays visible when zoomed out
      vectorEffect: 'non-scaling-stroke' as const,
      ...(style || {}),
    }),
    [selected, style, truthColor, truthIssue]
  );

  const showLabel = selected || edgeData?.showLabel;

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{
          stroke: 'rgba(255, 255, 255, 0.92)',
          strokeWidth: isCuratedPeerReport ? (selected || truthIssue ? 4 : 0) : selected || truthIssue ? 9 : 7,
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
      {truthIssue && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-none absolute max-w-[240px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-300 bg-amber-50/95 px-2.5 py-1 text-[10px] font-semibold leading-tight text-amber-950 shadow-sm ring-1 ring-white/80 dark:border-amber-300/40 dark:bg-amber-500/15 dark:text-amber-100 dark:ring-slate-900"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY - 24}px)`,
            }}
          >
            {truthIssue.message}
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
  data,
}: EdgeProps<EnhancedEdgeData>) {
  const edgeData = data as EnhancedEdgeData | undefined;
  const relationshipType = edgeData?.metadata.type ?? "support";
  const color = RELATIONSHIP_COLORS[relationshipType] ?? RELATIONSHIP_COLORS.support;
  const definition = getRelationshipDefinition(relationshipType);
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
      stroke: color,
      strokeWidth: selected ? 3 : 2.5,
      vectorEffect: 'non-scaling-stroke' as const,
      ...(style || {}),
    }),
    [color, selected, style]
  );

  const markerId = `diamond-${id}`;
  const showLabel = selected || edgeData?.showLabel;

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
            stroke={color}
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
      {showLabel && edgeData?.relationshipLabel && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-none absolute max-w-[220px] -translate-x-1/2 -translate-y-1/2 rounded-full border bg-white/95 px-2.5 py-1 text-[10px] font-semibold leading-tight shadow-sm ring-1 ring-white/80 dark:bg-slate-950/95 dark:ring-slate-900"
            style={{
              color,
              borderColor: `${color}55`,
              transform: `translate(-50%, -50%) translate(${(sourceX + targetX) / 2}px, ${(sourceY + targetY) / 2}px)`,
            }}
          >
            {definition.shortLabel}: {edgeData.relationshipLabel}
          </div>
        </EdgeLabelRenderer>
      )}
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
  data,
}: EdgeProps<EnhancedEdgeData>) {
  const edgeData = data as EnhancedEdgeData | undefined;
  const relationshipType = edgeData?.metadata.type ?? "dotted";
  const color = RELATIONSHIP_COLORS[relationshipType] ?? RELATIONSHIP_COLORS.dotted;
  const definition = getRelationshipDefinition(relationshipType);
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
      stroke: color,
      strokeWidth: selected ? 3 : 2.5,
      strokeDasharray: '6 6',
      vectorEffect: 'non-scaling-stroke' as const,
      ...(style || {}),
    }),
    [color, selected, style]
  );
  const showLabel = selected || edgeData?.showLabel;

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
      {showLabel && edgeData?.relationshipLabel && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-none absolute max-w-[220px] -translate-x-1/2 -translate-y-1/2 rounded-full border bg-white/95 px-2.5 py-1 text-[10px] font-semibold leading-tight shadow-sm ring-1 ring-white/80 dark:bg-slate-950/95 dark:ring-slate-900"
            style={{
              color,
              borderColor: `${color}55`,
              transform: `translate(-50%, -50%) translate(${(sourceX + targetX) / 2}px, ${(sourceY + targetY) / 2}px)`,
            }}
          >
            {definition.shortLabel}: {edgeData.relationshipLabel}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const DottedEdge = memo(DottedEdgeComponent);

// Export edge types object for React Flow
export const customEdgeTypes = {
  manager: ManagerEdge,
  support: SponsorEdge,
  sponsor: SponsorEdge,
  dotted: DottedEdge,
};
