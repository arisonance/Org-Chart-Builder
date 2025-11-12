'use client';

import { memo, useMemo, useState, type ReactNode } from "react";
import { Handle, Position } from "@xyflow/react";
import * as ContextMenu from "@radix-ui/react-context-menu";
import { ChevronRightIcon, CopyIcon, LockClosedIcon, LockOpen1Icon } from "@radix-ui/react-icons";
import { InlineCardEditor } from "@/components/inline-card-editor";
import type { LensId } from "@/lib/schema/lenses";
import type { PersonNode } from "@/lib/schema/types";

type NodeActions = {
  addDirectReport: (managerId: string) => void;
  addManager: (nodeId: string) => void;
  addSponsor: (nodeId: string) => void;
  addDotted: (nodeId: string) => void;
  convertToGroup: (nodeId: string) => void;
  duplicate: (nodeId: string) => void;
  copy: (nodeId: string) => void;
  delete: (nodeId: string) => void;
  lockToggle: (nodeId: string) => void;
  colorTag: (nodeId: string, token: string) => void;
  openEditor: (nodeId: string) => void;
};

export type HierarchyNodeData = {
  node: PersonNode;
  lens: LensId;
  accentColor: string;
  emphasisLabel?: string;
  isSelected: boolean;
  highlightTokens: string[];
  actions: NodeActions;
  onSelect: (id: string, additive?: boolean) => void;
};

const tierBadges: Record<string, { label: string; className: string }> = {
  "c-suite": { label: "C-Suite", className: "bg-amber-100 text-amber-800" },
  vp: { label: "VP", className: "bg-indigo-100 text-indigo-700" },
  director: { label: "Director", className: "bg-teal-100 text-teal-700" },
  manager: { label: "Manager", className: "bg-sky-100 text-sky-700" },
  ic: { label: "Individual Contributor", className: "bg-slate-100 text-slate-600" },
};

const badgeClass =
  "inline-flex items-center rounded-full border border-slate-200 bg-white/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:border-white/10 dark:bg-white/10 dark:text-slate-300";

const handleClass =
  "h-3 w-3 rounded-full border border-white shadow-sm transition hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-sky-400";

