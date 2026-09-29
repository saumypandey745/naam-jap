// ============================================================
// Session & Jap Event Types
// ============================================================

export type JapMode = 'voice' | 'manual';

export interface JapEvent {
  id: string;
  sessionId: string;
  mantraId: string;
  repetitions: number;
  transcript: string;
  timestamp: number;
  mode: JapMode;
  correction?: boolean;
}

export interface JapSession {
  id: string;
  mantraId: string;
  mantraDisplayName: string;
  mode: JapMode;
  startedAt: number;
  endedAt?: number;
  count: number;
  malaCount: number;
  duration?: number; // seconds
  goalId?: string;
  correctionOffset: number; // sum of manual corrections applied post-session
}

export interface ActiveSession {
  sessionId: string;
  mantraId: string;
  startedAt: number;
  count: number;
  malaCount: number;
  currentMalaProgress: number; // 0-107
  mode: JapMode;
  isPaused: boolean;
  goalId?: string;
}
