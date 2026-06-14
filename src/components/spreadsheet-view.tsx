'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Cross2Icon, MagnifyingGlassIcon, CaretSortIcon, ChevronDownIcon, PlusIcon, CheckIcon, ClipboardIcon, ClipboardCopyIcon } from "@radix-ui/react-icons";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useGraphStore } from "@/store/graph-store";
import { buildSettingsPatch, type PersonSettingsField } from "@/store/graph-store";
import type { PersonNode } from "@/lib/schema/types";

const SETTINGS_FIELDS: Array<{ key: PersonSettingsField; label: string }> = [
  { key: "brand", label: "Brand (primary + all)" },
  { key: "channel", label: "Channel (primary + all)" },
  { key: "department", label: "Department" },
  { key: "tier", label: "Tier" },
  { key: "location", label: "Location" },
];

// Lightroom-style "paste settings" — choose which fields, then apply to the selection
function PasteSettingsMenu({ sourceName, count, onApply }: { sourceName: string; count: number; onApply: (fields: PersonSettingsField[]) => void }) {
  const [on, setOn] = useState<Record<PersonSettingsField, boolean>>({ brand: true, channel: true, department: true, tier: true, location: true });
  const chosen = SETTINGS_FIELDS.filter((f) => on[f.key]).map((f) => f.key);
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-700">
          <ClipboardIcon className="h-3.5 w-3.5" /> Paste settings <ChevronDownIcon className="h-3.5 w-3.5" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content side="top" sideOffset={6} className="z-[70] w-60 rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-white/10 dark:bg-slate-800">
          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">From {sourceName} · which settings?</p>
          {SETTINGS_FIELDS.map((f) => (
            <DropdownMenu.CheckboxItem
              key={f.key}
              checked={on[f.key]}
              onCheckedChange={(v) => setOn((p) => ({ ...p, [f.key]: !!v }))}
              onSelect={(e) => e.preventDefault()}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-700 outline-none hover:bg-slate-50 focus:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5"
            >
              <span className={`flex h-3.5 w-3.5 items-center justify-center rounded border ${on[f.key] ? "border-violet-500 bg-violet-500 text-white" : "border-slate-300"}`}>
                {on[f.key] && <CheckIcon className="h-3 w-3" />}
              </span>
              {f.label}
            </DropdownMenu.CheckboxItem>
          ))}
          <DropdownMenu.Separator className="my-1 h-px bg-slate-100 dark:bg-white/10" />
          <DropdownMenu.Item
            disabled={chosen.length === 0}
            onSelect={() => onApply(chosen)}
            className="cursor-pointer rounded-lg bg-violet-600 px-2 py-1.5 text-center text-xs font-semibold text-white outline-none hover:bg-violet-700 data-[disabled]:opacity-40"
          >
            Apply to {count} {count === 1 ? "person" : "people"}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

type SpreadsheetViewProps = { open: boolean; onClose: () => void };

const TIERS: Array<{ value: string; label: string }> = [
  { value: "c-suite", label: "C-Suite" },
  { value: "vp", label: "VP" },
  { value: "director", label: "Director" },
  { value: "manager", label: "Manager" },
  { value: "ic", label: "IC" },
];
const TIER_RANK: Record<string, number> = { "c-suite": 0, vp: 1, director: 2, manager: 3, ic: 4 };
type SortKey = "name" | "title" | "department" | "tier" | "brand" | "channel" | "location" | "manager";

/* ----------------------------- lightweight popover ----------------------------- */
// Portal-positioned so it never clips inside the scroll container, and cheap when
// closed (just a button) — important across hundreds of rows.
function Pop({
  trigger,
  children,
  width = 240,
  invalid,
}: {
  trigger: React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  width?: number;
  invalid?: boolean;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const open = rect !== null;
  const close = () => setRect(null);
  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={() => (open ? close() : setRect(ref.current!.getBoundingClientRect()))}
        className={`flex w-full items-center justify-between gap-1 rounded border px-1.5 py-1 text-left text-xs transition ${
          invalid
            ? "border-amber-300 bg-amber-50/60 dark:bg-amber-500/10"
            : "border-transparent hover:border-slate-200 dark:hover:border-white/10"
        } ${open ? "border-sky-400 ring-2 ring-sky-200/50" : ""}`}
      >
        <span className="min-w-0 flex-1 truncate">{trigger}</span>
        <ChevronDownIcon className="h-3 w-3 shrink-0 text-slate-300" />
      </button>
      {open &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[60]" onClick={close} />
            <div
              style={{
                position: "fixed",
                left: Math.min(rect!.left, window.innerWidth - width - 8),
                top: Math.min(rect!.bottom + 4, window.innerHeight - 280),
                width,
              }}
              className="z-[61] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-800"
            >
              {children(close)}
            </div>
          </>,
          document.body,
        )}
    </>
  );
}

function FilterBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input
      autoFocus
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border-b border-slate-100 bg-transparent px-3 py-2 text-xs outline-none dark:border-white/10"
    />
  );
}

const chipCls =
  "inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-white/10 dark:text-slate-200";

function ChipMultiSelect({ values, options, onChange, allowAdd }: { values: string[]; options: string[]; onChange: (v: string[]) => void; allowAdd?: boolean }) {
  const [q, setQ] = useState("");
  const filtered = options.filter((o) => o.toLowerCase().includes(q.trim().toLowerCase()));
  const canAdd = allowAdd && q.trim() && !options.some((o) => o.toLowerCase() === q.trim().toLowerCase());
  return (
    <Pop
      width={240}
      trigger={
        values.length ? (
          <span className="flex flex-wrap gap-1">{values.map((v) => <span key={v} className={chipCls}>{v}</span>)}</span>
        ) : (
          <span className="text-slate-300">— select —</span>
        )
      }
    >
      {() => (
        <div>
          <FilterBox value={q} onChange={setQ} placeholder="Filter / add…" />
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.map((opt) => {
              const on = values.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onChange(on ? values.filter((x) => x !== opt) : [...values, opt])}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-slate-50 dark:hover:bg-white/5"
                >
                  <span className={`flex h-3.5 w-3.5 items-center justify-center rounded border ${on ? "border-sky-500 bg-sky-500 text-white" : "border-slate-300"}`}>
                    {on && <CheckIcon className="h-3 w-3" />}
                  </span>
                  <span className="truncate text-slate-700 dark:text-slate-200">{opt}</span>
                </button>
              );
            })}
            {canAdd && (
              <button type="button" onClick={() => { onChange([...values, q.trim()]); setQ(""); }} className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-xs font-medium text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-500/10">
                <PlusIcon className="h-3.5 w-3.5" /> Add “{q.trim()}”
              </button>
            )}
          </div>
        </div>
      )}
    </Pop>
  );
}

