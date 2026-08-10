import { StateCreator } from 'zustand';

/**
 * Available pages in the application
 */
export type PageType = 'dashboard' | 'diagram' | 'serial-monitor' | 'analytics' | 'settings';

/**
 * UI state and actions
 */
export interface UISlice {
  // State
  activePage: PageType;
  isSerialDrawerOpen: boolean;
  autoScroll: boolean;

  // Actions
  setActivePage: (page: PageType) => void;
  setSerialDrawerOpen: (open: boolean) => void;
  toggleSerialDrawer: () => void;
  setAutoScroll: (autoScroll: boolean) => void;
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
  autoScroll: true,

  // Actions
  setActivePage: (page) => set({ activePage: page }),

  setSerialDrawerOpen: (open) => set({ isSerialDrawerOpen: open }),

  toggleSerialDrawer: () =>
    set((state) => ({ isSerialDrawerOpen: !state.isSerialDrawerOpen })),

  setAutoScroll: (autoScroll) => set({ autoScroll }),
});
