/**
 * sessionStore.ts
 *
 * Zustand store for active Jap session state.
 * This is the "source of truth" for the counter during an active session.
 *
 * Persistence: Active session is written to localStorage on every count
 * (debounced) so the counter survives accidental refresh.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { ActiveSession, JapSession, JapMode } from '@/types/session';
import { JapDetectedEvent } from '@/types/voice';
import { persistence } from '@/services/persistence/localStorageAdapter';
import { getTodayKey } from '@/utils/normalize';

const MALA_SIZE = 108;
let persistDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let currentMantraDisplayName = '';

interface SessionState {
  activeSession: ActiveSession | null;
  isLoading: boolean;

  // Lifecycle
  startSession: (mantraId: string, mantraDisplayName: string, mode: JapMode, goalId?: string) => string;
  pauseSession: () => void;
  resumeSession: () => void;
  endSession: () => Promise<JapSession | null>;

  // Counting
  handleJapDetected: (event: JapDetectedEvent) => void;
  adjustCount: (delta: number) => void; // manual correction (+1/-1)

  // Recovery
  loadActiveSession: () => Promise<void>;
  clearActiveSession: () => Promise<void>;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function schedulePersist(session: ActiveSession | null): void {
  if (persistDebounceTimer !== null) clearTimeout(persistDebounceTimer);
  persistDebounceTimer = setTimeout(() => {
    persistence.saveActiveSession(session).catch(() => {/* ignore */});
  }, 300);
}

export const useSessionStore = create<SessionState>()(
  subscribeWithSelector((set, get) => ({
    activeSession: null,
    isLoading: false,

    startSession(mantraId, mantraDisplayName, mode, goalId): string {
      const sessionId = generateId();
      const session: ActiveSession = {
        sessionId,
        mantraId,
        startedAt: Date.now(),
        count: 0,
        malaCount: 0,
        currentMalaProgress: 0,
        mode,
        isPaused: false,
        goalId,
      };
      // mantraDisplayName is stored in closure for use in endSession
      currentMantraDisplayName = mantraDisplayName;
      set({ activeSession: session });
      schedulePersist(session);
      return sessionId;
    },

    pauseSession() {
      const { activeSession } = get();
      if (!activeSession) return;
      const updated = { ...activeSession, isPaused: true };
      set({ activeSession: updated });
      schedulePersist(updated);
    },

    resumeSession() {
      const { activeSession } = get();
      if (!activeSession) return;
      const updated = { ...activeSession, isPaused: false };
      set({ activeSession: updated });
      schedulePersist(updated);
    },

    handleJapDetected(event: JapDetectedEvent) {
      const { activeSession } = get();
      if (!activeSession || activeSession.isPaused) return;

      const added = event.repetitions;
      const newCount = activeSession.count + added;
      const newMalaProgress = (activeSession.currentMalaProgress + added) % MALA_SIZE;
      const newMalaCount =
        activeSession.malaCount +
        Math.floor((activeSession.currentMalaProgress + added) / MALA_SIZE);

      const updated: ActiveSession = {
        ...activeSession,
        count: newCount,
        currentMalaProgress: newMalaProgress,
        malaCount: newMalaCount,
      };

      set({ activeSession: updated });
      schedulePersist(updated);

      // Update daily stats (debounced within persistence layer)
      updateDailyStats(activeSession.mantraId, added).catch(() => {/* ignore */});
    },

    adjustCount(delta: number) {
      const { activeSession } = get();
      if (!activeSession) return;
      const newCount = Math.max(0, activeSession.count + delta);
      const newMalaProgress = newCount % MALA_SIZE;
      const newMalaCount = Math.floor(newCount / MALA_SIZE);
      const updated: ActiveSession = {
        ...activeSession,
        count: newCount,
        currentMalaProgress: newMalaProgress,
        malaCount: newMalaCount,
      };
      set({ activeSession: updated });
      schedulePersist(updated);
    },

    async endSession(): Promise<JapSession | null> {
      const { activeSession } = get();
      if (!activeSession) return null;

      const now = Date.now();
      const duration = Math.floor((now - activeSession.startedAt) / 1000);

      const session: JapSession = {
        id: activeSession.sessionId,
        mantraId: activeSession.mantraId,
        mantraDisplayName: currentMantraDisplayName,
        mode: activeSession.mode,
        startedAt: activeSession.startedAt,
        endedAt: now,
        count: activeSession.count,
        malaCount: activeSession.malaCount,
        duration,
        goalId: activeSession.goalId,
        correctionOffset: 0,
      };

      await persistence.saveSession(session);
      await persistence.saveActiveSession(null);
      await persistence.updateLifetimeStats({
        totalCount: session.count,
        totalMalaCount: session.malaCount,
        totalDuration: duration,
        totalSessions: 1,
        firstSessionDate: getTodayKey(),
      });

      set({ activeSession: null });
      return session;
    },

    async loadActiveSession() {
      set({ isLoading: true });
      try {
        const saved = await persistence.getActiveSession();
        if (saved) {
          set({ activeSession: saved });
        }
      } catch {
        // Corrupted — start fresh
      } finally {
        set({ isLoading: false });
      }
    },

    async clearActiveSession() {
      await persistence.saveActiveSession(null);
      set({ activeSession: null });
    },
  })),
);

// ─── Helper: update today's daily stats ───────────────────

async function updateDailyStats(mantraId: string, added: number): Promise<void> {
  const today = getTodayKey();
  const existing = await persistence.getDailyStats(today);
  const stats = existing ?? {
    date: today,
    count: 0,
    malaCount: 0,
    sessionCount: 0,
    duration: 0,
    mantras: {},
  };
  stats.count += added;
  stats.mantras[mantraId] = (stats.mantras[mantraId] ?? 0) + added;
  await persistence.saveDailyStats(stats);
}
