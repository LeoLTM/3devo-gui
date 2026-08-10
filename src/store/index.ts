import { create } from 'zustand';
import { createSerialSlice, SerialSlice } from './serialSlice';
import { createExtruderDataSlice, ExtruderDataSlice } from '@/store/extruderDataSlice';
import { createUISlice, UISlice } from '@/store/uiSlice';
import { createSettingsSlice, SettingsSlice } from '@/store/settingsSlice';
import { createTeableSlice, TeableSlice } from '@/store/teableSlice';
import { createExperimentSlice, ExperimentSlice } from '@/store/experimentSlice';
import { createDiagramSlice, DiagramSlice } from '@/store/diagramSlice';

/**
 * Combined store type with all slices
 */
export type StoreState = SerialSlice &
  ExtruderDataSlice &
  UISlice &
  SettingsSlice &
  TeableSlice &
  ExperimentSlice &
  DiagramSlice;

/**
 * Main Zustand store combining all slices
 */
export const useStore = create<StoreState>()((...a) => ({
  ...createSerialSlice(...a),
  ...createExtruderDataSlice(...a),
  ...createUISlice(...a),
  ...createSettingsSlice(...a),
  ...createTeableSlice(...a),
  ...createExperimentSlice(...a),
  ...createDiagramSlice(...a),
}));

