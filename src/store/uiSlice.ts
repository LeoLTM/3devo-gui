import { StateCreator } from 'zustand';

/**
 * UI state and actions
 */
export interface UISlice {
  // State
  showSerialMonitor: boolean;

  // Actions
  setShowSerialMonitor: (show: boolean) => void;
  toggleView: () => void;
}

export const createUISlice: StateCreator<
  UISlice,
  [],
  [],
  UISlice
> = (set) => ({
  // Initial state
  showSerialMonitor: true,

  // Actions
  setShowSerialMonitor: (show) => set({ showSerialMonitor: show }),

  toggleView: () =>
    set((state) => ({ showSerialMonitor: !state.showSerialMonitor })),
});
