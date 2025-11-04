'use client';

import "@xyflow/react/dist/style.css";

import {
  Background,
  BackgroundVariant,
  Connection,
  ConnectionMode,
  Controls,
  Edge,
  MarkerType,
  MiniMap,
  Node,
  ReactFlow,
  type NodeChange,
  type ReactFlowInstance,
} from "@xyflow/react";
import * as ContextMenu from "@radix-ui/react-context-menu";
import * as Popover from "@radix-ui/react-popover";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { PlusIcon, MixerHorizontalIcon } from "@radix-ui/react-icons";
import { HierarchyNode, type HierarchyNodeData } from "@/components/hierarchy-node";
import { OnboardingOverlay } from "@/components/onboarding-overlay";
import { ConnectionHelper } from "@/components/connection-helper";
import { RelationshipLegend } from "@/components/relationship-legend";
import { customEdgeTypes } from "@/components/custom-edges";
import { useGraphStore } from "@/store/graph-store";
import { LENS_BY_ID, type LensId } from "@/lib/schema/lenses";
import type { GraphEdge, PersonNode } from "@/lib/schema/types";
import { buildChildMap, isDescendant } from "@/lib/graph/layout";
import { calculateSpanMetrics, calculateSpanMetricsForNodes } from "@/lib/analytics/span-of-control";
import { getSharedDimensions } from "@/lib/graph/pathfinding";
import {
  BRAND_COLORS,
  CHANNEL_COLORS,
  DEPARTMENT_COLORS,
  RELATIONSHIP_COLORS,
  dottedEdgeDash,
} from "@/lib/theme/palette";
import { ROLE_TEMPLATES, type RoleTemplate } from "@/lib/schema/templates";

type CanvasMenuState = {
  open: boolean;
  clientX: number;
  clientY: number;
};

const nodeTypes = {
  hierarchyNode: HierarchyNode,
} as const;

const edgeTypes = {
  ...customEdgeTypes,
  smoothstep: customEdgeTypes.manager, // default to manager style for generic edges
} as const;

const markerByType: Record<string, { width: number; height: number; color: string }> = {
  manager: { width: 16, height: 16, color: RELATIONSHIP_COLORS.manager },
  sponsor: { width: 18, height: 18, color: RELATIONSHIP_COLORS.sponsor },
  dotted: { width: 16, height: 16, color: RELATIONSHIP_COLORS.dotted },
};

const baseEdgeStyle = {
  strokeWidth: 2.5,
  strokeLinecap: "round" as const,
};

type HierarchyCanvasProps = {
  className?: string;
  style?: CSSProperties;
};

