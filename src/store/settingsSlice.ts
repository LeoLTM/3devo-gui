import { StateCreator } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { showToast } from '@/lib/utils';

/**
 * Config shape matching the Rust AppConfig struct
 */
export interface AppConfig {
  output_path: string;
}

/**
 * Settings state and actions
 */
export interface SettingsSlice {
  // State
  outputPath: string;
  isLoadingConfig: boolean;

  // Actions
  loadConfig: () => Promise<void>;
  setOutputPath: (path: string) => Promise<void>;
}

export const createSettingsSlice: StateCreator<
  SettingsSlice,
  [],
  [],
  SettingsSlice
> = (set) => ({
  // Initial state
  outputPath: '',
  isLoadingConfig: false,

  // Actions
  loadConfig: async () => {
    set({ isLoadingConfig: true });
    try {
      const config = await invoke<AppConfig>('get_config');
      set({ outputPath: config.output_path });
    } catch (err) {
      console.error('Failed to load config:', err);
      showToast.error('Failed to load settings', String(err));
    } finally {
      set({ isLoadingConfig: false });
    }
  },

  setOutputPath: async (path: string) => {
    try {
      const config = await invoke<AppConfig>('set_output_path', { path });
      set({ outputPath: config.output_path });
      showToast.success('Output folder updated');
    } catch (err) {
      console.error('Failed to save output path:', err);
      showToast.error('Failed to save output folder', String(err));
    }
  },
});
