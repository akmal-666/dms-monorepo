'use client';
import { create } from 'zustand';
import type { GlobalFilters, RequirementStatus, Platform } from '@dms/shared';

interface FilterStore {
  filters: GlobalFilters;
  activeFilterCount: number;
  setFilter: <K extends keyof GlobalFilters>(key: K, value: GlobalFilters[K]) => void;
  resetFilters: () => void;
  toggleStatus: (status: RequirementStatus) => void;
  togglePlatform: (platform: Platform) => void;
  togglePic: (pic: string) => void;
  toggleCategory: (cat: string) => void;
}

function countActive(filters: GlobalFilters): number {
  let count = 0;
  if (filters.year) count++;
  if (filters.quarter) count++;
  if (filters.semester) count++;
  if (filters.month) count++;
  if (filters.status?.length) count++;
  if (filters.pic?.length) count++;
  if (filters.category?.length) count++;
  if (filters.platform?.length) count++;
  return count;
}

function toggle<T>(arr: T[] | undefined, item: T): T[] {
  const a = arr ?? [];
  return a.includes(item) ? a.filter(x => x !== item) : [...a, item];
}

// Helper: omit undefined values to produce a clean GlobalFilters object
function omitEmpty(obj: GlobalFilters): GlobalFilters {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== '' && v !== null && !(Array.isArray(v) && v.length === 0))
  ) as GlobalFilters;
}

export const useFilterStore = create<FilterStore>((set) => ({
  filters: {},
  activeFilterCount: 0,

  setFilter: (key, value) =>
    set(s => {
      const raw: GlobalFilters = { ...s.filters, [key]: value };
      const next = omitEmpty(raw);
      return { filters: next, activeFilterCount: countActive(next) };
    }),

  resetFilters: () => set({ filters: {}, activeFilterCount: 0 }),

  toggleStatus: (status) =>
    set(s => {
      const updated = toggle(s.filters.status, status);
      const next = omitEmpty({ ...s.filters, status: updated.length ? updated : undefined });
      return { filters: next, activeFilterCount: countActive(next) };
    }),

  togglePlatform: (platform) =>
    set(s => {
      const updated = toggle(s.filters.platform, platform);
      const next = omitEmpty({ ...s.filters, platform: updated.length ? updated : undefined });
      return { filters: next, activeFilterCount: countActive(next) };
    }),

  togglePic: (pic) =>
    set(s => {
      const updated = toggle(s.filters.pic, pic);
      const next = omitEmpty({ ...s.filters, pic: updated.length ? updated : undefined });
      return { filters: next, activeFilterCount: countActive(next) };
    }),

  toggleCategory: (cat) =>
    set(s => {
      const updated = toggle(s.filters.category, cat);
      const next = omitEmpty({ ...s.filters, category: updated.length ? updated : undefined });
      return { filters: next, activeFilterCount: countActive(next) };
    }),
}));