export function HierarchyCanvas({ className, style }: HierarchyCanvasProps = {}) {
  const lens = useGraphStore((state) => state.document.lens);
  const nodesData = useGraphStore((state) => state.document.nodes);
  const edgesData = useGraphStore((state) => state.document.edges);
  const lensState = useGraphStore(
    (state) => state.document.lens_state[state.document.lens]
  );
  const selection = useGraphStore((state) => state.selection);
  const connectionMode = useGraphStore((state) => state.connectionMode);
  const addPerson = useGraphStore((state) => state.addPerson);
  const updateNodePosition = useGraphStore((state) => state.updateNodePosition);
  const addRelationship = useGraphStore((state) => state.addRelationship);
  const updateRelationship = useGraphStore((state) => state.updateRelationship);
  const removeRelationship = useGraphStore((state) => state.removeRelationship);
  const removeNode = useGraphStore((state) => state.removeNode);
  const duplicateNodes = useGraphStore((state) => state.duplicateNodes);
  const toggleNodeLock = useGraphStore((state) => state.toggleNodeLock);
  const addTagToNode = useGraphStore((state) => state.addTagToNode);
  const copyNodesById = useGraphStore((state) => state.copyNodesById);
  const pasteClipboard = useGraphStore((state) => state.pasteClipboard);
  const setSelection = useGraphStore((state) => state.setSelection);
  const selectNode = useGraphStore((state) => state.selectNode);
  const selectEdge = useGraphStore((state) => state.selectEdge);
  const clearSelection = useGraphStore((state) => state.clearSelection);
  const toggleGrid = useGraphStore((state) => state.toggleGrid);
  const toggleSnap = useGraphStore((state) => state.toggleSnap);
  const autoLayout = useGraphStore((state) => state.autoLayout);
  const cleanupCanvas = useGraphStore((state) => state.cleanupCanvas);
  const updateViewport = useGraphStore((state) => state.updateViewport);
  const enterConnectionMode = useGraphStore((state) => state.enterConnectionMode);
  const exitConnectionMode = useGraphStore((state) => state.exitConnectionMode);
  const connectInConnectionMode = useGraphStore((state) => state.connectInConnectionMode);

  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [canvasMenu, setCanvasMenu] = useState<CanvasMenuState | null>(null);
  const [edgeMenu, setEdgeMenu] = useState<{ edge: Edge | null; position: { x: number; y: number } } | null>(
    null,
  );
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(1);
  const [visibleNodeIds, setVisibleNodeIds] = useState<Set<string>>(new Set());
  
  // Debounce position updates
  const positionUpdateQueue = useRef<Map<string, { x: number; y: number }>>(new Map());
  const positionUpdateTimeout = useRef<NodeJS.Timeout | null>(null);

  const lensLayout = lensState?.layout;
  const filters = lensState?.filters;

  const personNodes = useMemo(
    () => nodesData.filter((node): node is PersonNode => node.kind === "person"),
    [nodesData],
  );

  const childMap = useMemo(() => buildChildMap(edgesData), [edgesData]);

  // Calculate span metrics only for visible and selected nodes (lazy loading)
  const spanMetrics = useMemo(() => {
    // Always include selected nodes and nodes in connection mode
    const targetNodeIds = new Set<string>([
      ...selection.nodeIds,
      ...(connectionMode?.nodeId ? [connectionMode.nodeId] : []),
      ...Array.from(visibleNodeIds),
    ]);
    
    // If we have many nodes, only calculate for visible/selected ones
    const shouldOptimize = personNodes.length > 50;
    if (shouldOptimize && targetNodeIds.size > 0) {
      const metrics = calculateSpanMetricsForNodes(
        Array.from(targetNodeIds),
        edgesData
      );
      return new Map(metrics.map((m) => [m.nodeId, m]));
    }
    
    // For smaller graphs or when no visible nodes yet, calculate for all
    const metrics = calculateSpanMetrics(personNodes, edgesData);
    return new Map(metrics.map((m) => [m.nodeId, m]));
  }, [personNodes, edgesData, selection.nodeIds, connectionMode?.nodeId, visibleNodeIds]);

  // Show onboarding for empty canvas
  useEffect(() => {
    if (personNodes.length === 0) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }
  }, [personNodes.length]);

  useEffect(() => {
    if (!personNodes.length) return;
    if (!lensLayout) {
      autoLayout(lens);
      return;
    }
    const missing = personNodes.some((node) => !lensLayout.positions[node.id]);
    if (missing) {
      autoLayout(lens);
    }
  }, [personNodes, lensLayout, autoLayout, lens]);

  const highlightTokens = useMemo(() => {
    if (!filters?.activeTokens?.length) return new Map<string, string[]>();
    const tokensByNode = new Map<string, string[]>();
    personNodes.forEach((node) => {
      const matched = filters.activeTokens.filter((token) =>
        isTokenMatchForLens(node, token, lens),
      );
      if (matched.length) {
        tokensByNode.set(node.id, matched);
      }
    });
    return tokensByNode;
  }, [filters?.activeTokens, personNodes, lens]);

  const nodes = useMemo<Node<HierarchyNodeData>[]>(() => {
    const positions = lensLayout?.positions ?? {};
    const focusIds = filters?.focusIds ?? [];
    const hiddenIds = filters?.hiddenIds ?? [];
    
    // Filter nodes based on focusIds or hiddenIds
    let filteredNodes = personNodes;
    if (focusIds.length > 0) {
      filteredNodes = filteredNodes.filter((node) => focusIds.includes(node.id));
    }
    if (hiddenIds.length > 0) {
      filteredNodes = filteredNodes.filter((node) => !hiddenIds.includes(node.id));
    }
    
    return filteredNodes.map((node) => {
      const position = positions[node.id] ?? { x: 0, y: 0 };
      const accent = getAccentColor(node, lens);
      const isInConnectionMode = !!(connectionMode?.active && connectionMode.nodeId === node.id);
      const isConnectionTarget = !!(connectionMode?.active && connectionMode.nodeId !== node.id);
      
      const data: HierarchyNodeData = {
        node,
        lens,
        accentColor: accent,
        emphasisLabel: getPrimaryLabel(node, lens),
        isSelected: selection.nodeIds.includes(node.id) || isInConnectionMode,
        highlightTokens: highlightTokens.get(node.id) ?? [],
        spanMetrics: spanMetrics.get(node.id),
        actions: {
          addDirectReport: (managerId) => {
            const newId = addPerson({
              name: "New team member",
              title: "Role",
              brands: [],
              channels: [],
              departments: [],
              position: offsetPosition(position, { x: 120, y: 160 }),
            });
            addRelationship(managerId, newId, "manager");
            setSelection({ nodeIds: [newId], edgeIds: [] });
          },
          addManager: (targetId) => {
            const newId = addPerson({
              name: "New manager",
              title: "Role",
              brands: [],
              channels: [],
              departments: [],
              position: offsetPosition(position, { x: -160, y: -160 }),
            });
            addRelationship(newId, targetId, "manager");
            setSelection({ nodeIds: [newId], edgeIds: [] });
          },
          addSponsor: (targetId) => {
            const newId = addPerson({
              name: "New sponsor",
              title: "Executive Sponsor",
              brands: [],
              channels: [],
              departments: [],
              position: offsetPosition(position, { x: 180, y: -120 }),
            });
            addRelationship(newId, targetId, "sponsor");
            setSelection({ nodeIds: [newId], edgeIds: [] });
          },
          addDotted: (targetId) => {
            const newId = addPerson({
              name: "New dotted-line",
              title: "Advisor",
              brands: [],
              channels: [],
              departments: [],
              position: offsetPosition(position, { x: -180, y: 140 }),
            });
            addRelationship(newId, targetId, "dotted");
            setSelection({ nodeIds: [newId], edgeIds: [] });
          },
          convertToGroup: () => {
            // placeholder: converting to group requires dedicated flow
            addTagToNode(node.id, "Group candidate");
          },
          duplicate: (nodeId) => duplicateNodes([nodeId]),
          copy: (nodeId) => copyNodesById([nodeId]),
          delete: removeNode,
          lockToggle: toggleNodeLock,
          colorTag: addTagToNode,
          openEditor: (nodeId) => selectNode(nodeId),
        },
        onSelect: (id, additive) => {
          // If in connection mode, connect to clicked node
          if (connectionMode?.active) {
            connectInConnectionMode(id);
          } else {
            selectNode(id, additive);
          }
        },
      };
      
      // Add CSS classes for connection mode styling
      const nodeClassName = isConnectionTarget
        ? "connection-target animate-pulse"
        : isInConnectionMode
        ? "connection-source animate-pulse"
        : "";
      
      return {
        id: node.id,
        type: "hierarchyNode",
        position,
        data,
        draggable: !node.locked && !connectionMode?.active,
        selected: selection.nodeIds.includes(node.id) || isInConnectionMode,
        className: nodeClassName,
      };
    });
  }, [
    personNodes,
    selection.nodeIds,
    lensLayout?.positions,
    lens,
    highlightTokens,
    connectionMode,
    addPerson,
    addRelationship,
    duplicateNodes,
    copyNodesById,
    removeNode,
    toggleNodeLock,
    addTagToNode,
    selectNode,
    setSelection,
    connectInConnectionMode,
    spanMetrics,
    filters?.focusIds,
    filters?.hiddenIds,
  ]);

  const edges = useMemo<Edge[]>(() => {
    const activeTokens = filters?.activeTokens ?? [];
    return edgesData.map((edge) => {
      const marker = markerByType[edge.metadata.type] ?? markerByType.manager;
      const color = RELATIONSHIP_COLORS[edge.metadata.type] ?? "#94a3b8";
      const isGhost =
        activeTokens.length > 0 &&
        !doesEdgeMatchTokens(edge, personNodes, activeTokens, lens);
      
      // Calculate shared dimensions for matrix relationship clarity
      const sourceNode = personNodes.find((n) => n.id === edge.source);
      const targetNode = personNodes.find((n) => n.id === edge.target);
      const sharedDimensions = sourceNode && targetNode 
        ? getSharedDimensions(sourceNode, targetNode)
        : { brands: [], channels: [], departments: [] };
      
      // Determine if relationship is within same dimension or cross-dimension
      const isCrossDimension = lens !== 'hierarchy' && (
        (lens === 'brand' && (!sharedDimensions.brands.length || 
          sourceNode?.attributes.primaryBrand !== targetNode?.attributes.primaryBrand)) ||
        (lens === 'channel' && (!sharedDimensions.channels.length || 
          sourceNode?.attributes.primaryChannel !== targetNode?.attributes.primaryChannel)) ||
        (lens === 'department' && (!sharedDimensions.departments.length || 
          sourceNode?.attributes.primaryDepartment !== targetNode?.attributes.primaryDepartment))
      );
      
      // Use custom edge type based on relationship
      const edgeType = edge.metadata.type === 'sponsor' ? 'sponsor' : 
                       edge.metadata.type === 'dotted' ? 'dotted' : 
                       'manager';
      
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edgeType,
        data: {
          ...edge,
          sharedDimensions,
          isCrossDimension,
        },
        animated: edge.metadata.type === "dotted" && currentZoom > 0.5,
        markerEnd: edge.metadata.type === 'sponsor' ? undefined : { // sponsor uses custom diamond marker
          type: MarkerType.ArrowClosed,
          width: marker.width,
          height: marker.height,
          color,
        },
        style: {
          ...baseEdgeStyle,
          stroke: color,
          opacity: isGhost || edge.metadata.ghost ? 0.3 : isCrossDimension ? 0.7 : 0.9,
          strokeDasharray: isCrossDimension ? '4 4' : undefined,
        },
        selectable: true,
        selected: selection.edgeIds.includes(edge.id),
      };
    });
  }, [edgesData, filters?.activeTokens, personNodes, lens, selection.edgeIds, currentZoom]);

  // Debounced position update handler
  const flushPositionUpdates = useCallback(() => {
    if (positionUpdateQueue.current.size === 0) return;
    
    const updates = new Map(positionUpdateQueue.current);
    positionUpdateQueue.current.clear();
    
    // Batch update all positions
    updates.forEach((position, nodeId) => {
      updateNodePosition(nodeId, position);
    });
  }, [updateNodePosition]);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      changes.forEach((change) => {
        if (change.type === "position" && change.position) {
          // Queue position update for debouncing
          positionUpdateQueue.current.set(change.id, change.position);
          
          // Clear existing timeout
          if (positionUpdateTimeout.current) {
            clearTimeout(positionUpdateTimeout.current);
          }
          
          // Set new timeout to flush updates after 150ms of inactivity
          positionUpdateTimeout.current = setTimeout(() => {
            flushPositionUpdates();
          }, 150);
        }
      });
    },
    [flushPositionUpdates],
  );

  const handleEdgesChange = useCallback(() => {
    // Relationships managed via dedicated handlers.
  }, []);

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      const type = deduceRelationshipType(connection);
      if (!type) return;
      if (type === "manager") {
        if (connection.source === connection.target) return;
        if (isDescendant(childMap, connection.target, connection.source)) {
          window.alert("Cannot create a reporting loop. Choose a different manager.");
          return;
        }
      }
      addRelationship(connection.source, connection.target, type);
      setSelection({ edgeIds: [], nodeIds: [connection.target] });
    },
    [addRelationship, childMap, setSelection],
  );

  const handleEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      deleted.forEach((edge) => removeRelationship(edge.id));
    },
    [removeRelationship],
  );

  const handleNodesDelete = useCallback(
    (deleted: Node[]) => {
      deleted.forEach((node) => removeNode(node.id));
    },
    [removeNode],
  );

  const handlePaneClick = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      selectNode(node.id);
    },
    [selectNode],
  );

  const handleEdgeContextMenu = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.preventDefault();
    selectEdge(edge.id);
    setEdgeMenu({ edge, position: { x: event.clientX, y: event.clientY } });
  }, [selectEdge]);

  const handleEdgeMenuAction = useCallback(
    (action: "manager" | "sponsor" | "dotted" | "delete") => {
      if (!edgeMenu?.edge) return;
      if (action === "delete") {
        removeRelationship(edgeMenu.edge.id);
      } else {
        updateRelationship(edgeMenu.edge.id, { type: action });
      }
      setEdgeMenu(null);
    },
    [edgeMenu, removeRelationship, updateRelationship],
  );

  const handlePaneContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setCanvasMenu({
      open: true,
      clientX: event.clientX,
      clientY: event.clientY,
    });
  }, []);

  const flowPositionFromClient = useCallback(
    (point: { x: number; y: number }) => {
      if (!rfInstance) return { x: 0, y: 0 };
      return rfInstance.screenToFlowPosition(point);
    },
    [rfInstance],
  );

  // Track viewport changes and update visible nodes
  useEffect(() => {
    if (!rfInstance) return;
    
    const updateVisibleNodes = () => {
      const viewport = rfInstance.getViewport();
      setCurrentZoom(viewport.zoom);
      updateViewport(lens, viewport);
      
      // Calculate visible node bounds
      const bounds = rfInstance.getViewport();
      const visibleSet = new Set<string>();
      
      // Get all nodes and check if they're in viewport
      const allNodes = rfInstance.getNodes();
      allNodes.forEach((node) => {
        const nodePosition = node.position;
        const nodeWidth = 256; // Approximate node width (16rem = 256px)
        const nodeHeight = 200; // Approximate node height
        
        // Transform node position to screen coordinates
        const screenX = (nodePosition.x - bounds.x) * bounds.zoom;
        const screenY = (nodePosition.y - bounds.y) * bounds.zoom;
        
        // Check if node is visible in viewport (with padding)
        const padding = 100;
        if (
          screenX + nodeWidth + padding >= 0 &&
          screenX - padding <= window.innerWidth &&
          screenY + nodeHeight + padding >= 0 &&
          screenY - padding <= window.innerHeight
        ) {
          visibleSet.add(node.id);
        }
      });
      
      setVisibleNodeIds(visibleSet);
    };
    
    updateVisibleNodes();
    
    // Note: React Flow doesn't expose direct event listeners, but we track via onMove
    return () => {
      if (positionUpdateTimeout.current) {
        clearTimeout(positionUpdateTimeout.current);
      }
    };
  }, [rfInstance, lens, updateViewport]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      // Exit connection mode on Escape
      if (event.key === "Escape" && connectionMode?.active) {
        event.preventDefault();
        exitConnectionMode();
        return;
      }

      // Cmd/Ctrl + D to duplicate
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "d") {
        event.preventDefault();
        if (selection.nodeIds.length) {
          duplicateNodes(selection.nodeIds);
        }
        return;
      }

      // N to add new person at center
      if (event.key.toLowerCase() === "n" && !event.shiftKey && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        const flowPoint = rfInstance
          ? rfInstance.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
          : { x: 400, y: 300 };
        const newId = addPerson({
          name: "New leader",
          title: "Role",
          brands: [],
          channels: [],
          departments: [],
          position: flowPoint,
        });
        enterConnectionMode(newId, "manager");
        return;
      }

      // R to add direct report to selected node
      if (event.key.toLowerCase() === "r" && selection.nodeIds.length === 1) {
        event.preventDefault();
        const selectedNode = personNodes.find((n) => n.id === selection.nodeIds[0]);
        if (selectedNode) {
          const positions = lensLayout?.positions ?? {};
          const position = positions[selectedNode.id] ?? { x: 0, y: 0 };
          const newId = addPerson({
            name: "New team member",
            title: "Role",
            brands: [],
            channels: [],
            departments: [],
            position: offsetPosition(position, { x: 120, y: 160 }),
          });
          addRelationship(selectedNode.id, newId, "manager");
          setSelection({ nodeIds: [newId], edgeIds: [] });
        }
        return;
      }

      // M to add manager to selected node
      if (event.key.toLowerCase() === "m" && selection.nodeIds.length === 1) {
        event.preventDefault();
        const selectedNode = personNodes.find((n) => n.id === selection.nodeIds[0]);
        if (selectedNode) {
          const positions = lensLayout?.positions ?? {};
          const position = positions[selectedNode.id] ?? { x: 0, y: 0 };
          const newId = addPerson({
            name: "New manager",
            title: "Role",
            brands: [],
            channels: [],
            departments: [],
            position: offsetPosition(position, { x: -160, y: -160 }),
          });
          addRelationship(newId, selectedNode.id, "manager");
          setSelection({ nodeIds: [newId], edgeIds: [] });
        }
        return;
      }
    },
    [
      selection.nodeIds,
      duplicateNodes,
      connectionMode,
      exitConnectionMode,
      rfInstance,
      addPerson,
      enterConnectionMode,
      personNodes,
      lensLayout,
      addRelationship,
      setSelection,
    ],
  );

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <div
          className={[
            "relative h-full min-h-[720px] w-full overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 shadow-md ring-1 ring-black/5 dark:border-white/10 dark:bg-slate-950/70 dark:ring-white/10",
            className ?? "",
          ].join(" ")}
          style={style}
          onContextMenu={handlePaneContextMenu}
          onKeyDown={handleKeyDown}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            nodeTypes={nodeTypes as any}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            edgeTypes={edgeTypes as any}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={handleConnect}
            onEdgesDelete={handleEdgesDelete}
            onNodesDelete={handleNodesDelete}
            onPaneClick={handlePaneClick}
            onNodeContextMenu={handleNodeContextMenu}
            onEdgeContextMenu={handleEdgeContextMenu}
            onMove={() => {
              if (rfInstance) {
                const viewport = rfInstance.getViewport();
                setCurrentZoom(viewport.zoom);
                
                // Update visible nodes on move
                const bounds = rfInstance.getViewport();
                const visibleSet = new Set<string>();
                const allNodes = rfInstance.getNodes();
                
                allNodes.forEach((node) => {
                  const nodePosition = node.position;
                  const nodeWidth = 256;
                  const nodeHeight = 200;
                  const screenX = (nodePosition.x - bounds.x) * bounds.zoom;
                  const screenY = (nodePosition.y - bounds.y) * bounds.zoom;
                  const padding = 100;
                  
                  if (
                    screenX + nodeWidth + padding >= 0 &&
                    screenX - padding <= window.innerWidth &&
                    screenY + nodeHeight + padding >= 0 &&
                    screenY - padding <= window.innerHeight
                  ) {
                    visibleSet.add(node.id);
                  }
                });
                
                setVisibleNodeIds(visibleSet);
              }
            }}
            nodesDraggable
            nodesConnectable
            elementsSelectable
            connectionMode={ConnectionMode.Loose}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            panOnScroll
            zoomOnPinch
            deleteKeyCode={["Backspace", "Delete"]}
            proOptions={{ hideAttribution: true }}
            minZoom={0.25}
            maxZoom={2}
            defaultEdgeOptions={{ type: "manager" }}
            onInit={setRfInstance}
            className="bg-transparent"
            onlyRenderVisibleElements={personNodes.length > 50}
          >
            <Background
              variant={lensLayout?.showGrid ? BackgroundVariant.Dots : BackgroundVariant.Lines}
              gap={lensLayout?.showGrid ? 22 : 80}
              size={lensLayout?.showGrid ? 1 : 0.5}
              color={lensLayout?.showGrid ? "#cbd5f5" : "#e2e8f0"}
            />
            <MiniMap
              className="!bottom-6 !right-6 rounded-2xl border border-slate-200 bg-white/90 text-slate-600 shadow-sm dark:border-white/10 dark:bg-slate-900/80"
              nodeStrokeColor={(n) => (n.data?.accentColor as string) ?? "#64748b"}
              nodeColor={(n) => (n.data?.accentColor as string) ?? "#cbd5f5"}
              maskColor="rgba(15, 23, 42, 0.08)"
              pannable
              zoomable
            />
            <Controls className="!left-6 !bottom-6 rounded-full bg-white/90 text-slate-500 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900/70 dark:text-slate-200 dark:ring-white/10" />
            {/* Cleanup Canvas Button */}
            {personNodes.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  cleanupCanvas(lens);
                  // Fit view after cleanup
                  setTimeout(() => {
                    rfInstance?.fitView({ padding: 0.2, duration: 500 });
                  }, 100);
                }}
                className="absolute bottom-6 right-[100px] z-10 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-white hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-slate-900 dark:focus-visible:ring-slate-500"
                title="Clean up canvas layout (like macOS desktop cleanup)"
              >
                <MixerHorizontalIcon className="h-4 w-4" />
                Clean Up
              </button>
            )}
          </ReactFlow>
          <EdgeContextMenu
            edgeMenu={edgeMenu}
            onClose={() => setEdgeMenu(null)}
            onAction={handleEdgeMenuAction}
          />
          
          {/* Onboarding overlay for empty canvas */}
          <OnboardingOverlay show={showOnboarding} onDismiss={() => setShowOnboarding(false)} />
          
          {/* Connection mode overlay */}
          {connectionMode?.active && (
            <div className="pointer-events-none absolute inset-x-0 top-6 z-40 flex justify-center">
              <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-sky-300 bg-sky-50 px-6 py-3 shadow-lg dark:border-sky-700 dark:bg-sky-900/90">
                <span className="text-sm font-semibold text-sky-900 dark:text-sky-100">
                  Click a person to connect, or press ESC to cancel
                </span>
                <button
                  type="button"
                  onClick={exitConnectionMode}
                  className="rounded-full bg-sky-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-sky-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          
          {/* Connection helper panel */}
          {personNodes.length > 0 && !connectionMode?.active && <ConnectionHelper />}
          
          {/* Relationship legend */}
          {personNodes.length > 0 && <RelationshipLegend />}
          
          {/* Floating Action Button */}
          <FloatingActionButton
            onAddPerson={(point) => {
              const flowPoint = flowPositionFromClient(point);
              const newId = addPerson({
                name: "New leader",
                title: "Role",
                brands: [],
                channels: [],
                departments: [],
                position: flowPoint,
              });
              enterConnectionMode(newId, "manager");
            }}
            onAddFromTemplate={(template, point) => {
              const flowPoint = flowPositionFromClient(point);
              const newId = addPerson({
                name: template.defaultName,
                title: template.defaultTitle,
                brands: template.suggestedBrands ?? [],
                channels: template.suggestedChannels ?? [],
                departments: template.suggestedDepartments ?? [],
                tier: template.tier,
                position: flowPoint,
              });
              enterConnectionMode(newId, "manager");
            }}
          />
        </div>
      </ContextMenu.Trigger>
      <CanvasContextMenu
        open={canvasMenu}
        lens={lens}
        rfInstance={rfInstance}
        onAddPerson={(point) => {
          const flowPoint = flowPositionFromClient(point);
          const newId = addPerson({
            name: "New leader",
            title: "Role",
            brands: [],
            channels: [],
            departments: [],
            position: flowPoint,
          });
          enterConnectionMode(newId, "manager");
        }}
        onAddFromTemplate={(template, point) => {
          const flowPoint = flowPositionFromClient(point);
          const newId = addPerson({
            name: template.defaultName,
            title: template.defaultTitle,
            brands: template.suggestedBrands ?? [],
            channels: template.suggestedChannels ?? [],
            departments: template.suggestedDepartments ?? [],
            tier: template.tier,
            position: flowPoint,
          });
          enterConnectionMode(newId, "manager");
        }}
        onPaste={() => pasteClipboard()}
        onSelectAll={() =>
          setSelection({
            nodeIds: personNodes.map((node) => node.id),
            edgeIds: edgesData.map((edge) => edge.id),
          })
        }
        onDeselect={() => clearSelection()}
        onZoomFit={() => rfInstance?.fitView({ padding: 0.25 })}
        onToggleGrid={() => toggleGrid(lens)}
        onToggleSnap={() => toggleSnap(lens)}
      />
    </ContextMenu.Root>
  );
}

