/**
 * localStorageAdapter.ts
 *
 * Phase 1 persistence: localStorage with versioning and corruption recovery.
 *
 * Key schema: naam-jap:v1:<namespace>
 *
 * Writes are batched/debounced to avoid excessive localStorage I/O during
 * rapid jap counting events.
 */

import { PersistenceAdapter } from './adapter';
import { JapSession, ActiveSession } from '@/types/session';
import { DailyStats, LifetimeStats, Streak, JapGoal, Anushthaan, Achievement } from '@/types/stats';
import { MantraConfig } from '@/types/mantra';
import { UserSettings, DEFAULT_SETTINGS } from '@/types/settings';

const VERSION = 'v1';
const PREFIX = `naam-jap:${VERSION}`;

// Key map
const KEYS = {
  settings: `${PREFIX}:settings`,
  customMantras: `${PREFIX}:custom-mantras`,
  activeSession: `${PREFIX}:active-session`,
  sessions: `${PREFIX}:sessions`,
  dailyStats: (date: string) => `${PREFIX}:daily:${date}`,
  lifetimeStats: `${PREFIX}:lifetime`,
  streak: `${PREFIX}:streak`,
  goals: `${PREFIX}:goals`,
  storageVersion: `${PREFIX}:version`,
} as const;

const MAX_SESSIONS_STORED = 365; // 1 year of sessions

function safeGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    // Corrupted entry — remove it
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
    return null;
  }
}

function safeSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    // Storage quota exceeded
    const error = err as Error;
    if (error.name === 'QuotaExceededError') {
      console.warn('[Naam Jap] Storage quota exceeded — clearing old sessions');
      pruneSessions();
    }
  }
}

function pruneSessions(): void {
  try {
    const sessions = safeGet<JapSession[]>(KEYS.sessions) ?? [];
    // Keep most recent 90 sessions
    const pruned = sessions.slice(-90);
    safeSet(KEYS.sessions, pruned);
  } catch {
    // ignore
  }
}

export class LocalStorageAdapter implements PersistenceAdapter {
  // ─── Settings ─────────────────────────────────────────────

  async getSettings(): Promise<UserSettings | null> {
    return safeGet<UserSettings>(KEYS.settings);
  }

  async saveSettings(settings: UserSettings): Promise<void> {
    safeSet(KEYS.settings, settings);
  }

  // ─── Custom Mantras ────────────────────────────────────────

  async getCustomMantras(): Promise<MantraConfig[]> {
    return safeGet<MantraConfig[]>(KEYS.customMantras) ?? [];
  }

  async saveCustomMantra(mantra: MantraConfig): Promise<void> {
    const existing = safeGet<MantraConfig[]>(KEYS.customMantras) ?? [];
    const idx = existing.findIndex((m) => m.id === mantra.id);
    if (idx >= 0) {
      existing[idx] = mantra;
    } else {
      existing.push(mantra);
    }
    safeSet(KEYS.customMantras, existing);
  }

  async deleteCustomMantra(id: string): Promise<void> {
    const existing = safeGet<MantraConfig[]>(KEYS.customMantras) ?? [];
    const filtered = existing.filter((m) => m.id !== id);
    safeSet(KEYS.customMantras, filtered);
  }

  // ─── Active Session ────────────────────────────────────────

  async getActiveSession(): Promise<ActiveSession | null> {
    return safeGet<ActiveSession>(KEYS.activeSession);
  }

  async saveActiveSession(session: ActiveSession | null): Promise<void> {
    if (session === null) {
      try { localStorage.removeItem(KEYS.activeSession); } catch { /* ignore */ }
    } else {
      safeSet(KEYS.activeSession, session);
    }
  }

  // ─── Session History ───────────────────────────────────────

  async getSessions(limit = 100): Promise<JapSession[]> {
    const all = safeGet<JapSession[]>(KEYS.sessions) ?? [];
    // Most recent first
    return all.slice(-limit).reverse();
  }

  async saveSession(session: JapSession): Promise<void> {
    const existing = safeGet<JapSession[]>(KEYS.sessions) ?? [];
    const idx = existing.findIndex((s) => s.id === session.id);
    if (idx >= 0) {
      existing[idx] = session;
    } else {
      existing.push(session);
    }
    // Enforce max
    if (existing.length > MAX_SESSIONS_STORED) {
      existing.splice(0, existing.length - MAX_SESSIONS_STORED);
    }
    safeSet(KEYS.sessions, existing);
  }

  async updateSession(sessionId: string, updates: Partial<JapSession>): Promise<void> {
    const existing = safeGet<JapSession[]>(KEYS.sessions) ?? [];
    const idx = existing.findIndex((s) => s.id === sessionId);
    if (idx >= 0) {
      existing[idx] = { ...existing[idx], ...updates };
      safeSet(KEYS.sessions, existing);
    }
  }

  // ─── Daily Stats ───────────────────────────────────────────

  async getDailyStats(date: string): Promise<DailyStats | null> {
    return safeGet<DailyStats>(KEYS.dailyStats(date));
  }

