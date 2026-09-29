/**
 * anushthaanStore.ts
 *
 * Zustand store for Anushthaan (40/108 day challenge) tracking.
 */

import { create } from 'zustand';
import { Anushthaan, AnushthaanDay } from '@/types/stats';
import { persistence } from '@/services/persistence/localStorageAdapter';
import { getTodayKey } from '@/utils/normalize';

function generateId(): string {
  return `anushthaan-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function computeEndDate(startDate: string, days: number): string {
  const d = new Date(startDate);
  d.setDate(d.getDate() + days - 1);
  return d.toISOString().slice(0, 10);
}

interface AnushthaanState {
  anushthaans: Anushthaan[];
  activeAnushthaan: Anushthaan | null;
  isLoading: boolean;

  loadAnushthaans: () => Promise<void>;
  createAnushthaan: (params: {
    name: string;
    mantraId: string;
    mantraDisplayName: string;
    durationDays: number;
    dailyTarget: number;
    sankalp?: string;
  }) => Promise<Anushthaan>;
  recordDailyJap: (anushthaanId: string, count: number) => Promise<void>;
  completeAnushthaan: (id: string) => Promise<void>;
  cancelAnushthaan: (id: string) => Promise<void>;
  getProgressPercent: (anushthaan: Anushthaan) => number;
  getCompletedDays: (anushthaan: Anushthaan) => number;
  getStreakDays: (anushthaan: Anushthaan) => number;
}

export const useAnushthaanStore = create<AnushthaanState>()((set, get) => ({
  anushthaans: [],
  activeAnushthaan: null,
  isLoading: false,

  async loadAnushthaans() {
    set({ isLoading: true });
    try {
      const all = await persistence.getAnushthaans?.() ?? [];
      const active = all.find((a) => a.active) ?? null;
      set({ anushthaans: all, activeAnushthaan: active });
    } finally {
      set({ isLoading: false });
    }
  },

  async createAnushthaan({ name, mantraId, mantraDisplayName: _dn, durationDays, dailyTarget, sankalp }) {
    const startDate = getTodayKey();
    const endDate = computeEndDate(startDate, durationDays);

    const anushthaan: Anushthaan = {
      id: generateId(),
      name,
      mantraId,
      dailyTarget,
      durationDays,
      startDate,
      endDate,
      sankalp,
      days: [],
      active: true,
      createdAt: Date.now(),
    };

    await persistence.saveAnushthaan?.(anushthaan);
    set((state) => ({
      anushthaans: [...state.anushthaans, anushthaan],
      activeAnushthaan: anushthaan,
    }));
    return anushthaan;
  },

  async recordDailyJap(anushthaanId, count) {
    const { anushthaans } = get();
    const idx = anushthaans.findIndex((a) => a.id === anushthaanId);
    if (idx < 0) return;

    const anushthaan = { ...anushthaans[idx] };
    const today = getTodayKey();
    const dayIdx = anushthaan.days.findIndex((d) => d.date === today);

    const dayEntry: AnushthaanDay = dayIdx >= 0
      ? { ...anushthaan.days[dayIdx], count: anushthaan.days[dayIdx].count + count }
      : { date: today, count, completed: false, skipped: false };

    dayEntry.completed = dayEntry.count >= anushthaan.dailyTarget;

    if (dayIdx >= 0) {
      anushthaan.days[dayIdx] = dayEntry;
    } else {
      anushthaan.days.push(dayEntry);
    }

    const updated = [...anushthaans];
    updated[idx] = anushthaan;

    await persistence.saveAnushthaan?.(anushthaan);
    set({
      anushthaans: updated,
      activeAnushthaan: anushthaan.active ? anushthaan : get().activeAnushthaan,
    });
  },

  async completeAnushthaan(id) {
    const { anushthaans } = get();
    const idx = anushthaans.findIndex((a) => a.id === id);
    if (idx < 0) return;

    const updated = [...anushthaans];
    updated[idx] = { ...updated[idx], active: false, completedAt: getTodayKey() };
    await persistence.saveAnushthaan?.(updated[idx]);
    set({ anushthaans: updated, activeAnushthaan: null });
  },

  async cancelAnushthaan(id) {
    const { anushthaans } = get();
    const idx = anushthaans.findIndex((a) => a.id === id);
    if (idx < 0) return;

    const updated = [...anushthaans];
    updated[idx] = { ...updated[idx], active: false };
    await persistence.saveAnushthaan?.(updated[idx]);
    set({ anushthaans: updated, activeAnushthaan: null });
  },

  getProgressPercent(anushthaan) {
    const completed = anushthaan.days.filter((d) => d.completed).length;
    return Math.round((completed / anushthaan.durationDays) * 100);
  },

  getCompletedDays(anushthaan) {
    return anushthaan.days.filter((d) => d.completed).length;
  },

  getStreakDays(anushthaan) {
    const days = [...anushthaan.days].sort((a, b) => a.date.localeCompare(b.date));
    let streak = 0;
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].completed) streak++;
      else break;
    }
    return streak;
  },
}));
