import { StateCreator } from 'zustand';
import { DataRow } from '@/types/extruder';

const MAX_HISTORICAL_DATA = 500;
const MAX_WARNINGS = 10;

/**
 * Extruder data state and actions
 */
export interface ExtruderDataSlice {
  // State
  initBlock: string;
  header: string;
  currentData: DataRow | null;
  historicalData: DataRow[];
  extruderConnected: boolean;
  parseWarnings: string[];

  // Actions
  setInitBlock: (block: string) => void;
  setHeader: (header: string) => void;
  setCurrentData: (data: DataRow | null) => void;
  addDataRow: (data: DataRow) => void;
  clearHistoricalData: () => void;
  setExtruderConnected: (connected: boolean) => void;
  addParseWarning: (warning: string) => void;
  clearParseWarnings: () => void;
  resetExtruderData: () => void;
}

export const createExtruderDataSlice: StateCreator<
  ExtruderDataSlice,
  [],
  [],
  ExtruderDataSlice
> = (set) => ({
  // Initial state
  initBlock: '',
  header: '',
  currentData: null,
  historicalData: [],
  extruderConnected: false,
  parseWarnings: [],

  // Actions
  setInitBlock: (block) => set({ initBlock: block }),

  setHeader: (header) => set({ header }),

  setCurrentData: (data) => set({ currentData: data }),

  addDataRow: (data) =>
    set((state: ExtruderDataSlice) => {
      // Add to historical data with max buffer size
      const newHistorical = [...state.historicalData, data];
      if (newHistorical.length > MAX_HISTORICAL_DATA) {
        newHistorical.shift(); // Remove oldest entry
      }

      return {
        currentData: data,
        historicalData: newHistorical,
      };
    }),

  clearHistoricalData: () =>
    set({ historicalData: [], currentData: null }),

  setExtruderConnected: (connected) =>
    set({ extruderConnected: connected }),

  addParseWarning: (warning) =>
    set((state: ExtruderDataSlice) => ({
      parseWarnings: [...state.parseWarnings, warning].slice(-MAX_WARNINGS),
    })),

  clearParseWarnings: () => set({ parseWarnings: [] }),

  resetExtruderData: () =>
    set({
      initBlock: '',
      header: '',
      currentData: null,
      historicalData: [],
      extruderConnected: false,
      parseWarnings: [],
    }),
});