function Component({ data }: { data: HierarchyNodeData }) {
  const { node, accentColor, emphasisLabel, isSelected, highlightTokens, actions, onSelect } = data;
  
  const [showInlineEditor, setShowInlineEditor] = useState(false);
  const [editorPosition, setEditorPosition] = useState({ x: 0, y: 0 });

  const initials = useMemo(
    () =>
      node.name
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase(),
    [node.name],
  );

  const tierBadge = node.attributes.tier ? tierBadges[node.attributes.tier] : undefined;

  const handleSelect = (event: React.MouseEvent | React.KeyboardEvent, additive = false) => {
    event.stopPropagation();
    onSelect(node.id, additive || event.metaKey || event.ctrlKey || event.shiftKey);
  };

  const handleDoubleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    
    // Get the position of the card on screen
    const rect = event.currentTarget.getBoundingClientRect();
    setEditorPosition({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
    setShowInlineEditor(true);
  };

  const primaryContextBadge =
    emphsizedLabelOrFirst([
      emphasisLabel,
      node.attributes.primaryBrand,
      node.attributes.primaryDepartment,
      node.attributes.primaryChannel,
    ]) ?? undefined;

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <div className="group relative flex flex-col items-center">
          <Handle
            type="target"
            position={Position.Top}
            id={`${node.id}-manager-target`}
            data-handle-type="manager"
            className={`${handleClass} !bg-slate-400 dark:!bg-slate-600 transition-transform group-hover:scale-125`}
          />
          <button
            type="button"
            onClick={(event) => handleSelect(event, event.shiftKey)}
            onDoubleClick={handleDoubleClick}
            className={[
              "relative flex w-[16rem] flex-col items-center gap-3 rounded-2xl border bg-white/95 px-5 py-5 text-center shadow-lg ring-1 ring-slate-200 transition focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 dark:border-white/10 dark:bg-slate-950/85 dark:ring-white/10",
              isSelected
                ? "border-sky-500 ring-2 ring-sky-300/80 shadow-xl"
                : "hover:-translate-y-1 hover:shadow-xl",
            ].join(" ")}
          >
            <span
              className="pointer-events-none absolute inset-x-6 top-0 h-1.5 rounded-full"
              style={{ background: accentColor }}
            />
            <div className="relative mt-1 flex h-14 w-14 items-center justify-center rounded-full bg-slate-900/90 text-sm font-semibold uppercase tracking-tight text-white shadow-md dark:bg-slate-200/50 dark:text-white">
              {initials}
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{node.name}</p>
              <p className="text-xs leading-snug text-slate-500 dark:text-slate-300">
                {node.attributes.title}
              </p>
              {node.attributes.jobDescription && (
                <p className="mt-1 text-[10px] leading-relaxed text-slate-400 dark:text-slate-400 line-clamp-2">
                  {node.attributes.jobDescription}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1">
              {tierBadge ? (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tierBadge.className}`}>
                  {tierBadge.label}
                </span>
              ) : null}
              {primaryContextBadge ? (
                <span className={`${badgeClass} border-transparent bg-slate-900/10 text-[10px]`}>
                  {primaryContextBadge}
                </span>
              ) : null}
              {highlightTokens.map((token) => (
                <span key={token} className={`${badgeClass} border-transparent bg-sky-100 text-sky-700`}>
                  {token}
                </span>
              ))}
            </div>
          </button>
          <div className="pointer-events-none absolute left-[-18px] top-1/2 flex flex-col items-center gap-1">
            <Handle
              type="source"
              position={Position.Left}
              id={`${node.id}-dotted-source`}
              data-handle-type="dotted"
              className={`${handleClass} !bg-indigo-400 dark:!bg-indigo-500 transition-transform group-hover:scale-125`}
            />
            <span className="text-[9px] font-medium uppercase tracking-wide text-indigo-500 dark:text-indigo-300">
              Dotted
            </span>
          </div>
          <div className="pointer-events-none absolute right-[-18px] top-1/2 flex flex-col items-center gap-1">
            <Handle
              type="source"
              position={Position.Right}
              id={`${node.id}-sponsor-source`}
              data-handle-type="sponsor"
              className={`${handleClass} !bg-amber-400 dark:!bg-amber-500 transition-transform group-hover:scale-125`}
            />
            <span className="text-[9px] font-medium uppercase tracking-wide text-amber-500 dark:text-amber-300">
              Sponsor
            </span>
          </div>
          
          <Handle
            type="source"
            position={Position.Bottom}
            id={`${node.id}-manager-source`}
            data-handle-type="manager"
            className={`${handleClass} !bg-sky-500 hover:!bg-sky-600 dark:!bg-sky-400 transition-transform group-hover:scale-125`}
          />
          
          {/* Inline Editor Popover */}
          <InlineCardEditor
            node={node}
            isOpen={showInlineEditor}
            onClose={() => setShowInlineEditor(false)}
            position={editorPosition}
          />
        </div>
      </ContextMenu.Trigger>
      <ContextMenu.Content className="z-50 min-w-[220px] rounded-xl border border-slate-200 bg-white/95 p-1 text-sm shadow-xl backdrop-blur dark:border-white/10 dark:bg-slate-900/90">
        <MenuLabel text={node.name} />
        <MenuItem onSelect={() => actions.openEditor(node.id)}>Edit person…</MenuItem>
        <MenuSeparator />
        <MenuItem onSelect={() => actions.addDirectReport(node.id)}>Add direct report</MenuItem>
        <MenuItem onSelect={() => actions.addManager(node.id)}>Add manager</MenuItem>
        <MenuItem onSelect={() => actions.addSponsor(node.id)}>Add executive sponsor</MenuItem>
        <MenuItem onSelect={() => actions.addDotted(node.id)}>Add dotted-line</MenuItem>
        <MenuSeparator />
        <ContextMenu.Sub>
          <ContextMenu.SubTrigger className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-slate-600 hover:bg-slate-100 focus:outline-none dark:text-slate-300 dark:hover:bg-white/10">
            Color tag
            <ChevronRightIcon className="h-4 w-4" />
          </ContextMenu.SubTrigger>
          <ContextMenu.SubContent className="min-w-[200px] rounded-xl border border-slate-200 bg-white/95 p-1 shadow-xl backdrop-blur dark:border-white/10 dark:bg-slate-900/90">
            {["Brand", "Channel", "Department"].map((token) => (
              <MenuItem key={token} onSelect={() => actions.colorTag(node.id, token)}>
                {token}
              </MenuItem>
            ))}
          </ContextMenu.SubContent>
        </ContextMenu.Sub>
        <MenuItem onSelect={() => actions.convertToGroup(node.id)}>Convert to group node</MenuItem>
        <MenuSeparator />
        <MenuItem onSelect={() => actions.copy(node.id)} icon={<CopyIcon className="h-3.5 w-3.5" />}>
          Copy
        </MenuItem>
        <MenuItem onSelect={() => actions.duplicate(node.id)}>Duplicate</MenuItem>
        <MenuItem
          onSelect={() => actions.lockToggle(node.id)}
          icon={
            node.locked ? (
              <LockClosedIcon className="h-3.5 w-3.5" />
            ) : (
              <LockOpen1Icon className="h-3.5 w-3.5" />
            )
          }
        >
          {node.locked ? "Unlock position" : "Lock position"}
        </MenuItem>
        <MenuSeparator />
        <MenuItem destructive onSelect={() => actions.delete(node.id)}>
          Remove person
        </MenuItem>
      </ContextMenu.Content>
    </ContextMenu.Root>
  );
}

const MenuItem = ({
  children,
  onSelect,
  icon,
  destructive,
}: {
  children: ReactNode;
  onSelect: () => void;
  icon?: React.ReactNode;
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
    {icon ? <span className="text-slate-400">{icon}</span> : null}
    <span>{children}</span>
  </ContextMenu.Item>
);

const MenuSeparator = () => <ContextMenu.Separator className="my-1 h-px w-full bg-slate-200 dark:bg-white/10" />;

const MenuLabel = ({ text }: { text: string }) => (
  <ContextMenu.Label className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
    {text}
  </ContextMenu.Label>
);

const emphsizedLabelOrFirst = (values: Array<string | undefined | null>) => {
  return values.find((value) => value && value.trim().length > 0);
};

export const HierarchyNode = memo(Component);
