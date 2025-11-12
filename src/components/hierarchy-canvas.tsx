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
import { MixerHorizontalIcon } from "@radix-ui/react-icons";
import { HierarchyNode, type HierarchyNodeData } from "@/components/hierarchy-node";
import { OnboardingOverlay } from "@/components/onboarding-overlay";
import { RelationshipLegend } from "@/components/relationship-legend";
import { customEdgeTypes } from "@/components/custom-edges";
import { QuickAddPersonDialog, type QuickAddPersonData } from "@/components/quick-add-person-dialog";
import { useGraphStore } from "@/store/graph-store";
import { LENS_BY_ID, type LensId } from "@/lib/schema/lenses";
import type { GraphEdge, PersonNode } from "@/lib/schema/types";
import { buildChildMap, isDescendant } from "@/lib/graph/layout";
import {
  BRAND_COLORS,
  CHANNEL_COLORS,
  DEPARTMENT_COLORS,
  RELATIONSHIP_COLORS,
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
  const setCurrentViewport = useGraphStore((state) => state.setCurrentViewport);
  const currentViewportState = useGraphStore((state) => state.currentViewport);

  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [canvasMenu, setCanvasMenu] = useState<CanvasMenuState | null>(null);
  const [edgeMenu, setEdgeMenu] = useState<{ edge: Edge | null; position: { x: number; y: number } } | null>(
    null,
  );
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(1);
  const isRestoringViewport = useRef(false);
  const [quickAddDialog, setQuickAddDialog] = useState<{
    open: boolean;
    mode: 'direct-report' | 'new-person';
    managerId?: string;
    managerName?: string;
    position?: { x: number; y: number };
  }>({ open: false, mode: 'new-person' });

  const lensLayout = lensState?.layout;
  const filters = lensState?.filters;

  const personNodes = useMemo(
    () => nodesData.filter((node): node is PersonNode => node.kind === "person"),
    [nodesData],
  );

  const childMap = useMemo(() => buildChildMap(edgesData), [edgesData]);

  // Show onboarding for empty canvas
  useEffect(() => {
    if (personNodes.length === 0) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }
  }, [personNodes.length]);

  // Auto-layout on first load with spacious preset
  useEffect(() => {
    if (!personNodes.length) return;
    if (!lensLayout) {
      cleanupCanvas(lens, 'spacious');
      return;
    }
    const missing = personNodes.some((node) => !lensLayout.positions[node.id]);
    if (missing) {
      cleanupCanvas(lens, 'spacious');
    }
  }, [personNodes, lensLayout, cleanupCanvas, lens]);

  // Fit view after layout is ready
  useEffect(() => {
    if (!rfInstance || !lensLayout || personNodes.length === 0) return;
    
    // Delay slightly to ensure all nodes are rendered
    const timer = setTimeout(() => {
      rfInstance.fitView({ padding: 0.2, duration: 300, maxZoom: 1.5 });
    }, 150);
    
    return () => clearTimeout(timer);
  }, [rfInstance, lensLayout, personNodes.length]);

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
      
      const data: HierarchyNodeData = {
        node,
        lens,
        accentColor: accent,
        emphasisLabel: getPrimaryLabel(node, lens),
        isSelected: selection.nodeIds.includes(node.id),
        highlightTokens: highlightTokens.get(node.id) ?? [],
        zoom: currentZoom, // Pass zoom for LOD rendering
        actions: {
          addDirectReport: (managerId) => {
            const manager = personNodes.find((n) => n.id === managerId);
            setQuickAddDialog({
              open: true,
              mode: 'direct-report',
              managerId,
              managerName: manager?.name,
              position: offsetPosition(position, { x: 120, y: 160 }),
            });
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
          selectNode(id, additive);
        },
      };
      
      return {
        id: node.id,
        type: "hierarchyNode",
        position,
        data,
        draggable: !node.locked,
        selected: selection.nodeIds.includes(node.id),
      };
    });
  }, [
    personNodes,
    selection.nodeIds,
    lensLayout?.positions,
    lens,
    highlightTokens,
    currentZoom,
    addPerson,
    addRelationship,
    duplicateNodes,
    copyNodesById,
    removeNode,
    toggleNodeLock,
    addTagToNode,
    selectNode,
    setSelection,
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
      
      // Use custom edge type based on relationship
      const edgeType = edge.metadata.type === 'sponsor' ? 'sponsor' : 
                       edge.metadata.type === 'dotted' ? 'dotted' : 
                       'manager';
      
      // Calculate opacity based on ghost state (keep edges visible at all zoom levels)
      const opacity = isGhost || edge.metadata.ghost ? 0.3 : 0.85;
      
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edgeType,
        data: {
          ...edge,
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
          opacity,
        },
        selectable: true,
        selected: selection.edgeIds.includes(edge.id),
      };
    });
  }, [edgesData, filters?.activeTokens, personNodes, lens, selection.edgeIds, currentZoom]);

  // Handle node drag stop - instant position updates without debouncing
  const handleNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      updateNodePosition(node.id, node.position);
    },
    [updateNodePosition],
  );

  const handleNodesChange = useCallback(
    (_changes: NodeChange[]) => {
      // Let React Flow handle visual updates natively for smooth dragging
      // Position persistence happens only on drag stop via handleNodeDragStop
    },
    [],
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

  // Track viewport changes (lightweight, no document updates)
  useEffect(() => {
    if (!rfInstance || isRestoringViewport.current) return;
    
    const viewport = rfInstance.getViewport();
    setCurrentZoom(viewport.zoom);
    // Use lightweight viewport update to avoid document re-renders
    setCurrentViewport(viewport);
  }, [rfInstance, setCurrentViewport]);
  
  // Persist viewport to document periodically (debounced)
  useEffect(() => {
    if (!rfInstance || !lensLayout?.viewport) return;
    
    const timer = setTimeout(() => {
      const viewport = rfInstance.getViewport();
      updateViewport(lens, viewport);
    }, 1000); // Debounce persistence to 1 second
    
    return () => clearTimeout(timer);
  }, [currentViewportState, rfInstance, lens, lensLayout?.viewport, updateViewport]);

  // Restore viewport when lens layout changes (smooth animation)
  useEffect(() => {
    if (!rfInstance || !lensLayout?.viewport) return;
    
    const currentViewport = rfInstance.getViewport();
    const targetViewport = lensLayout.viewport;
    
    // Only restore if viewport is significantly different (to avoid conflicts with user interactions)
    const threshold = 10;
    const isDifferent = 
      Math.abs(currentViewport.x - targetViewport.x) > threshold ||
      Math.abs(currentViewport.y - targetViewport.y) > threshold ||
      Math.abs(currentViewport.zoom - targetViewport.zoom) > 0.1;
    
    if (isDifferent) {
      isRestoringViewport.current = true;
      // Smooth viewport restore to avoid jank
      rfInstance.setViewport(
        { x: targetViewport.x, y: targetViewport.y, zoom: targetViewport.zoom },
        { duration: 200 }
      );
      // Reset flag after animation
      setTimeout(() => {
        isRestoringViewport.current = false;
      }, 250);
    }
  }, [rfInstance, lensLayout?.viewport]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
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
        setQuickAddDialog({
          open: true,
          mode: 'new-person',
          position: flowPoint,
        });
        return;
      }

      // R to add direct report to selected node
      if (event.key.toLowerCase() === "r" && selection.nodeIds.length === 1) {
        event.preventDefault();
        const selectedNode = personNodes.find((n) => n.id === selection.nodeIds[0]);
        if (selectedNode) {
          const positions = lensLayout?.positions ?? {};
          const position = positions[selectedNode.id] ?? { x: 0, y: 0 };
          setQuickAddDialog({
            open: true,
            mode: 'direct-report',
            managerId: selectedNode.id,
            managerName: selectedNode.name,
            position: offsetPosition(position, { x: 120, y: 160 }),
          });
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
      rfInstance,
      addPerson,
      personNodes,
      lensLayout,
      addRelationship,
      setSelection,
    ],
  );

  const handleQuickAddSave = (data: QuickAddPersonData) => {
    const newId = addPerson({
      name: data.name,
      title: data.title,
      brands: data.brands,
      primaryBrand: data.primaryBrand,
      channels: data.channels,
      primaryChannel: data.primaryChannel,
      departments: data.departments,
      primaryDepartment: data.primaryDepartment,
      tier: data.tier,
      location: data.location,
      position: quickAddDialog.position,
    });

    // If adding a direct report, create the relationship
    if (quickAddDialog.mode === 'direct-report' && quickAddDialog.managerId) {
      addRelationship(quickAddDialog.managerId, newId, 'manager');
    }

    setSelection({ nodeIds: [newId], edgeIds: [] });
    setQuickAddDialog({ open: false, mode: 'new-person' });
  };

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
            onNodeDragStop={handleNodeDragStop}
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
                setCurrentViewport(viewport); // Lightweight update
              }
            }}
            nodesDraggable
            nodesConnectable
            elementsSelectable
            selectNodesOnDrag={false}
            elevateEdgesOnSelect={false}
            connectionMode={ConnectionMode.Loose}
            fitView
            fitViewOptions={{ padding: 0.2, maxZoom: 1.5, minZoom: 0.5 }}
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            panOnScroll
            panOnDrag={[1, 2]}
            zoomOnPinch
            deleteKeyCode={["Backspace", "Delete"]}
            proOptions={{ hideAttribution: true }}
            minZoom={0.25}
            maxZoom={2}
            defaultEdgeOptions={{ type: "manager" }}
            onInit={setRfInstance}
            className="bg-transparent"
            onlyRenderVisibleElements={personNodes.length > 20}
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
              <CleanupButton
                onCleanup={(mode) => {
                  cleanupCanvas(lens, mode);
                  // Fit view after cleanup with smooth animation
                  setTimeout(() => {
                    rfInstance?.fitView({ padding: 0.2, duration: 400, maxZoom: 1.5 });
                  }, 100);
                }}
              />
            )}
          </ReactFlow>
          <EdgeContextMenu
            edgeMenu={edgeMenu}
            onClose={() => setEdgeMenu(null)}
            onAction={handleEdgeMenuAction}
          />
          
          {/* Onboarding overlay for empty canvas */}
          <OnboardingOverlay show={showOnboarding} onDismiss={() => setShowOnboarding(false)} />
          
          {/* Relationship legend - compact button in corner */}
          {personNodes.length > 0 && <RelationshipLegend />}
        </div>
      </ContextMenu.Trigger>
      
      {/* Quick Add Dialog */}
      <QuickAddPersonDialog
        isOpen={quickAddDialog.open}
        onClose={() => setQuickAddDialog({ open: false, mode: 'new-person' })}
        onSave={handleQuickAddSave}
        mode={quickAddDialog.mode}
        managerName={quickAddDialog.managerName}
      />
      <CanvasContextMenu
        open={canvasMenu}
        lens={lens}
        rfInstance={rfInstance}
        onAddPerson={(point) => {
          const flowPoint = flowPositionFromClient(point);
          setQuickAddDialog({
            open: true,
            mode: 'new-person',
            position: flowPoint,
          });
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
          setSelection({ nodeIds: [newId], edgeIds: [] });
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

const CleanupButton = ({
  onCleanup,
}: {
  onCleanup: (mode: "compact" | "spacious") => void;
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Popover.Root open={menuOpen} onOpenChange={setMenuOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="absolute bottom-6 right-[180px] z-30 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-white hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-slate-900 dark:focus-visible:ring-slate-500"
          title="Clean up canvas layout"
        >
          <MixerHorizontalIcon className="h-4 w-4" />
          Clean Up
        </button>
      </Popover.Trigger>
      
      <Popover.Portal>
        <Popover.Content
          className="z-50 w-64 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-2xl backdrop-blur dark:border-white/10 dark:bg-slate-900/95"
          sideOffset={12}
          side="top"
          align="end"
        >
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => {
                onCleanup("compact");
                setMenuOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition hover:bg-slate-100 dark:hover:bg-white/10"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-purple-600 text-lg">
                📦
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Compact Layout</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Fit as much as possible on screen</p>
              </div>
            </button>
            
            <button
              type="button"
              onClick={() => {
                onCleanup("spacious");
                setMenuOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition hover:bg-slate-100 dark:hover:bg-white/10"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-lg">
                📐
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Spacious Layout</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">No overlap, requires more space</p>
              </div>
            </button>
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
