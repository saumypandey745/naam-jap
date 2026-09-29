/**
 * mantraStore.ts
 *
 * Zustand store for mantra selection and custom mantras.
 */

import { create } from 'zustand';
import { MantraConfig, CustomMantraInput, SupportedLanguage } from '@/types/mantra';
import { PRESET_MANTRAS } from '@/features/mantra/mantraData';
import { persistence } from '@/services/persistence/localStorageAdapter';
import { normalizeText } from '@/utils/normalize';

function generateMantraId(): string {
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Build a MantraConfig from user input.
 * Derives normalizedForms automatically.
 */
function buildCustomMantraConfig(input: CustomMantraInput): MantraConfig {
  const id = generateMantraId();
  const normalized = normalizeText(input.originalScript);

  const aliases = input.aliases?.map((a) => normalizeText(a)) ?? [];

  return {
    id,
    displayName: input.displayName,
    originalScript: input.originalScript,
    language: input.language,
    normalizedForms: [normalized, ...aliases],
    aliases: input.aliases ?? [],
    minimumSimilarity: 0.72,
    duplicateWindowMs: 1500,
    isCustom: true,
  };
}

interface MantraState {
  selectedMantra: MantraConfig | null;
  customMantras: MantraConfig[];
  isLoading: boolean;

  getAllMantras: () => MantraConfig[];
  selectMantra: (mantra: MantraConfig) => void;
  createCustomMantra: (input: CustomMantraInput) => Promise<MantraConfig>;
  deleteCustomMantra: (id: string) => Promise<void>;
  loadCustomMantras: () => Promise<void>;
  getMantraById: (id: string) => MantraConfig | null;
}

export const useMantraStore = create<MantraState>()((set, get) => ({
  selectedMantra: null,
  customMantras: [],
  isLoading: false,

  getAllMantras(): MantraConfig[] {
    return [...PRESET_MANTRAS, ...get().customMantras];
  },

  selectMantra(mantra: MantraConfig) {
    set({ selectedMantra: mantra });
  },

  async createCustomMantra(input: CustomMantraInput): Promise<MantraConfig> {
    const config = buildCustomMantraConfig(input);
    await persistence.saveCustomMantra(config);
    set((state) => ({ customMantras: [...state.customMantras, config] }));
    return config;
  },

  async deleteCustomMantra(id: string): Promise<void> {
    await persistence.deleteCustomMantra(id);
    set((state) => ({
      customMantras: state.customMantras.filter((m) => m.id !== id),
      selectedMantra:
        state.selectedMantra?.id === id ? null : state.selectedMantra,
    }));
  },

  async loadCustomMantras(): Promise<void> {
    set({ isLoading: true });
    try {
      const custom = await persistence.getCustomMantras();
      set({ customMantras: custom });
    } finally {
      set({ isLoading: false });
    }
  },

  getMantraById(id: string): MantraConfig | null {
    const all = [...PRESET_MANTRAS, ...get().customMantras];
    return all.find((m) => m.id === id) ?? null;
  },
}));