const CanvasContextMenu = ({
  open,
  lens,
  rfInstance,
  onAddPerson,
  onAddFromTemplate,
  onPaste,
  onSelectAll,
  onDeselect,
  onZoomFit,
  onToggleGrid,
  onToggleSnap,
}: {
  open: CanvasMenuState | null;
  lens: LensId;
  rfInstance: ReactFlowInstance | null;
  onAddPerson: (point: { x: number; y: number }) => void;
  onAddFromTemplate: (template: RoleTemplate, point: { x: number; y: number }) => void;
  onPaste: () => void;
  onSelectAll: () => void;
  onDeselect: () => void;
  onZoomFit: () => void;
  onToggleGrid: () => void;
  onToggleSnap: () => void;
}) => {
  return (
    <ContextMenu.Portal>
      <ContextMenu.Content className="z-50 min-w-[240px] rounded-xl border border-slate-200 bg-white/95 p-1 text-sm shadow-xl backdrop-blur dark:border-white/10 dark:bg-slate-900/90">
        <ContextMenu.Label className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {LENS_BY_ID[lens].label}
        </ContextMenu.Label>
        <MenuItem onSelect={() => open && onAddPerson({ x: open.clientX, y: open.clientY })}>
          Add person here
        </MenuItem>
        <ContextMenu.Sub>
          <ContextMenu.SubTrigger className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-slate-600 hover:bg-slate-100 focus:outline-none dark:text-slate-300 dark:hover:bg-white/10">
            <span>Add from template</span>
            <span className="text-xs">▶</span>
          </ContextMenu.SubTrigger>
          <ContextMenu.SubContent className="min-w-[220px] rounded-xl border border-slate-200 bg-white/95 p-1 shadow-xl backdrop-blur dark:border-white/10 dark:bg-slate-900/90">
            {ROLE_TEMPLATES.map((template) => (
              <MenuItem
                key={template.id}
                onSelect={() => open && onAddFromTemplate(template, { x: open.clientX, y: open.clientY })}
              >
                <span className="mr-2">{template.icon}</span>
                {template.label}
              </MenuItem>
            ))}
          </ContextMenu.SubContent>
        </ContextMenu.Sub>
        <MenuSeparator />
        <MenuItem onSelect={onPaste}>Paste person</MenuItem>
        <MenuItem onSelect={onSelectAll}>Select all</MenuItem>
        <MenuItem onSelect={onDeselect}>Deselect</MenuItem>
        <MenuItem onSelect={onZoomFit}>Zoom to fit</MenuItem>
        <MenuSeparator />
        <MenuItem onSelect={onToggleGrid}>Toggle grid</MenuItem>
        <MenuItem onSelect={onToggleSnap}>Toggle snap-to-grid</MenuItem>
        <MenuSeparator />
        <MenuItem onSelect={() => rfInstance?.fitView({ padding: 0.1 })}>Reset view</MenuItem>
      </ContextMenu.Content>
    </ContextMenu.Portal>
  );
};

