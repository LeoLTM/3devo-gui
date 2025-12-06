import { create } from 'zustand';
import { createSerialSlice, SerialSlice } from './serialSlice';
import { createExtruderDataSlice, ExtruderDataSlice } from '@/store/extruderDataSlice';
import { createUISlice, UISlice } from '@/store/uiSlice';

/**
 * Combined store type with all slices
 */
export type StoreState = SerialSlice & ExtruderDataSlice & UISlice;

/**
 * Main Zustand store combining all slices
 */
export const useStore = create<StoreState>()((...a) => ({
  ...createSerialSlice(...a),
  ...createExtruderDataSlice(...a),
  ...createUISlice(...a),
}));