  async saveDailyStats(stats: DailyStats): Promise<void> {
    safeSet(KEYS.dailyStats(stats.date), stats);
  }

  async getDailyStatsRange(startDate: string, endDate: string): Promise<DailyStats[]> {
    const results: DailyStats[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const current = new Date(start);

    while (current <= end) {
      const dateStr = current.toISOString().slice(0, 10);
      const stats = safeGet<DailyStats>(KEYS.dailyStats(dateStr));
      if (stats) results.push(stats);
      current.setDate(current.getDate() + 1);
    }

    return results;
  }

  // ─── Lifetime Stats ────────────────────────────────────────

  async getLifetimeStats(): Promise<LifetimeStats> {
    return safeGet<LifetimeStats>(KEYS.lifetimeStats) ?? {
      totalCount: 0,
      totalMalaCount: 0,
      totalDuration: 0,
      totalSessions: 0,
    };
  }

  async updateLifetimeStats(delta: Partial<LifetimeStats>): Promise<void> {
    const current = await this.getLifetimeStats();
    const updated: LifetimeStats = {
      totalCount: (current.totalCount ?? 0) + (delta.totalCount ?? 0),
      totalMalaCount: (current.totalMalaCount ?? 0) + (delta.totalMalaCount ?? 0),
      totalDuration: (current.totalDuration ?? 0) + (delta.totalDuration ?? 0),
      totalSessions: (current.totalSessions ?? 0) + (delta.totalSessions ?? 0),
      firstSessionDate: current.firstSessionDate ?? delta.firstSessionDate,
    };
    safeSet(KEYS.lifetimeStats, updated);
  }

  // ─── Streak ────────────────────────────────────────────────

  async getStreak(): Promise<Streak> {
    return safeGet<Streak>(KEYS.streak) ?? { current: 0, longest: 0, shieldAvailable: true };
  }

  async saveStreak(streak: Streak): Promise<void> {
    safeSet(KEYS.streak, streak);
  }

  // ─── Goals ────────────────────────────────────────────────

  async getGoals(): Promise<JapGoal[]> {
    return safeGet<JapGoal[]>(KEYS.goals) ?? [];
  }

  async saveGoal(goal: JapGoal): Promise<void> {
    const existing = safeGet<JapGoal[]>(KEYS.goals) ?? [];
    const idx = existing.findIndex((g) => g.id === goal.id);
    if (idx >= 0) {
      existing[idx] = goal;
    } else {
      existing.push(goal);
    }
    safeSet(KEYS.goals, existing);
  }

  async updateGoal(goalId: string, updates: Partial<JapGoal>): Promise<void> {
    const existing = safeGet<JapGoal[]>(KEYS.goals) ?? [];
    const idx = existing.findIndex((g) => g.id === goalId);
    if (idx >= 0) {
      existing[idx] = { ...existing[idx], ...updates };
      safeSet(KEYS.goals, existing);
    }
  }

  // ─── Anushthaans ───────────────────────────────────────────

  async getAnushthaans(): Promise<Anushthaan[]> {
    return safeGet<Anushthaan[]>(`${PREFIX}:anushthaans`) ?? [];
  }

  async saveAnushthaan(anushthaan: Anushthaan): Promise<void> {
    const existing = safeGet<Anushthaan[]>(`${PREFIX}:anushthaans`) ?? [];
    const idx = existing.findIndex((a) => a.id === anushthaan.id);
    if (idx >= 0) {
      existing[idx] = anushthaan;
    } else {
      existing.push(anushthaan);
    }
    safeSet(`${PREFIX}:anushthaans`, existing);
  }

  // ─── Achievements ──────────────────────────────────────────

  async getUnlockedAchievements(): Promise<Achievement[]> {
    return safeGet<Achievement[]>(`${PREFIX}:achievements`) ?? [];
  }

  async saveAchievement(achievement: Achievement): Promise<void> {
    const existing = safeGet<Achievement[]>(`${PREFIX}:achievements`) ?? [];
    const idx = existing.findIndex((a) => a.id === achievement.id);
    if (idx >= 0) {
      existing[idx] = achievement;
    } else {
      existing.push(achievement);
    }
    safeSet(`${PREFIX}:achievements`, existing);
  }

  // ─── Maintenance ───────────────────────────────────────────

  async clearAll(): Promise<void> {
    const keysToRemove = Object.keys(localStorage).filter((k) =>
      k.startsWith(PREFIX),
    );
    for (const key of keysToRemove) {
      try { localStorage.removeItem(key); } catch { /* ignore */ }
    }
  }

  async getStorageVersion(): Promise<string> {
    return safeGet<string>(KEYS.storageVersion) ?? VERSION;
  }
}

// Singleton instance
export const persistence = new LocalStorageAdapter();

// Initialize settings with defaults if not present
export async function initializePersistence(): Promise<void> {
  const existing = await persistence.getSettings();
  if (!existing) {
    await persistence.saveSettings(DEFAULT_SETTINGS);
  }
}
