import { create } from "zustand";

import type { Settings } from "@/types/models";
import { DEFAULT_SETTINGS } from "@/types/models";

type SettingsStore = Settings & {
  hydrated: boolean;
  hydrate: (settings: Settings) => void;
  patch: (partial: Partial<Settings>) => void;
  setSelectedVehicleId: (id: string | null) => void;
};

export const useSettingsStore = create<SettingsStore>((set) => ({
  ...DEFAULT_SETTINGS,
  hydrated: false,
  hydrate: (settings) => set({ ...settings, hydrated: true }),
  patch: (partial) => set((state) => ({ ...state, ...partial })),
  setSelectedVehicleId: (selectedVehicleId) => set({ selectedVehicleId }),
}));
