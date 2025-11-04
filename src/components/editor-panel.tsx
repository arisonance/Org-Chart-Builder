'use client';

import * as ScrollArea from "@radix-ui/react-scroll-area";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Component2Icon } from "@radix-ui/react-icons";
import { DEMO_LENS_LABELS } from "@/data/demo-graph";
import { useGraphStore } from "@/store/graph-store";
import { ConnectionSuggestions } from "@/components/connection-suggestions";
import { CrossDimensionalContext } from "@/components/cross-dimensional-context";
import { MatrixConflictPanel } from "@/components/matrix-conflict-panel";
import { MatrixAssignmentWizard } from "@/components/matrix-assignment-wizard";
import type { GraphEdge, GraphNode, PersonNode } from "@/lib/schema/types";

const sectionClass =
  "flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/90 px-5 py-5 shadow-sm ring-1 ring-black/5 dark:border-white/10 dark:bg-slate-950/70 dark:ring-white/10";

export function EditorPanel() {
  const selection = useGraphStore((state) => state.selection);
  const nodes = useGraphStore((state) => state.document.nodes);
  const edges = useGraphStore((state) => state.document.edges);
  const updatePerson = useGraphStore((state) => state.updatePerson);
  const removeRelationship = useGraphStore((state) => state.removeRelationship);
  const pushHistory = useGraphStore((state) => state.pushHistory);
  const enterExplorerMode = useGraphStore((state) => state.enterExplorerMode);

  const selectedNodes = useMemo<PersonNode[]>(() => {
    return nodes.filter(
      (node): node is PersonNode =>
        node.kind === "person" && selection.nodeIds.includes(node.id),
    );
  }, [nodes, selection.nodeIds]);

  const [activeTab, setActiveTab] = useState<"details" | "relationships">("details");
  const [showMatrixWizard, setShowMatrixWizard] = useState(false);
  const historySnapshotTakenRef = useRef(false);

  useEffect(() => {
    historySnapshotTakenRef.current = false;
  }, [selection.nodeIds]);

  const ensureHistorySnapshot = useCallback(() => {
    if (!historySnapshotTakenRef.current) {
      pushHistory();
      historySnapshotTakenRef.current = true;
    }
  }, [pushHistory]);

  const resetHistorySnapshotFlag = useCallback(() => {
    historySnapshotTakenRef.current = false;
  }, []);

  const node = selectedNodes[0];

  if (!node) {
    return (
      <aside className="w-full max-w-md">
        <div className={sectionClass}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Editing Workbench
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-300">
            Select a leader to edit their details, or right-click on the canvas to add someone new.
          </p>
          <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Tips
          </p>
          <ul className="list-disc space-y-1 pl-4 text-xs text-slate-500 dark:text-slate-400">
            <li>Double-click a card to edit inline.</li>
            <li>Drag handles to create manager, sponsor, or dotted-line relationships.</li>
            <li>Use ⌘/Ctrl + K to open the command palette.</li>
          </ul>
        </div>
      </aside>
    );
  }

  const managerEdges = edges.filter(
    (edge) => edge.metadata.type === "manager" && edge.target === node.id,
  );
  const directReports = edges.filter(
    (edge) => edge.metadata.type === "manager" && edge.source === node.id,
  );
  const sponsorEdges = edges.filter(
    (edge) => edge.metadata.type === "sponsor" && edge.target === node.id,
  );
  const dottedEdges = edges.filter(
    (edge) => edge.metadata.type === "dotted" && edge.target === node.id,
  );

  const updateAttributes = (updates: Partial<PersonNode["attributes"]>) => {
    ensureHistorySnapshot();
    updatePerson(
      node.id,
      {
        attributes: {
          ...node.attributes,
          ...updates,
        },
      },
      { recordHistory: false },
    );
  };

  const toggleArrayValue = (key: "brands" | "channels" | "departments" | "tags", value: string) => {
    const current = node.attributes[key];
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    updateAttributes({ [key]: next });
  };

  const handlePrimaryChange = (
    key: "primaryBrand" | "primaryChannel" | "primaryDepartment",
    value: string,
  ) => {
    updateAttributes({ [key]: value });
  };

  return (
    <aside className="w-full max-w-md space-y-4">
      {showMatrixWizard && <MatrixAssignmentWizard nodeId={node.id} onClose={() => setShowMatrixWizard(false)} />}
      <ConnectionSuggestions nodeId={node.id} />
      <CrossDimensionalContext node={node} />
      <MatrixConflictPanel />
      <div className={sectionClass}>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {node.name}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{node.attributes.title}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowMatrixWizard(true)}
              className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-900/50 dark:bg-indigo-900/20 dark:text-indigo-300 dark:hover:bg-indigo-900/40"
              title="Matrix Assignment Wizard"
            >
              Matrix Wizard
            </button>
            <button
              type="button"
              onClick={() => enterExplorerMode(node.id)}
              className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-900/50 dark:bg-indigo-900/20 dark:text-indigo-300 dark:hover:bg-indigo-900/40"
              title="Explore Network"
            >
              <Component2Icon className="inline h-4 w-4" /> Network
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <button
              type="button"
              onClick={() => setActiveTab("details")}
              className={`rounded-full px-3 py-1 ${
                activeTab === "details"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-500 dark:bg-white/10"
              }`}
            >
              Details
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("relationships")}
              className={`rounded-full px-3 py-1 ${
                activeTab === "relationships"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-500 dark:bg-white/10"
              }`}
            >
              Relationships
            </button>
          </div>
        </div>
        {activeTab === "details" ? (
          <ScrollArea.Root className="h-[520px] w-full">
            <ScrollArea.Viewport className="h-full w-full">
              <div className="flex flex-col gap-5 pr-4">
                <fieldset className="flex flex-col gap-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Name
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100"
                      value={node.name}
                      onFocus={ensureHistorySnapshot}
                      onBlur={resetHistorySnapshotFlag}
                      onChange={(event) =>
                        updatePerson(node.id, { name: event.target.value }, { recordHistory: false })
                      }
                    />
                  </label>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Title
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100"
                      value={node.attributes.title}
                      onFocus={ensureHistorySnapshot}
                      onBlur={resetHistorySnapshotFlag}
                      onChange={(event) =>
                        updateAttributes({ title: event.target.value })
                      }
                    />
                  </label>
                </fieldset>

                <TokenSelector
                  label="Brand alignment"
                  values={node.attributes.brands}
                  tokens={DEMO_LENS_LABELS.brand}
                  onToggle={(token) => toggleArrayValue("brands", token)}
                  onPrimaryChange={(token) => handlePrimaryChange("primaryBrand", token)}
                  primary={node.attributes.primaryBrand}
                />

                <TokenSelector
                  label="Channel coverage"
                  values={node.attributes.channels}
                  tokens={DEMO_LENS_LABELS.channel}
                  onToggle={(token) => toggleArrayValue("channels", token)}
                  onPrimaryChange={(token) => handlePrimaryChange("primaryChannel", token)}
                  primary={node.attributes.primaryChannel}
                />

                <TokenSelector
                  label="Department home"
                  values={node.attributes.departments}
                  tokens={DEMO_LENS_LABELS.department}
                  onToggle={(token) => toggleArrayValue("departments", token)}
                  onPrimaryChange={(token) => handlePrimaryChange("primaryDepartment", token)}
                  primary={node.attributes.primaryDepartment}
                />

                <fieldset className="flex flex-col gap-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Location
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100"
                      value={node.attributes.location ?? ""}
                      onChange={(event) => updateAttributes({ location: event.target.value })}
                    />
                  </label>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Cost center
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100"
                      value={node.attributes.costCenter ?? ""}
                      onChange={(event) => updateAttributes({ costCenter: event.target.value })}
                    />
                  </label>
                </fieldset>
              </div>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar orientation="vertical" className="w-1.5 bg-transparent">
              <ScrollArea.Thumb className="rounded-full bg-slate-300/50 dark:bg-slate-700" />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>
        ) : (
          <div className="flex flex-col gap-4 text-sm text-slate-600 dark:text-slate-300">
            <RelationshipGroup
              title="Managers"
              edges={managerEdges}
              nodes={nodes}
              onRemove={(edgeId) => removeRelationship(edgeId)}
            />
            <RelationshipGroup
              title="Direct reports"
              edges={directReports}
              nodes={nodes}
              variant="outbound"
            />
            <RelationshipGroup
              title="Executive sponsors"
              edges={sponsorEdges}
              nodes={nodes}
              onRemove={(edgeId) => removeRelationship(edgeId)}
              color="text-amber-600"
            />
            <RelationshipGroup
              title="Dotted lines"
              edges={dottedEdges}
              nodes={nodes}
              onRemove={(edgeId) => removeRelationship(edgeId)}
              color="text-indigo-600"
              labelAccessor={(edge) => edge.metadata.label}
            />
          </div>
        )}
      </div>
    </aside>
  );
}

