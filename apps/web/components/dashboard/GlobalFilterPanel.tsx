'use client';
import { useEffect, useState } from 'react';
import { useFilterStore } from '@/lib/filter-store';
import { kpiApi } from '@/lib/api';
import { VALID_PLATFORMS, VALID_STATUSES } from '@dms/shared';
import { Filter, RotateCcw, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterPanelProps {
  dashboardId: string;
}

export default function GlobalFilterPanel({ dashboardId }: FilterPanelProps) {
  const { 
    filters, 
    activeFilterCount, 
    setFilter, 
    resetFilters, 
    toggleStatus, 
    togglePlatform,
    togglePic,
    toggleCategory
  } = useFilterStore();

  const [options, setOptions] = useState<{
    pics: string[];
    categories: string[];
    platforms: string[];
    years: string[];
  }>({ pics: [], categories: [], platforms: [], years: [] });

  useEffect(() => {
    async function loadOptions() {
      try {
        const res = await kpiApi.getFilterOptions(dashboardId);
        setOptions(res.data);
      } catch (err) {
        console.error('Failed to load filter options:', err);
      }
    }
    if (dashboardId) {
      loadOptions();
    }
  }, [dashboardId]);

  return (
    <div className="w-full bg-card border border-border rounded-2xl p-4 shadow-sm space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Filter className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-foreground">Global Filters</h3>
          {activeFilterCount > 0 && (
            <span className="text-xs bg-primary text-primary-foreground font-semibold px-2 py-0.5 rounded-full">
              {activeFilterCount} active
            </span>
          )}
        </div>
        
        {activeFilterCount > 0 && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors py-1 px-2.5 rounded-lg hover:bg-secondary"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset All
          </button>
        )}
      </div>

      {/* Grid of Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* Year */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Year</label>
          <select
            value={filters.year || ''}
            onChange={(e) => setFilter('year', e.target.value ? Number(e.target.value) : undefined)}
            className="w-full bg-secondary/50 border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50 transition-colors"
          >
            <option value="">All Years</option>
            {options.years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Quarter */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Quarter</label>
          <select
            value={filters.quarter || ''}
            onChange={(e) => setFilter('quarter', e.target.value || undefined)}
            className="w-full bg-secondary/50 border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50 transition-colors"
          >
            <option value="">All Quarters</option>
            <option value="Q1">Q1</option>
            <option value="Q2">Q2</option>
            <option value="Q3">Q3</option>
            <option value="Q4">Q4</option>
          </select>
        </div>

        {/* Semester */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Semester</label>
          <select
            value={filters.semester || ''}
            onChange={(e) => setFilter('semester', e.target.value || undefined)}
            className="w-full bg-secondary/50 border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50 transition-colors"
          >
            <option value="">All Semesters</option>
            <option value="S1">S1</option>
            <option value="S2">S2</option>
          </select>
        </div>

        {/* Month */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Month</label>
          <input
            type="month"
            value={filters.month || ''}
            onChange={(e) => setFilter('month', e.target.value || undefined)}
            className="w-full bg-secondary/50 border border-border rounded-xl px-2.5 py-1 text-xs text-foreground focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>

        {/* Status */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Status</label>
          <select
            value={filters.status?.[0] || ''}
            onChange={(e) => setFilter('status', e.target.value ? [e.target.value as any] : undefined)}
            className="w-full bg-secondary/50 border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50 transition-colors"
          >
            <option value="">All Statuses</option>
            {VALID_STATUSES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Platform */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Platform</label>
          <select
            value={filters.platform?.[0] || ''}
            onChange={(e) => setFilter('platform', e.target.value ? [e.target.value as any] : undefined)}
            className="w-full bg-secondary/50 border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50 transition-colors"
          >
            <option value="">All Platforms</option>
            {VALID_PLATFORMS.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* PIC */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">PIC</label>
          <select
            value={filters.pic?.[0] || ''}
            onChange={(e) => setFilter('pic', e.target.value ? [e.target.value] : undefined)}
            className="w-full bg-secondary/50 border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50 transition-colors"
          >
            <option value="">All PICs</option>
            {options.pics.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* Category */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Category</label>
          <select
            value={filters.category?.[0] || ''}
            onChange={(e) => setFilter('category', e.target.value ? [e.target.value] : undefined)}
            className="w-full bg-secondary/50 border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50 transition-colors"
          >
            <option value="">All Categories</option>
            {options.categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Filter Badges */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border/60">
          {filters.year && (
            <span className="inline-flex items-center gap-1 bg-secondary text-foreground text-xs px-2.5 py-1 rounded-lg border border-border">
              Year: {filters.year}
              <button onClick={() => setFilter('year', undefined)} className="hover:text-primary"><X className="w-3 h-3" /></button>
            </span>
          )}
          {filters.quarter && (
            <span className="inline-flex items-center gap-1 bg-secondary text-foreground text-xs px-2.5 py-1 rounded-lg border border-border">
              Quarter: {filters.quarter}
              <button onClick={() => setFilter('quarter', undefined)} className="hover:text-primary"><X className="w-3 h-3" /></button>
            </span>
          )}
          {filters.semester && (
            <span className="inline-flex items-center gap-1 bg-secondary text-foreground text-xs px-2.5 py-1 rounded-lg border border-border">
              Semester: {filters.semester}
              <button onClick={() => setFilter('semester', undefined)} className="hover:text-primary"><X className="w-3 h-3" /></button>
            </span>
          )}
          {filters.month && (
            <span className="inline-flex items-center gap-1 bg-secondary text-foreground text-xs px-2.5 py-1 rounded-lg border border-border">
              Month: {filters.month}
              <button onClick={() => setFilter('month', undefined)} className="hover:text-primary"><X className="w-3 h-3" /></button>
            </span>
          )}
          {filters.status?.map(s => (
            <span key={s} className="inline-flex items-center gap-1 bg-secondary text-foreground text-xs px-2.5 py-1 rounded-lg border border-border">
              Status: {s}
              <button onClick={() => toggleStatus(s)} className="hover:text-primary"><X className="w-3 h-3" /></button>
            </span>
          ))}
          {filters.platform?.map(p => (
            <span key={p} className="inline-flex items-center gap-1 bg-secondary text-foreground text-xs px-2.5 py-1 rounded-lg border border-border">
              Platform: {p}
              <button onClick={() => togglePlatform(p)} className="hover:text-primary"><X className="w-3 h-3" /></button>
            </span>
          ))}
          {filters.pic?.map(p => (
            <span key={p} className="inline-flex items-center gap-1 bg-secondary text-foreground text-xs px-2.5 py-1 rounded-lg border border-border">
              PIC: {p}
              <button onClick={() => togglePic(p)} className="hover:text-primary"><X className="w-3 h-3" /></button>
            </span>
          ))}
          {filters.category?.map(c => (
            <span key={c} className="inline-flex items-center gap-1 bg-secondary text-foreground text-xs px-2.5 py-1 rounded-lg border border-border">
              Category: {c}
              <button onClick={() => toggleCategory(c)} className="hover:text-primary"><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
