/**
 * persistence/adapter.ts
 *
 * Abstract persistence adapter interface.
 * Phase 1: LocalStorageAdapter
 * Future: ApiAdapter
 *
 * All application logic must use this interface —
 * never call localStorage directly from stores.
 */

import { JapSession, ActiveSession } from '@/types/session';
import { DailyStats, LifetimeStats, Streak, JapGoal, Anushthaan, Achievement } from '@/types/stats';
import { MantraConfig } from '@/types/mantra';
import { UserSettings } from '@/types/settings';

export interface PersistenceAdapter {
  // Settings
  getSettings(): Promise<UserSettings | null>;
  saveSettings(settings: UserSettings): Promise<void>;

  // Mantras (custom)
  getCustomMantras(): Promise<MantraConfig[]>;
  saveCustomMantra(mantra: MantraConfig): Promise<void>;
  deleteCustomMantra(id: string): Promise<void>;

  // Active session (survives reload)
  getActiveSession(): Promise<ActiveSession | null>;
  saveActiveSession(session: ActiveSession | null): Promise<void>;

  // Session history
  getSessions(limit?: number): Promise<JapSession[]>;
  saveSession(session: JapSession): Promise<void>;
  updateSession(sessionId: string, updates: Partial<JapSession>): Promise<void>;

  // Daily stats
  getDailyStats(date: string): Promise<DailyStats | null>;
  saveDailyStats(stats: DailyStats): Promise<void>;
  getDailyStatsRange(startDate: string, endDate: string): Promise<DailyStats[]>;

  // Lifetime stats
  getLifetimeStats(): Promise<LifetimeStats>;
  updateLifetimeStats(delta: Partial<LifetimeStats>): Promise<void>;

  // Streak
  getStreak(): Promise<Streak>;
  saveStreak(streak: Streak): Promise<void>;

  // Goals
  getGoals(): Promise<JapGoal[]>;
  saveGoal(goal: JapGoal): Promise<void>;
  updateGoal(goalId: string, updates: Partial<JapGoal>): Promise<void>;

  // Anushthaans
  getAnushthaans?(): Promise<Anushthaan[]>;
  saveAnushthaan?(anushthaan: Anushthaan): Promise<void>;

  // Achievements
  getUnlockedAchievements?(): Promise<Achievement[]>;
  saveAchievement?(achievement: Achievement): Promise<void>;

  // Cleanup / migrations
  clearAll(): Promise<void>;
  getStorageVersion(): Promise<string>;
}