const TokenSelector = ({
  label,
  values,
  tokens,
  onToggle,
  onPrimaryChange,
  primary,
}: {
  label: string;
  values: string[];
  tokens: string[];
  onToggle: (token: string) => void;
  onPrimaryChange: (token: string) => void;
  primary?: string;
}) => {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          {label}
        </p>
        <select
          value={primary ?? ""}
          onChange={(event) => onPrimaryChange(event.target.value)}
          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-300"
        >
          <option value="">Primary</option>
          {values.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-2">
        {tokens.map((token) => {
          const isActive = values.includes(token);
          return (
            <button
              key={token}
              type="button"
              onClick={() => onToggle(token)}
              className={[
                "rounded-full border px-3 py-1 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                isActive
                  ? "border-transparent bg-sky-500 text-white focus-visible:ring-sky-300"
                  : "border-slate-200 bg-white text-slate-500 hover:border-sky-300 hover:text-sky-600 focus-visible:ring-slate-200 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-300",
              ].join(" ")}
            >
              {token}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const RelationshipGroup = ({
  title,
  edges,
  nodes,
  variant = "inbound",
  onRemove,
  color,
  labelAccessor,
}: {
  title: string;
  edges: GraphEdge[];
  nodes: GraphNode[];
  variant?: "inbound" | "outbound";
  onRemove?: (edgeId: string) => void;
  color?: string;
  labelAccessor?: (edge: GraphEdge) => string | undefined;
}) => {
  if (edges.length === 0) {
    return (
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          {title}
        </p>
        <p className="mt-1 text-xs text-slate-400">None assigned.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {title}
      </p>
      <ul className="space-y-2">
        {edges.map((edge) => {
          const otherId = variant === "inbound" ? edge.source : edge.target;
          const otherNode = nodes.find((node) => node.id === otherId && node.kind === "person") as
            | PersonNode
            | undefined;
          if (!otherNode) return null;
          return (
            <li
              key={edge.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm dark:border-white/10 dark:bg-slate-900/70"
            >
              <div>
                <p className={`font-semibold ${color ?? "text-slate-700"} dark:text-slate-200`}>
                  {otherNode.name}
                </p>
                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                  {labelAccessor ? labelAccessor(edge) ?? otherNode.attributes.title : otherNode.attributes.title}
                </p>
              </div>
              {onRemove ? (
                <button
                  type="button"
                  onClick={() => onRemove(edge.id)}
                  className="rounded-full border border-transparent bg-slate-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-rose-500/20 dark:hover:text-rose-200"
                >
                  Remove
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