const EdgeContextMenu = ({
  edgeMenu,
  onClose,
  onAction,
}: {
  edgeMenu: { edge: Edge | null; position: { x: number; y: number } } | null;
  onClose: () => void;
  onAction: (action: "manager" | "sponsor" | "dotted" | "delete") => void;
}) => {
  if (!edgeMenu?.edge) return null;
  
  // Render as portal directly without ContextMenu.Root
  return (
    <div
      className="fixed z-50 min-w-[200px] rounded-xl border border-slate-200 bg-white/95 p-1 text-sm shadow-xl backdrop-blur dark:border-white/10 dark:bg-slate-900/90"
      style={{
        position: "fixed",
        left: edgeMenu.position.x,
        top: edgeMenu.position.y,
      }}
    >
          <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Relationship
          </div>
          <button
            onClick={() => {
              onAction("manager");
              onClose();
            }}
            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100 focus:outline-none dark:text-slate-200 dark:hover:bg-white/10"
          >
            Convert to manager
          </button>
          <button
            onClick={() => {
              onAction("sponsor");
              onClose();
            }}
            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100 focus:outline-none dark:text-slate-200 dark:hover:bg-white/10"
          >
            Convert to sponsor
          </button>
          <button
            onClick={() => {
              onAction("dotted");
              onClose();
            }}
            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100 focus:outline-none dark:text-slate-200 dark:hover:bg-white/10"
          >
            Convert to dotted-line
          </button>
          <div className="my-1 h-px w-full bg-slate-200 dark:bg-white/10" />
          <button
            onClick={() => {
              onAction("delete");
              onClose();
            }}
            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-100 focus:outline-none dark:hover:bg-rose-500/20"
          >
            Delete relationship
          </button>
    </div>
  );
};

