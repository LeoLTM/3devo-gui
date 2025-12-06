import { StateCreator } from 'zustand';

/**
 * Available pages in the application
 */
export type PageType = 'dashboard' | 'serial-monitor' | 'analytics' | 'settings';

/**
 * UI state and actions
 */
export interface UISlice {
  // State
  activePage: PageType;
  isSerialDrawerOpen: boolean;

  // Actions
  setActivePage: (page: PageType) => void;
  setSerialDrawerOpen: (open: boolean) => void;
  toggleSerialDrawer: () => void;
}

export const createUISlice: StateCreator<
  UISlice,
  [],
  [],
  UISlice
> = (set) => ({
  // Initial state
  activePage: 'dashboard',
  isSerialDrawerOpen: false,

  // Actions
  setActivePage: (page) => set({ activePage: page }),

  setSerialDrawerOpen: (open) => set({ isSerialDrawerOpen: open }),

  toggleSerialDrawer: () =>
    set((state) => ({ isSerialDrawerOpen: !state.isSerialDrawerOpen })),
});
