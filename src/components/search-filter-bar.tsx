'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { MagnifyingGlassIcon, Cross2Icon, CheckIcon } from '@radix-ui/react-icons';
import { useGraphStore } from '@/store/graph-store';
import type { PersonNode } from '@/lib/schema/types';

export function SearchFilterBar() {
  const nodes = useGraphStore((state) => state.document.nodes);
  const lens = useGraphStore((state) => state.document.lens);
  const lensState = useGraphStore((state) => state.document.lens_state[state.document.lens]);
  const setLensFilters = useGraphStore((state) => state.setLensFilters);
  const selectNode = useGraphStore((state) => state.selectNode);
  const setSelection = useGraphStore((state) => state.setSelection);
  const clearSelection = useGraphStore((state) => state.clearSelection);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<{
    brands: Set<string>;
    channels: Set<string>;
    departments: Set<string>;
  }>({
    brands: new Set(),
    channels: new Set(),
    departments: new Set(),
  });
  const [filterMode, setFilterMode] = useState<'or' | 'and'>('or'); // OR = match any, AND = match all

  const personNodes = useMemo(
    () => nodes.filter((n): n is PersonNode => n.kind === 'person'),
    [nodes]
  );

  // Extract unique values for filters
  const availableFilters = useMemo(() => {
    const brands = new Set<string>();
    const channels = new Set<string>();
    const departments = new Set<string>();

    personNodes.forEach((node) => {
      node.attributes.brands.forEach((b) => brands.add(b));
      node.attributes.channels.forEach((c) => channels.add(c));
      node.attributes.departments.forEach((d) => departments.add(d));
    });

    return {
      brands: Array.from(brands).sort(),
      channels: Array.from(channels).sort(),
      departments: Array.from(departments).sort(),
    };
  }, [personNodes]);

  // Filter nodes based on search and filters
  const matchingNodes = useMemo(() => {
    let filtered = personNodes;

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (node) =>
          node.name.toLowerCase().includes(query) ||
          node.attributes.title.toLowerCase().includes(query)
      );
    }

    // Apply dimension filters with AND/OR logic
    const hasBrandFilter = selectedFilters.brands.size > 0;
    const hasChannelFilter = selectedFilters.channels.size > 0;
    const hasDeptFilter = selectedFilters.departments.size > 0;

    if (hasBrandFilter || hasChannelFilter || hasDeptFilter) {
      if (filterMode === 'and') {
        // AND mode: must match ALL selected dimensions
        filtered = filtered.filter((node) => {
          let matches = true;
          
          if (hasBrandFilter) {
            matches = matches && Array.from(selectedFilters.brands).some((brand) =>
              node.attributes.brands.includes(brand)
            );
          }
          
          if (hasChannelFilter) {
            matches = matches && Array.from(selectedFilters.channels).some((channel) =>
              node.attributes.channels.includes(channel)
            );
          }
          
          if (hasDeptFilter) {
            matches = matches && Array.from(selectedFilters.departments).some((dept) =>
              node.attributes.departments.includes(dept)
            );
          }
          
          return matches;
        });
      } else {
        // OR mode: match ANY selected dimension
        filtered = filtered.filter((node) => {
          const brandMatch = hasBrandFilter && Array.from(selectedFilters.brands).some((brand) =>
            node.attributes.brands.includes(brand)
          );
          const channelMatch = hasChannelFilter && Array.from(selectedFilters.channels).some((channel) =>
            node.attributes.channels.includes(channel)
          );
          const deptMatch = hasDeptFilter && Array.from(selectedFilters.departments).some((dept) =>
            node.attributes.departments.includes(dept)
          );
          
          return brandMatch || channelMatch || deptMatch;
        });
      }
    }

    return filtered;
  }, [personNodes, searchQuery, selectedFilters, filterMode]);

  // Update lens filters when search/filter changes
  const handleFilterChange = useCallback(() => {
    const activeTokens: string[] = [];
    
    if (searchQuery.trim()) {
      // For search, we'll use a different mechanism - update lens filters with matched IDs
      const matchedIds = matchingNodes.map((n) => n.id);
      setLensFilters(lens, {
        focusIds: matchedIds,
        activeTokens: [],
      });
    } else {
      // For filter chips, use tokens
      selectedFilters.brands.forEach((brand) => activeTokens.push(brand));
      selectedFilters.channels.forEach((channel) => activeTokens.push(channel));
      selectedFilters.departments.forEach((dept) => activeTokens.push(dept));

      setLensFilters(lens, {
        activeTokens,
        focusIds: [],
      });
    }
  }, [searchQuery, selectedFilters, matchingNodes, lens, setLensFilters]);

  // Update lens filters when search/filter changes
  useEffect(() => {
    handleFilterChange();
  }, [handleFilterChange]);

  const toggleFilter = useCallback(
    (type: 'brands' | 'channels' | 'departments', value: string) => {
      setSelectedFilters((prev) => {
        const newSet = new Set(prev[type]);
        if (newSet.has(value)) {
          newSet.delete(value);
        } else {
          newSet.add(value);
        }
        return { ...prev, [type]: newSet };
      });
    },
    []
  );

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedFilters({ brands: new Set(), channels: new Set(), departments: new Set() });
    setLensFilters(lens, { activeTokens: [], focusIds: [] });
    clearSelection();
  }, [lens, setLensFilters, clearSelection]);

  const selectAllMatching = useCallback(() => {
    if (matchingNodes.length > 0) {
      setSelection({
        nodeIds: matchingNodes.map((n) => n.id),
        edgeIds: [],
      });
    }
  }, [matchingNodes, setSelection]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    selectedFilters.brands.size > 0 ||
    selectedFilters.channels.size > 0 ||
    selectedFilters.departments.size > 0;

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/95">
      {/* Search Bar */}
      <div className="relative mb-4">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name or title..."
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-10 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-white/10 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-400"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <Cross2Icon className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter Mode Toggle */}
      {(selectedFilters.brands.size > 0 || selectedFilters.channels.size > 0 || selectedFilters.departments.size > 0) && (
        <div className="mb-3 flex items-center gap-2">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Filter mode:</span>
          <div className="flex rounded-lg border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-slate-800">
            <button
              onClick={() => setFilterMode('or')}
              className={`rounded px-2 py-1 text-xs font-medium transition ${
                filterMode === 'or'
                  ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'
                  : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              Match ANY
            </button>
            <button
              onClick={() => setFilterMode('and')}
              className={`rounded px-2 py-1 text-xs font-medium transition ${
                filterMode === 'and'
                  ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'
                  : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              Match ALL
            </button>
          </div>
        </div>
      )}

      {/* Quick Filter Presets */}
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          onClick={() => {
            const multiBrand = personNodes.filter(n => n.attributes.brands.length > 1);
            const multiChannel = personNodes.filter(n => n.attributes.channels.length > 1);
            const multiDept = personNodes.filter(n => n.attributes.departments.length > 1);
            const combined = new Set([...multiBrand, ...multiChannel, ...multiDept].map(n => n.id));
            setLensFilters(lens, { focusIds: Array.from(combined) });
          }}
          className="rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-900/20 dark:text-indigo-300"
        >
          Multi-dimension
        </button>
        <button
          onClick={() => {
            const noBrand = personNodes.filter(n => n.attributes.brands.length === 0);
            const noChannel = personNodes.filter(n => n.attributes.channels.length === 0);
            const noDept = personNodes.filter(n => n.attributes.departments.length === 0);
            const combined = new Set([...noBrand, ...noChannel, ...noDept].map(n => n.id));
            setLensFilters(lens, { focusIds: Array.from(combined) });
          }}
          className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 transition hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-900/20 dark:text-amber-300"
        >
          Missing assignments
        </button>
        <button
          onClick={() => {
            const overlaps = personNodes.filter(n => 
              n.attributes.brands.length + n.attributes.channels.length + n.attributes.departments.length > 8
            );
            setLensFilters(lens, { focusIds: overlaps.map(n => n.id) });
          }}
          className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 transition hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-900/20 dark:text-rose-300"
        >
          High overlap
        </button>
      </div>

      {/* Filter Chips */}
      <div className="space-y-3">
        {/* Brands */}
        {availableFilters.brands.length > 0 && (
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Brands
            </div>
            <div className="flex flex-wrap gap-2">
              {availableFilters.brands.map((brand) => {
                const isSelected = selectedFilters.brands.has(brand);
                return (
                  <button
                    key={brand}
                    onClick={() => toggleFilter('brands', brand)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                      isSelected
                        ? 'border-sky-500 bg-sky-50 text-sky-700 dark:border-sky-400 dark:bg-sky-900/30 dark:text-sky-300'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-white/20'
                    }`}
                  >
                    {isSelected && <CheckIcon className="h-3 w-3" />}
                    {brand}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Channels */}
        {availableFilters.channels.length > 0 && (
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Channels
            </div>
            <div className="flex flex-wrap gap-2">
              {availableFilters.channels.map((channel) => {
                const isSelected = selectedFilters.channels.has(channel);
                return (
                  <button
                    key={channel}
                    onClick={() => toggleFilter('channels', channel)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                      isSelected
                        ? 'border-sky-500 bg-sky-50 text-sky-700 dark:border-sky-400 dark:bg-sky-900/30 dark:text-sky-300'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-white/20'
                    }`}
                  >
                    {isSelected && <CheckIcon className="h-3 w-3" />}
                    {channel}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Departments */}
        {availableFilters.departments.length > 0 && (
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Departments
            </div>
            <div className="flex flex-wrap gap-2">
              {availableFilters.departments.map((dept) => {
                const isSelected = selectedFilters.departments.has(dept);
                return (
                  <button
                    key={dept}
                    onClick={() => toggleFilter('departments', dept)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                      isSelected
                        ? 'border-sky-500 bg-sky-50 text-sky-700 dark:border-sky-400 dark:bg-sky-900/30 dark:text-sky-300'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-white/20'
                    }`}
                  >
                    {isSelected && <CheckIcon className="h-3 w-3" />}
                    {dept}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Results and Actions */}
      <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4 dark:border-white/10">
        <div className="text-sm text-slate-600 dark:text-slate-300">
          {hasActiveFilters ? (
            <span>
              <span className="font-semibold">{matchingNodes.length}</span> of{' '}
              <span>{personNodes.length}</span> people visible
            </span>
          ) : (
            <span>
              <span className="font-semibold">{personNodes.length}</span> people total
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && matchingNodes.length > 0 && (
            <button
              onClick={selectAllMatching}
              className="rounded-lg border border-sky-500 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-100 dark:border-sky-400 dark:bg-sky-900/30 dark:text-sky-300 dark:hover:bg-sky-900/50"
            >
              Select All ({matchingNodes.length})
            </button>
          )}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

