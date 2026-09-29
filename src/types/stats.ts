// ============================================================
// Statistics, Streak, Goals & Anushthaan Types
// ============================================================

export interface DailyStats {
  date: string; // YYYY-MM-DD
  count: number;
  malaCount: number;
  sessionCount: number;
  duration: number; // seconds
  mantras: Record<string, number>; // mantraId -> count
  avgJapRate?: number; // jap/minute average
}

export interface LifetimeStats {
  totalCount: number;
  totalMalaCount: number;
  totalDuration: number;
  totalSessions: number;
  firstSessionDate?: string;
  // Personal records
  bestDayCount?: number;
  bestDayDate?: string;
  bestSessionCount?: number;
  fastestJapRate?: number; // jap/min record
}

export interface Streak {
  current: number;
  longest: number;
  lastActiveDate?: string;
  shieldUsedDate?: string; // streak shield grace day used
  shieldAvailable: boolean;
}

export interface GoalType {
  scope: 'session' | 'daily' | 'lifetime';
  target: number;
  mantraId?: string; // undefined = any mantra
}

export interface JapGoal {
  id: string;
  type: GoalType;
  target: number;
  achieved: number;
  createdAt: number;
  completedAt?: number;
  active: boolean;
}

// ─── Anushthaan (challenge) types ─────────────────────────

export type AnushthaanDuration = 40 | 108 | 'custom';

export interface AnushthaanDay {
  date: string;      // YYYY-MM-DD
  count: number;
  completed: boolean; // met daily minimum
  skipped: boolean;
}

export interface Anushthaan {
  id: string;
  name: string;                // e.g. "Ram Naam Jap Anushthaan"
  mantraId: string;
  dailyTarget: number;         // min jap per day
  durationDays: number;        // 40 or 108 or custom
  startDate: string;           // YYYY-MM-DD
  endDate: string;             // YYYY-MM-DD
  sankalp?: string;            // User's sankalp text
  days: AnushthaanDay[];
  completedAt?: string;
  active: boolean;
  createdAt: number;
}

// ─── Achievement / Milestone types ────────────────────────

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: number;
  unlocked: boolean;
}

// Static achievement definitions
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-jap',
    title: 'Pehla Jap',
    description: 'Apna pehla jap kiya!',
    icon: '🙏',
    unlocked: false,
  },
  {
    id: 'mala-1',
    title: 'Ek Mala',
    description: '108 jap ek session mein',
    icon: '📿',
    unlocked: false,
  },
  {
    id: 'mala-10',
    title: 'Dus Mala',
    description: '1,080 total jap',
    icon: '🕉️',
    unlocked: false,
  },
  {
    id: 'mala-100',
    title: 'Sou Mala',
    description: '10,800 total jap',
    icon: '✨',
    unlocked: false,
  },
  {
    id: 'count-1008',
    title: 'Sehstranam',
    description: '1,008 jap ek session mein',
    icon: '🌟',
    unlocked: false,
  },
  {
    id: 'streak-7',
    title: 'Saptah Sadhak',
    description: '7 din lagaataar jap',
    icon: '🔥',
    unlocked: false,
  },
  {
    id: 'streak-21',
    title: 'Ekavisham Dina',
    description: '21 din lagaataar — habit ban gayi!',
    icon: '💫',
    unlocked: false,
  },
  {
    id: 'streak-40',
    title: 'Anushthaan Pooran',
    description: '40 din lagaataar jap',
    icon: '🏆',
    unlocked: false,
  },
  {
    id: 'count-100000',
    title: 'Laksha Naam',
    description: '1,00,000 total jap',
    icon: '👑',
    unlocked: false,
  },
  {
    id: 'anushthaan-complete',
    title: 'Anushthaan Siddh',
    description: 'Pehla anushthaan poora kiya',
    icon: '🪔',
    unlocked: false,
  },
];
