import { StateCreator } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { showToast } from '@/lib/utils';
import type { ExtruderDataSlice } from './extruderDataSlice';
import type { TeableSlice } from './teableSlice';

/**
 * Form data collected from the user before starting an experiment
 */
export interface ExperimentFormData {
  sourceMaterialId: string;
  fanPercent: number;
  setDiameter: number; // 1.75 or 2.85
  density: number; // g/cm³, for weight calculation
  color: string;
  manufacturingLocation: string;
  notes: string;
}

/**
 * Response from creating/updating a Teable record
 */
interface TeableRecord {
  id: string;
  fields: Record<string, unknown>;
}

/**
 * Experiment lifecycle state and actions
 */
export interface ExperimentSlice {
  // State
  experimentStatus: 'idle' | 'running';
  experimentRecordId: string | null;
  experimentStartTime: number | null;
  experimentStartVolume: number | null;
  experimentDensity: number | null;
  logFilePath: string | null;
  isExperimentLoading: boolean;

  // Actions
  setLogFilePath: (path: string | null) => void;
  startExperiment: (formData: ExperimentFormData) => Promise<void>;
  stopExperiment: () => Promise<void>;
}

type ExperimentDeps = ExperimentSlice & ExtruderDataSlice & TeableSlice;

export const createExperimentSlice: StateCreator<
  ExperimentDeps,
  [],
  [],
  ExperimentSlice
> = (set, get) => ({
  // Initial state
  experimentStatus: 'idle',
  experimentRecordId: null,
  experimentStartTime: null,
  experimentStartVolume: null,
  experimentDensity: null,
  logFilePath: null,
  isExperimentLoading: false,

  // Actions
  setLogFilePath: (path) => set({ logFilePath: path }),

  startExperiment: async (formData: ExperimentFormData) => {
    const state = get();

    // Validate Teable is configured
    if (!state.isTeableConnected) {
      showToast.error('Teable not connected', 'Please configure Teable integration in Settings first.');
      throw new Error('Teable not connected');
    }

    if (!state.teableTableId) {
      showToast.error('No table selected', 'Please select a target table in Settings first.');
      throw new Error('No table selected');
    }

    set({ isExperimentLoading: true });

    try {
      // Ensure all required fields exist in the target table
      const createdFields = await invoke<string[]>('ensure_teable_fields');
      if (createdFields.length > 0) {
        showToast.info(
          'Table fields configured',
          `Created ${createdFields.length} missing field(s): ${createdFields.join(', ')}`
        );
      }

      // Gather auto-captured data from current extruder state
      const currentData = state.currentData;
      const now = new Date();

      const fields: Record<string, unknown> = {
        'Created At': now.toISOString(),
        'Operator': state.teableUserName || 'Unknown',
        'Source Material ID': formData.sourceMaterialId,
        'Set RPM': currentData?.set_rpm ?? 0,
        'Set T4': currentData?.set_t4 ?? 0,
        'Set T3': currentData?.set_t3 ?? 0,
        'Set T2': currentData?.set_t2 ?? 0,
        'Set T1': currentData?.set_t1 ?? 0,
        'Fan Percent': formData.fanPercent,
        'Set Diameter': formData.setDiameter,
        'Color': formData.color,
        'Manufacturing Location': formData.manufacturingLocation,
        'Notes': formData.notes,
      };

      // Filter out empty string values to avoid creating blank fields
      const filteredFields = Object.fromEntries(
        Object.entries(fields).filter(([, v]) => v !== '' && v !== undefined)
      );

      const record = await invoke<TeableRecord>('create_teable_record', {
        fields: filteredFields,
      });

      set({
        experimentStatus: 'running',
        experimentRecordId: record.id,
        experimentStartTime: Date.now(),
        experimentStartVolume: currentData?.volume ?? 0,
        experimentDensity: formData.density,
        isExperimentLoading: false,
      });

      showToast.success('Experiment started', 'Row created in Teable. Recording data...');
    } catch (err) {
      set({ isExperimentLoading: false });
      console.error('Failed to start experiment:', err);
      showToast.error('Failed to start experiment', String(err));
      throw err;
    }
  },

  stopExperiment: async () => {
    const state = get();

    if (state.experimentStatus !== 'running' || !state.experimentRecordId) {
      showToast.warning('No experiment running');
      return;
    }

    set({ isExperimentLoading: true });

    try {
      // Calculate duration in seconds
      const durationSeconds = state.experimentStartTime
        ? Math.round((Date.now() - state.experimentStartTime) / 1000)
        : 0;

      // Format duration as HH:MM:SS
      const hours = Math.floor(durationSeconds / 3600);
      const minutes = Math.floor((durationSeconds % 3600) / 60);
      const seconds = durationSeconds % 60;
      const durationFormatted = `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

      // Calculate filament weight = (volume_end - volume_start) * density
      const currentData = state.currentData;
      const endVolume = currentData?.volume ?? 0;
      const startVolume = state.experimentStartVolume ?? 0;
      const volumeDelta = Math.max(0, endVolume - startVolume);
      const density = state.experimentDensity ?? 0;
      const filamentWeight = volumeDelta * density;

      // Extract experiment name from log file path (just the filename)
      let experimentName = '';
      if (state.logFilePath) {
        const parts = state.logFilePath.replace(/\\/g, '/').split('/');
        experimentName = parts[parts.length - 1] || '';
      }

      const fields: Record<string, unknown> = {
        'Duration': durationFormatted,
        'Filament Weight': Math.round(filamentWeight * 1000) / 1000, // 3 decimal places
        'Experiment Name': experimentName,
      };

      // Filter out empty values
      const filteredFields = Object.fromEntries(
        Object.entries(fields).filter(([, v]) => v !== '' && v !== undefined)
      );

      await invoke('update_teable_record', {
        recordId: state.experimentRecordId,
        fields: filteredFields,
      });

      set({
        experimentStatus: 'idle',
        experimentRecordId: null,
        experimentStartTime: null,
        experimentStartVolume: null,
        experimentDensity: null,
        isExperimentLoading: false,
      });

      showToast.success(
        'Experiment stopped',
        `Duration: ${durationFormatted} — Row updated in Teable.`
      );
    } catch (err) {
      set({ isExperimentLoading: false });
      console.error('Failed to stop experiment:', err);
      showToast.error('Failed to stop experiment', String(err));
      throw err;
    }
  },
});
