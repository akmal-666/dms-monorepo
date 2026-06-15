'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@dms/shared';

interface AuthStore {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  setLoading: (v: boolean) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      setAuth: (user, token) => set({ user, token, isLoading: false }),
      clearAuth: () => set({ user: null, token: null }),
      setLoading: (v) => set({ isLoading: v }),
    }),
    { name: 'dms-auth', partialize: (s) => ({ user: s.user, token: s.token }) }
  )
);

export function isAdmin(user: User | null) { return user?.role === 'admin'; }
export function isManager(user: User | null) { return user?.role === 'admin' || user?.role === 'manager'; }
export function isViewer(user: User | null) { return user?.role === 'viewer'; }
