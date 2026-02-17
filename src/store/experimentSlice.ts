import { StateCreator } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { showToast } from '@/lib/utils';
import type { ExtruderDataSlice } from './extruderDataSlice';
import type { TeableSlice } from './teableSlice';

/**
 * Form data collected from the user before starting an experiment
 */
export interface ExperimentFormData {
  experimentName: string;
  sourceMaterialId: string;
  fanPercent: number;
  setDiameter: number; // 1.75 or 2.85
  nozzleDiameter: number; // 2, 3, or 4 mm
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
 * Pending stop data saved internally so the update can be retried
 * if the network was unavailable when the user first stopped.
 */
export interface PendingStopData {
  recordId: string;
  fields: Record<string, unknown>;
  durationFormatted: string;
  filamentWeight: number;
}

/**
 * Experiment lifecycle state and actions
 */
export interface ExperimentSlice {
  // State
  experimentStatus: 'idle' | 'running' | 'stop-failed';
  experimentRecordId: string | null;
  experimentStartTime: number | null;
  experimentStartVolume: number | null;
  experimentDensity: number | null;
  experimentName: string | null;
  logFilePath: string | null;
  isExperimentLoading: boolean;
  pendingStopData: PendingStopData | null;

  // Actions
  setLogFilePath: (path: string | null) => void;
  startExperiment: (formData: ExperimentFormData) => Promise<void>;
  stopExperiment: () => Promise<void>;
  retryStopExperiment: () => Promise<void>;
  discardPendingStop: () => void;
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
  experimentName: null,
  logFilePath: null,
  isExperimentLoading: false,
  pendingStopData: null,

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
        'Experiment Name': formData.experimentName,
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
        'Nozzle Diameter': formData.nozzleDiameter,
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
        experimentName: formData.experimentName,
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

    if ((state.experimentStatus !== 'running') || !state.experimentRecordId) {
      showToast.warning('No experiment running');
      return;
    }

    set({ isExperimentLoading: true });

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
    const filamentWeight = Math.round(volumeDelta * density * 1000) / 1000;

    const updateFields: Record<string, unknown> = {
      'Duration': durationFormatted,
      'Filament Weight': filamentWeight,
    };

    // Filter out empty values
    const filteredFields = Object.fromEntries(
      Object.entries(updateFields).filter(([, v]) => v !== '' && v !== undefined)
    );

    // Save pending stop data so we can retry if the API call fails
    const pending: PendingStopData = {
      recordId: state.experimentRecordId,
      fields: filteredFields,
      durationFormatted,
      filamentWeight,
    };

    set({ pendingStopData: pending });

    try {
      await invoke('update_teable_record', {
        recordId: pending.recordId,
        fields: pending.fields,
      });

      set({
        experimentStatus: 'idle',
        experimentRecordId: null,
        experimentStartTime: null,
        experimentStartVolume: null,
        experimentDensity: null,
        experimentName: null,
        isExperimentLoading: false,
        pendingStopData: null,
      });

      showToast.success(
        'Experiment stopped',
        `Duration: ${durationFormatted} · Weight: ${filamentWeight.toFixed(3)} g — Row updated in Teable.`
      );
    } catch (err) {
      // Transition to stop-failed so the timer stops but the retry is available
      set({
        experimentStatus: 'stop-failed',
        isExperimentLoading: false,
      });
      console.error('Failed to stop experiment:', err);
      showToast.error(
        'Failed to update Teable row',
        'Experiment data is saved locally. You can retry the update when network is available.'
      );
    }
  },

  retryStopExperiment: async () => {
    const state = get();
    const pending = state.pendingStopData;

    if (!pending) {
      showToast.warning('No pending experiment data to retry');
      return;
    }

    set({ isExperimentLoading: true });

    try {
      await invoke('update_teable_record', {
        recordId: pending.recordId,
        fields: pending.fields,
      });

      set({
        experimentStatus: 'idle',
        experimentRecordId: null,
        experimentStartTime: null,
        experimentStartVolume: null,
        experimentDensity: null,
        experimentName: null,
        isExperimentLoading: false,
        pendingStopData: null,
      });

      showToast.success(
        'Experiment data saved',
        `Duration: ${pending.durationFormatted} · Weight: ${pending.filamentWeight.toFixed(3)} g — Row updated in Teable.`
      );
    } catch (err) {
      set({ isExperimentLoading: false });
      console.error('Retry failed:', err);
      showToast.error('Retry failed', String(err));
    }
  },

  discardPendingStop: () => {
    set({
      experimentStatus: 'idle',
      experimentRecordId: null,
      experimentStartTime: null,
      experimentStartVolume: null,
      experimentDensity: null,
      experimentName: null,
      isExperimentLoading: false,
      pendingStopData: null,
    });
    showToast.info('Pending experiment data discarded');
  },
});
