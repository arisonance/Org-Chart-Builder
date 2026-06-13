'use client';

import { memo, useCallback, useMemo, useState } from "react";
import { Cross2Icon, MagnifyingGlassIcon, CaretSortIcon } from "@radix-ui/react-icons";
import { useGraphStore } from "@/store/graph-store";
import type { PersonNode } from "@/lib/schema/types";

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

const inputClass =
  "w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-xs text-slate-700 outline-none transition hover:border-slate-200 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-200/50 dark:text-slate-200 dark:hover:border-white/10 dark:focus:bg-slate-800";

type RowProps = {
  person: PersonNode;
  managerName: string;
  onName: (p: PersonNode, v: string) => void;
  onAttr: (p: PersonNode, patch: Partial<PersonNode["attributes"]>) => void;
  onManager: (p: PersonNode, name: string) => void;
};

// One row per person; memoized so editing a single cell only re-renders that row.
const Row = memo(function Row({ person, managerName, onName, onAttr, onManager }: RowProps) {
  const a = person.attributes;
  const commaList = (v: string) =>
    v.split(",").map((s) => s.trim()).filter(Boolean);
  const cell = "border-b border-slate-100 px-1 dark:border-white/5";
  const noDept = !a.primaryDepartment;
  return (
    <tr className="hover:bg-sky-50/40 dark:hover:bg-sky-500/5">
      <td className={`${cell} sticky left-0 z-10 bg-white dark:bg-slate-900`}>
        <input
          className={`${inputClass} font-semibold`}
          defaultValue={person.name}
          onBlur={(e) => onName(person, e.target.value)}
          key={`name-${person.id}-${person.name}`}
        />
      </td>
      <td className={cell}>
        <input className={inputClass} defaultValue={a.title} onBlur={(e) => onAttr(person, { title: e.target.value })} key={`title-${person.id}-${a.title}`} />
      </td>
      <td className={cell}>
        <input
          className={`${inputClass} ${noDept ? "border-amber-300 bg-amber-50/60 dark:bg-amber-500/10" : ""}`}
          list="ss-depts"
          placeholder={noDept ? "— add —" : ""}
          defaultValue={a.primaryDepartment ?? ""}
          onBlur={(e) => {
            const v = e.target.value.trim();
            onAttr(person, { primaryDepartment: v || undefined, departments: v ? [v] : [] });
          }}
          key={`dept-${person.id}-${a.primaryDepartment}`}
        />
      </td>
      <td className={cell}>
        <select className={inputClass} value={a.tier ?? "ic"} onChange={(e) => onAttr(person, { tier: e.target.value as PersonNode["attributes"]["tier"] })}>
          {TIERS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </td>
      <td className={cell}>
        <input className={inputClass} list="ss-people" defaultValue={managerName} onBlur={(e) => onManager(person, e.target.value)} key={`mgr-${person.id}-${managerName}`} />
      </td>
      <td className={cell}>
        <input className={inputClass} list="ss-brands" defaultValue={a.primaryBrand ?? ""} onBlur={(e) => onAttr(person, { primaryBrand: e.target.value.trim() || undefined })} key={`pb-${person.id}-${a.primaryBrand}`} />
      </td>
      <td className={cell}>
        <input className={`${inputClass} text-slate-400`} defaultValue={a.brands.join(", ")} onBlur={(e) => onAttr(person, { brands: commaList(e.target.value) })} key={`bs-${person.id}-${a.brands.join(",")}`} />
      </td>
      <td className={cell}>
        <input className={inputClass} list="ss-channels" defaultValue={a.primaryChannel ?? ""} onBlur={(e) => onAttr(person, { primaryChannel: e.target.value.trim() || undefined })} key={`pc-${person.id}-${a.primaryChannel}`} />
      </td>
      <td className={cell}>
        <input className={`${inputClass} text-slate-400`} defaultValue={a.channels.join(", ")} onBlur={(e) => onAttr(person, { channels: commaList(e.target.value) })} key={`cs-${person.id}-${a.channels.join(",")}`} />
      </td>
      <td className={cell}>
        <input className={inputClass} defaultValue={a.location ?? ""} onBlur={(e) => onAttr(person, { location: e.target.value.trim() || undefined })} key={`loc-${person.id}-${a.location}`} />
      </td>
    </tr>
  );
});

export function SpreadsheetView({ open, onClose }: SpreadsheetViewProps) {
  const nodes = useGraphStore((s) => s.document.nodes);
  const edges = useGraphStore((s) => s.document.edges);
  const updatePerson = useGraphStore((s) => s.updatePerson);
  const addRelationship = useGraphStore((s) => s.addRelationship);
  const removeRelationship = useGraphStore((s) => s.removeRelationship);

  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState(1);

  const people = useMemo(() => nodes.filter((n): n is PersonNode => n.kind === "person"), [nodes]);

  const managerOf = useMemo(() => {
    const m: Record<string, { edgeId: string; managerId: string }> = {};
    edges.forEach((e) => {
      if (e.metadata.type === "manager" && !(e.target in m)) m[e.target] = { edgeId: e.id, managerId: e.source };
    });
    return m;
  }, [edges]);
  const nameById = useMemo(() => new Map(people.map((p) => [p.id, p.name])), [people]);
  const idByName = useMemo(() => {
    const m = new Map<string, string>();
    people.forEach((p) => { if (!m.has(p.name)) m.set(p.name, p.id); });
    return m;
  }, [people]);

  const options = useMemo(() => {
    const brands = new Set<string>(), channels = new Set<string>(), depts = new Set<string>();
    people.forEach((p) => {
      p.attributes.brands.forEach((b) => brands.add(b));
      if (p.attributes.primaryBrand) brands.add(p.attributes.primaryBrand);
      p.attributes.channels.forEach((c) => channels.add(c));
      if (p.attributes.primaryChannel) channels.add(p.attributes.primaryChannel);
      if (p.attributes.primaryDepartment) depts.add(p.attributes.primaryDepartment);
      p.attributes.departments.forEach((d) => depts.add(d));
    });
    return {
      brands: [...brands].sort(),
      channels: [...channels].sort(),
      depts: [...depts].sort(),
    };
  }, [people]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = people;
    if (q) {
      list = list.filter((p) =>
        `${p.name} ${p.attributes.title} ${p.attributes.primaryDepartment ?? ""} ${p.attributes.primaryBrand ?? ""} ${p.attributes.primaryChannel ?? ""}`
          .toLowerCase()
          .includes(q),
      );
    }
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
      if (typeof kx === "number" && typeof ky === "number") return (kx - ky) * sortDir;
      return String(kx).localeCompare(String(ky)) * sortDir;
    });
  }, [people, query, sortKey, sortDir, managerOf, nameById]);

  const onName = useCallback((p: PersonNode, v: string) => {
    const name = v.trim();
    if (name && name !== p.name) updatePerson(p.id, { name });
  }, [updatePerson]);

  const onAttr = useCallback((p: PersonNode, patch: Partial<PersonNode["attributes"]>) => {
    updatePerson(p.id, { attributes: { ...p.attributes, ...patch } });
  }, [updatePerson]);

  const onManager = useCallback((p: PersonNode, name: string) => {
    const trimmed = name.trim();
    const newMgrId = trimmed ? idByName.get(trimmed) : undefined;
    const cur = managerOf[p.id];
    if ((cur?.managerId ?? "") === (newMgrId ?? "")) return;
    if (newMgrId === p.id) return; // can't manage self
    if (cur) removeRelationship(cur.edgeId);
    if (newMgrId) addRelationship(newMgrId, p.id, "manager");
  }, [idByName, managerOf, addRelationship, removeRelationship]);

  if (!open) return null;

  const SortHeader = ({ label, k, w }: { label: string; k: SortKey; w: string }) => (
    <th className={`sticky top-0 z-20 ${w} cursor-pointer select-none border-b border-slate-200 bg-slate-50 px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300`}
      onClick={() => { sortKey === k ? setSortDir((d) => -d) : setSortKey(k); }}>
      <span className="inline-flex items-center gap-1">{label}<CaretSortIcon className={`h-3 w-3 ${sortKey === k ? "text-sky-500" : "text-slate-300"}`} /></span>
    </th>
  );
  const noDeptCount = people.filter((p) => !p.attributes.primaryDepartment).length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-slate-950">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-3 dark:border-white/10">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">People · Spreadsheet</h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-300">{rows.length} of {people.length}</span>
          {noDeptCount > 0 && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">{noDeptCount} missing department</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, title, dept…"
              className="w-64 rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-sm text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-200/50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
            />
          </div>
          <span className="text-[11px] text-slate-400">Edits save on blur &amp; sync everywhere</span>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
            <Cross2Icon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto [transform:translateZ(0)]">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-30 min-w-[12rem] border-b border-slate-200 bg-slate-50 px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
                onClick={() => { sortKey === "name" ? setSortDir((d) => -d) : setSortKey("name"); }}>
                <span className="inline-flex items-center gap-1">Name<CaretSortIcon className={`h-3 w-3 ${sortKey === "name" ? "text-sky-500" : "text-slate-300"}`} /></span>
              </th>
              <SortHeader label="Title" k="title" w="min-w-[12rem]" />
              <SortHeader label="Department" k="department" w="min-w-[11rem]" />
              <SortHeader label="Tier" k="tier" w="min-w-[6rem]" />
              <SortHeader label="Reports to" k="manager" w="min-w-[11rem]" />
              <SortHeader label="Primary Brand" k="brand" w="min-w-[8rem]" />
              <th className="sticky top-0 z-20 min-w-[10rem] border-b border-slate-200 bg-slate-50 px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:border-white/10 dark:bg-slate-800">Brands</th>
              <SortHeader label="Primary Channel" k="channel" w="min-w-[9rem]" />
              <th className="sticky top-0 z-20 min-w-[12rem] border-b border-slate-200 bg-slate-50 px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:border-white/10 dark:bg-slate-800">Channels</th>
              <SortHeader label="Location" k="location" w="min-w-[9rem]" />
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <Row
                key={p.id}
                person={p}
                managerName={nameById.get(managerOf[p.id]?.managerId ?? "") ?? ""}
                onName={onName}
                onAttr={onAttr}
                onManager={onManager}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Shared option lists keep the DOM light across all rows */}
      <datalist id="ss-depts">{options.depts.map((d) => <option key={d} value={d} />)}</datalist>
      <datalist id="ss-brands">{options.brands.map((b) => <option key={b} value={b} />)}</datalist>
      <datalist id="ss-channels">{options.channels.map((c) => <option key={c} value={c} />)}</datalist>
      <datalist id="ss-people">{people.map((p) => <option key={p.id} value={p.name} />)}</datalist>
    </div>
  );
}