const MenuItem = ({
  children,
  onSelect,
  destructive,
}: {
  children: ReactNode;
  onSelect: () => void;
  destructive?: boolean;
}) => (
  <ContextMenu.Item
    onSelect={onSelect}
    className={[
      "flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:text-slate-200",
      destructive
        ? "text-rose-600 hover:bg-rose-100 focus-visible:ring-rose-200 dark:hover:bg-rose-500/20"
        : "hover:bg-slate-100 focus-visible:ring-slate-200 dark:hover:bg-white/10",
    ].join(" ")}
  >
    <span>{children}</span>
  </ContextMenu.Item>
);

const MenuSeparator = () => (
  <ContextMenu.Separator className="my-1 h-px w-full bg-slate-200 dark:bg-white/10" />
);

const FloatingActionButton = ({
  onAddPerson,
  onAddFromTemplate,
}: {
  onAddPerson: (point: { x: number; y: number }) => void;
  onAddFromTemplate: (template: RoleTemplate, point: { x: number; y: number }) => void;
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Popover.Root open={menuOpen} onOpenChange={setMenuOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="absolute bottom-6 right-24 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-2xl transition hover:scale-110 hover:shadow-3xl focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300"
          title="Add Person"
        >
          <PlusIcon className="h-7 w-7" />
        </button>
      </Popover.Trigger>
      
      <Popover.Portal>
        <Popover.Content
          className="z-50 w-72 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-2xl backdrop-blur dark:border-white/10 dark:bg-slate-900/95"
          sideOffset={12}
          side="top"
          align="end"
        >
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => {
                onAddPerson({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
                setMenuOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition hover:bg-slate-100 dark:hover:bg-white/10"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-sky-600 text-lg">
                ➕
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Add Person</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Create a new team member</p>
              </div>
            </button>
            
            <div className="my-2 h-px bg-slate-200 dark:bg-white/10" />
            
            <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Quick Templates
            </p>
            
            {ROLE_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => {
                  onAddFromTemplate(template, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left transition hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <div className="text-2xl">{template.icon}</div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {template.label}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {template.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
          
          <Popover.Arrow className="fill-white dark:fill-slate-900" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

const getAccentColor = (node: PersonNode, lens: LensId) => {
  if (lens === "brand") {
    const key = node.attributes.primaryBrand ?? node.attributes.brands[0];
    if (key && BRAND_COLORS[key]) return BRAND_COLORS[key];
  }
  if (lens === "channel") {
    const key = node.attributes.primaryChannel ?? node.attributes.channels[0];
    if (key && CHANNEL_COLORS[key]) return CHANNEL_COLORS[key];
  }
  if (lens === "department") {
    const key = node.attributes.primaryDepartment ?? node.attributes.departments[0];
    if (key && DEPARTMENT_COLORS[key]) return DEPARTMENT_COLORS[key];
  }
  return BRAND_COLORS[node.attributes.primaryBrand ?? "Sonance"] ?? "#0284c7";
};

const getPrimaryLabel = (node: PersonNode, lens: LensId) => {
  if (lens === "brand") {
    return node.attributes.primaryBrand ?? node.attributes.brands[0];
  }
  if (lens === "channel") {
    return node.attributes.primaryChannel ?? node.attributes.channels[0];
  }
  if (lens === "department") {
    return node.attributes.primaryDepartment ?? node.attributes.departments[0];
  }
  return undefined;
};

const doesEdgeMatchTokens = (
  edge: GraphEdge,
  nodes: PersonNode[],
  tokens: string[],
  lens: LensId,
) => {
  if (tokens.length === 0) return true;
  const source = nodes.find((node) => node.id === edge.source);
  const target = nodes.find((node) => node.id === edge.target);
  if (!source || !target) return false;
  return (
    tokens.some((token) => isTokenMatchForLens(source, token, lens)) ||
    tokens.some((token) => isTokenMatchForLens(target, token, lens))
  );
};

const isTokenMatchForLens = (node: PersonNode, token: string, lens: LensId) => {
  if (lens === "brand") {
    return node.attributes.brands.includes(token);
  }
  if (lens === "channel") {
    return node.attributes.channels.includes(token);
  }
  if (lens === "department") {
    return node.attributes.departments.includes(token);
  }
  return (
    node.attributes.brands.includes(token) ||
    node.attributes.channels.includes(token) ||
    node.attributes.departments.includes(token) ||
    node.attributes.tags.includes(token)
  );
};

const deduceRelationshipType = (connection: Connection): GraphEdge["metadata"]["type"] | null => {
  const handle = connection.sourceHandle ?? connection.targetHandle ?? "";
  if (handle.includes("sponsor")) return "sponsor";
  if (handle.includes("dotted")) return "dotted";
  return "manager";
};

const offsetPosition = (position: { x: number; y: number }, delta: { x: number; y: number }) => ({
  x: position.x + delta.x,
  y: position.y + delta.y,
});