function SingleSelect({ value, options, onChange, allowAdd, placeholder, invalid }: { value: string; options: string[]; onChange: (v: string) => void; allowAdd?: boolean; placeholder?: string; invalid?: boolean }) {
  const [q, setQ] = useState("");
  const filtered = options.filter((o) => o.toLowerCase().includes(q.trim().toLowerCase()));
  const canAdd = allowAdd && q.trim() && !options.some((o) => o.toLowerCase() === q.trim().toLowerCase());
  return (
    <Pop
      width={230}
      invalid={invalid}
      trigger={value ? <span className="text-slate-700 dark:text-slate-200">{value}</span> : <span className="text-slate-300">{placeholder ?? "— select —"}</span>}
    >
      {(close) => (
        <div>
          <FilterBox value={q} onChange={setQ} placeholder="Filter / add…" />
          <div className="max-h-56 overflow-y-auto py-1">
            {value && (
              <button type="button" onClick={() => { onChange(""); close(); }} className="w-full px-3 py-1.5 text-left text-xs text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5">— clear —</button>
            )}
            {filtered.map((o) => (
              <button key={o} type="button" onClick={() => { onChange(o); close(); }} className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-slate-50 dark:hover:bg-white/5 ${o === value ? "font-semibold text-sky-600" : "text-slate-700 dark:text-slate-200"}`}>
                <span className="truncate">{o}</span>
                {o === value && <CheckIcon className="h-3.5 w-3.5" />}
              </button>
            ))}
            {canAdd && (
              <button type="button" onClick={() => { onChange(q.trim()); close(); }} className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-xs font-medium text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-500/10">
                <PlusIcon className="h-3.5 w-3.5" /> Add “{q.trim()}”
              </button>
            )}
          </div>
        </div>
      )}
    </Pop>
  );
}

const textCls = "w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-xs text-slate-700 outline-none transition hover:border-slate-200 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-200/50 dark:text-slate-200 dark:hover:border-white/10 dark:focus:bg-slate-800";

/* --------------------------------- row --------------------------------- */
type RowProps = {
  person: PersonNode;
  managerName: string;
  selected: boolean;
  opts: { brands: string[]; channels: string[]; depts: string[]; people: string[] };
  onToggleSelect: (id: string) => void;
  onName: (p: PersonNode, v: string) => void;
  onAttr: (p: PersonNode, patch: Partial<PersonNode["attributes"]>) => void;
  onManager: (p: PersonNode, name: string) => void;
};

const Row = memo(function Row({ person, managerName, selected, opts, onToggleSelect, onName, onAttr, onManager }: RowProps) {
  const a = person.attributes;
  const cell = "border-b border-slate-100 px-1 align-top dark:border-white/5";
  return (
    <tr className={selected ? "bg-sky-50/60 dark:bg-sky-500/10" : "hover:bg-sky-50/30 dark:hover:bg-sky-500/5"}>
      <td className={`${cell} sticky left-0 z-10 ${selected ? "bg-sky-50 dark:bg-slate-800" : "bg-white dark:bg-slate-900"}`}>
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={selected} onChange={() => onToggleSelect(person.id)} className="h-3.5 w-3.5 shrink-0 rounded border-slate-300 text-sky-600" />
          <input className={`${textCls} font-semibold`} defaultValue={person.name} onBlur={(e) => onName(person, e.target.value)} key={`n-${person.id}-${person.name}`} />
        </div>
      </td>
      <td className={cell}><input className={textCls} defaultValue={a.title} onBlur={(e) => onAttr(person, { title: e.target.value })} key={`t-${person.id}-${a.title}`} /></td>
      <td className={cell}>
        <SingleSelect value={a.primaryDepartment ?? ""} options={opts.depts} allowAdd placeholder="— add —" invalid={!a.primaryDepartment}
          onChange={(v) => onAttr(person, { primaryDepartment: v || undefined, departments: v ? [v] : [] })} />
      </td>
      <td className={cell}>
        <select className={textCls} value={a.tier ?? "ic"} onChange={(e) => onAttr(person, { tier: e.target.value as PersonNode["attributes"]["tier"] })}>
          {TIERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </td>
      <td className={cell}>
        <SingleSelect value={managerName} options={opts.people} placeholder="—" onChange={(v) => onManager(person, v)} />
      </td>
      <td className={cell}>
        <SingleSelect value={a.primaryBrand ?? ""} options={opts.brands} allowAdd placeholder="—"
          onChange={(v) => onAttr(person, { primaryBrand: v || undefined, brands: v && !a.brands.includes(v) ? [...a.brands, v] : a.brands })} />
      </td>
      <td className={cell}><ChipMultiSelect values={a.brands} options={opts.brands} allowAdd onChange={(v) => onAttr(person, { brands: v })} /></td>
      <td className={cell}>
        <SingleSelect value={a.primaryChannel ?? ""} options={opts.channels} allowAdd placeholder="—"
          onChange={(v) => onAttr(person, { primaryChannel: v || undefined, channels: v && !a.channels.includes(v) ? [...a.channels, v] : a.channels })} />
      </td>
      <td className={cell}><ChipMultiSelect values={a.channels} options={opts.channels} allowAdd onChange={(v) => onAttr(person, { channels: v })} /></td>
      <td className={cell}><input className={textCls} defaultValue={a.location ?? ""} onBlur={(e) => onAttr(person, { location: e.target.value.trim() || undefined })} key={`l-${person.id}-${a.location}`} /></td>
    </tr>
  );
});

/* ------------------------------ bulk menu ------------------------------ */
function BulkMenu({ label, options, onPick, accent }: { label: string; options: string[]; onPick: (v: string) => void; accent?: boolean }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${accent ? "bg-sky-600 text-white hover:bg-sky-700" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"}`}>
          {label} <ChevronDownIcon className="h-3.5 w-3.5" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content side="top" sideOffset={6} className="z-[70] max-h-72 w-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-2xl dark:border-white/10 dark:bg-slate-800">
          {options.map((o) => (
            <DropdownMenu.Item key={o} onSelect={() => onPick(o)} className="cursor-pointer rounded-lg px-3 py-1.5 text-xs text-slate-700 outline-none hover:bg-sky-50 focus:bg-sky-50 dark:text-slate-200 dark:hover:bg-sky-500/10 dark:focus:bg-sky-500/10">
              {o}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/* ------------------------------ main view ------------------------------ */
export function SpreadsheetView({ open, onClose }: SpreadsheetViewProps) {
  const nodes = useGraphStore((s) => s.document.nodes);
  const edges = useGraphStore((s) => s.document.edges);
  const updatePerson = useGraphStore((s) => s.updatePerson);
  const applyToPeople = useGraphStore((s) => s.applyToPeople);
  const settingsClipboard = useGraphStore((s) => s.settingsClipboard);
  const copyPersonSettings = useGraphStore((s) => s.copyPersonSettings);
  const clearPersonSettings = useGraphStore((s) => s.clearPersonSettings);
  const addRelationship = useGraphStore((s) => s.addRelationship);
  const removeRelationship = useGraphStore((s) => s.removeRelationship);

  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectAllRef = useRef<HTMLInputElement>(null);

  const people = useMemo(() => nodes.filter((n): n is PersonNode => n.kind === "person"), [nodes]);
  const managerOf = useMemo(() => {
    const m: Record<string, { edgeId: string; managerId: string }> = {};
    edges.forEach((e) => { if (e.metadata.type === "manager" && !(e.target in m)) m[e.target] = { edgeId: e.id, managerId: e.source }; });
    return m;
  }, [edges]);
  const nameById = useMemo(() => new Map(people.map((p) => [p.id, p.name])), [people]);
  const idByName = useMemo(() => { const m = new Map<string, string>(); people.forEach((p) => { if (!m.has(p.name)) m.set(p.name, p.id); }); return m; }, [people]);

  const opts = useMemo(() => {
    const brands = new Set<string>(), channels = new Set<string>(), depts = new Set<string>();
    people.forEach((p) => {
      p.attributes.brands.forEach((b) => brands.add(b));
      if (p.attributes.primaryBrand) brands.add(p.attributes.primaryBrand);
      p.attributes.channels.forEach((c) => channels.add(c));
      if (p.attributes.primaryChannel) channels.add(p.attributes.primaryChannel);
      if (p.attributes.primaryDepartment) depts.add(p.attributes.primaryDepartment);
      p.attributes.departments.forEach((d) => depts.add(d));
    });
    return { brands: [...brands].sort(), channels: [...channels].sort(), depts: [...depts].sort(), people: [...people].map((p) => p.name).sort() };
  }, [people]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = people;
    if (q) list = list.filter((p) => `${p.name} ${p.attributes.title} ${p.attributes.primaryDepartment ?? ""} ${p.attributes.primaryBrand ?? ""} ${p.attributes.primaryChannel ?? ""}`.toLowerCase().includes(q));
    const key = (p: PersonNode): string | number => {
      switch (sortKey) {
        case "title": return p.attributes.title ?? "";
        case "department": return p.attributes.primaryDepartment ?? "";
        case "tier": return TIER_RANK[p.attributes.tier ?? "ic"] ?? 9;
        case "brand": return p.attributes.primaryBrand ?? "";
        case "channel": return p.attributes.primaryChannel ?? "";
        case "location": return p.attributes.location ?? "";
        case "manager": return nameById.get(managerOf[p.id]?.managerId ?? "") ?? "";
        default: return p.name;
      }
    };
    return [...list].sort((x, y) => {
      const kx = key(x), ky = key(y);
      return typeof kx === "number" && typeof ky === "number" ? (kx - ky) * sortDir : String(kx).localeCompare(String(ky)) * sortDir;
    });
  }, [people, query, sortKey, sortDir, managerOf, nameById]);

  const selectedInView = rows.filter((p) => selected.has(p.id)).length;
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = selectedInView > 0 && selectedInView < rows.length;
  }, [selectedInView, rows.length]);

  const onName = useCallback((p: PersonNode, v: string) => { const name = v.trim(); if (name && name !== p.name) updatePerson(p.id, { name }); }, [updatePerson]);
  const onAttr = useCallback((p: PersonNode, patch: Partial<PersonNode["attributes"]>) => { updatePerson(p.id, { attributes: { ...p.attributes, ...patch } }); }, [updatePerson]);
  const onManager = useCallback((p: PersonNode, name: string) => {
    const newMgrId = name.trim() ? idByName.get(name.trim()) : undefined;
    const cur = managerOf[p.id];
    if ((cur?.managerId ?? "") === (newMgrId ?? "")) return;
    if (newMgrId === p.id) return;
    if (cur) removeRelationship(cur.edgeId);
    if (newMgrId) addRelationship(newMgrId, p.id, "manager");
  }, [idByName, managerOf, addRelationship, removeRelationship]);

  const toggleSelect = useCallback((id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }), []);
  const toggleAll = () => setSelected((s) => (selectedInView === rows.length ? new Set() : new Set(rows.map((p) => p.id))));

  const ids = [...selected];
  const bulkAddChannel = (c: string) => applyToPeople(ids, (a) => ({ channels: a.channels.includes(c) ? a.channels : [...a.channels, c] }));
  const bulkAddBrand = (b: string) => applyToPeople(ids, (a) => ({ brands: a.brands.includes(b) ? a.brands : [...a.brands, b] }));
  const bulkPrimaryChannel = (c: string) => applyToPeople(ids, (a) => ({ primaryChannel: c, channels: a.channels.includes(c) ? a.channels : [...a.channels, c] }));
  const bulkDept = (d: string) => applyToPeople(ids, () => ({ primaryDepartment: d, departments: [d] }));
  const bulkTier = (label: string) => { const t = TIERS.find((x) => x.label === label)?.value as PersonNode["attributes"]["tier"]; applyToPeople(ids, () => ({ tier: t })); };

  if (!open) return null;

  const SortTh = ({ label, k, w, muted }: { label: string; k?: SortKey; w: string; muted?: boolean }) => (
    <th className={`sticky top-0 z-20 ${w} border-b border-slate-200 bg-slate-50 px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide dark:border-white/10 dark:bg-slate-800 ${muted ? "text-slate-400" : "cursor-pointer text-slate-500 dark:text-slate-300"}`}
      onClick={k ? () => (sortKey === k ? setSortDir((d) => -d) : setSortKey(k)) : undefined}>
      <span className="inline-flex items-center gap-1">{label}{k && <CaretSortIcon className={`h-3 w-3 ${sortKey === k ? "text-sky-500" : "text-slate-300"}`} />}</span>
    </th>
  );
  const noDeptCount = people.filter((p) => !p.attributes.primaryDepartment).length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-slate-950">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-3 dark:border-white/10">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">People · Spreadsheet</h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-300">{rows.length} of {people.length}</span>
          {noDeptCount > 0 && <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">{noDeptCount} missing dept</span>}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, title, dept…" className="w-64 rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-sm text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-200/50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200" />
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"><Cross2Icon className="h-5 w-5" /></button>
        </div>
      </div>

      <div className="flex-1 overflow-auto [transform:translateZ(0)]">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-30 min-w-[13rem] border-b border-slate-200 bg-slate-50 px-2 py-2 text-left dark:border-white/10 dark:bg-slate-800">
                <div className="flex items-center gap-2">
                  <input ref={selectAllRef} type="checkbox" checked={rows.length > 0 && selectedInView === rows.length} onChange={toggleAll} className="h-3.5 w-3.5 rounded border-slate-300 text-sky-600" />
                  <span className="cursor-pointer text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-300" onClick={() => (sortKey === "name" ? setSortDir((d) => -d) : setSortKey("name"))}>Name</span>
                </div>
              </th>
              <SortTh label="Title" k="title" w="min-w-[12rem]" />
              <SortTh label="Department" k="department" w="min-w-[11rem]" />
              <SortTh label="Tier" k="tier" w="min-w-[6rem]" />
              <SortTh label="Reports to" k="manager" w="min-w-[11rem]" />
              <SortTh label="Primary Brand" k="brand" w="min-w-[8rem]" />
              <SortTh label="Brands" w="min-w-[11rem]" muted />
              <SortTh label="Primary Channel" k="channel" w="min-w-[9rem]" />
              <SortTh label="Channels" w="min-w-[13rem]" muted />
              <SortTh label="Location" k="location" w="min-w-[9rem]" />
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <Row key={p.id} person={p} selected={selected.has(p.id)} opts={opts}
                managerName={nameById.get(managerOf[p.id]?.managerId ?? "") ?? ""}
                onToggleSelect={toggleSelect} onName={onName} onAttr={onAttr} onManager={onManager} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 bg-white px-5 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.04)] dark:border-white/10 dark:bg-slate-900">
          <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-700 dark:bg-sky-500/20 dark:text-sky-200">{selected.size} selected</span>

          {/* Copy / paste settings (Lightroom-style) */}
          {selected.size === 1 && (
            <button onClick={() => copyPersonSettings([...selected][0])} className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-50 dark:border-violet-400/30 dark:bg-slate-800 dark:text-violet-200">
              <ClipboardCopyIcon className="h-3.5 w-3.5" /> Copy settings
            </button>
          )}
          {settingsClipboard && (
            <>
              <PasteSettingsMenu sourceName={settingsClipboard.sourceName} count={selected.size} onApply={(fields) => applyToPeople([...selected], () => buildSettingsPatch(settingsClipboard, fields))} />
              <button onClick={clearPersonSettings} title="Clear copied settings" className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"><Cross2Icon className="h-3.5 w-3.5" /></button>
            </>
          )}

          <span className="text-[11px] text-slate-400">Bulk:</span>
          <BulkMenu label="Add channel" options={opts.channels} onPick={bulkAddChannel} accent />
          <BulkMenu label="Add brand" options={opts.brands} onPick={bulkAddBrand} />
          <BulkMenu label="Set primary channel" options={opts.channels} onPick={bulkPrimaryChannel} />
          <BulkMenu label="Set department" options={opts.depts} onPick={bulkDept} />
          <BulkMenu label="Set tier" options={TIERS.map((t) => t.label)} onPick={bulkTier} />
          <button onClick={() => setSelected(new Set())} className="ml-auto rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800">Clear</button>
        </div>
      )}
    </div>
  );
}
