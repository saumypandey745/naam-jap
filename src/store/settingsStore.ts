/**
 * settingsStore.ts
 *
 * Zustand store for user settings.
 */

import { create } from 'zustand';
import { UserSettings, DEFAULT_SETTINGS } from '@/types/settings';
import { persistence } from '@/services/persistence/localStorageAdapter';

interface SettingsState {
  settings: UserSettings;
  isLoading: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  settings: DEFAULT_SETTINGS,
  isLoading: false,

  async loadSettings() {
    set({ isLoading: true });
    try {
      const saved = await persistence.getSettings();
      set({ settings: { ...DEFAULT_SETTINGS, ...(saved ?? {}) } });
    } finally {
      set({ isLoading: false });
    }
  },

  async updateSettings(updates: Partial<UserSettings>) {
    const current = get().settings;
    const updated = { ...current, ...updates };
    set({ settings: updated });
    await persistence.saveSettings(updated);
  },

  async resetSettings() {
    set({ settings: DEFAULT_SETTINGS });
    await persistence.saveSettings(DEFAULT_SETTINGS);
  },
}));
