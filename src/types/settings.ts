// ============================================================
// User Settings Types — Extended
// ============================================================

export type AmbientSound = 'none' | 'temple-bells' | 'river' | 'rain' | 'silence';
export type MalaSize = 27 | 54 | 108 | 1008;
export type FontSizeLevel = 'small' | 'medium' | 'large' | 'xlarge';

export interface DailyReminderSettings {
  enabled: boolean;
  hour: number;    // 0-23
  minute: number;  // 0-59
  label: string;   // e.g. "Brahma Muhurta"
}

export interface UserSettings {
  // Appearance
  theme: 'dark' | 'light' | 'system';
  fontSizeLevel: FontSizeLevel;

  // Jap behavior
  soundEnabled: boolean;
  malaCompletionSoundEnabled: boolean;
  hapticEnabled: boolean;
  autoMalaProgression: boolean;
  malaSize: MalaSize;
  ambientSound: AmbientSound;
  ambientVolume: number;      // 0-1
  keepScreenOn: boolean;      // Screen Wake Lock

  // Voice engine
  recognitionLanguageOverride?: 'hi-IN' | 'en-US' | 'sa-IN' | null;
  maxRepetitionsPerEvent: number;
  duplicateWindowMs: number;
  minimumSimilarityOverride?: number;
  voiceSensitivity: number;   // 0.5-0.95 (min similarity)
  whisperMode: boolean;       // Lower threshold for soft chanting

  // Daily goals
  dailyGoalTarget?: number;   // e.g. 1008 jap per day
  reminderSettings: DailyReminderSettings;

  // Spiritual
  sankalpModeEnabled: boolean;  // Show sankalp before each session
  showDeityImage: boolean;
  showTithiDisplay: boolean;

  // Sharing / cloud
  cloudSyncEnabled: boolean;
  firebaseUserId?: string;

  // Developer
  showDebugPage: boolean;
}

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  fontSizeLevel: 'medium',

  soundEnabled: false,
  malaCompletionSoundEnabled: true,
  hapticEnabled: false,
  autoMalaProgression: true,
  malaSize: 108,
  ambientSound: 'none',
  ambientVolume: 0.5,
  keepScreenOn: true,

  recognitionLanguageOverride: null,
  maxRepetitionsPerEvent: 20,
  duplicateWindowMs: 1500,
  minimumSimilarityOverride: undefined,
  voiceSensitivity: 0.72,
  whisperMode: false,

  dailyGoalTarget: undefined,
  reminderSettings: {
    enabled: false,
    hour: 5,
    minute: 0,
    label: 'Brahma Muhurta',
  },

  sankalpModeEnabled: false,
  showDeityImage: true,
  showTithiDisplay: true,

  cloudSyncEnabled: false,
  firebaseUserId: undefined,

  showDebugPage: false,
};
