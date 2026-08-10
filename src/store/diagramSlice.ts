import { StateCreator } from 'zustand';
import {
  DiagramConfig,
  DiagramLimitLine,
  DiagramSeriesConfig,
  DEFAULT_DIAGRAM_CONFIG,
  AVAILABLE_METRICS,
} from '@/types/diagram';
import { DataRow } from '@/types/extruder';

const STORAGE_KEY = '3devo_diagram_config_v1';

// Load initial config from localStorage or fallback to defaults
function loadInitialDiagramConfig(): DiagramConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DIAGRAM_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_DIAGRAM_CONFIG,
      ...parsed,
      // Ensure arrays are present
      series: Array.isArray(parsed.series) ? parsed.series : DEFAULT_DIAGRAM_CONFIG.series,
      limitLines: Array.isArray(parsed.limitLines) ? parsed.limitLines : DEFAULT_DIAGRAM_CONFIG.limitLines,
    };
  } catch (err) {
    console.error('Failed to load diagram config from localStorage:', err);
    return DEFAULT_DIAGRAM_CONFIG;
  }
}

// Persist config to localStorage
function saveDiagramConfig(config: DiagramConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('Failed to save diagram config to localStorage:', err);
  }
}

export interface DiagramSlice {
  diagramConfig: DiagramConfig;
  isDiagramPaused: boolean;

  // Actions
  toggleSeries: (key: keyof DataRow) => void;
  addOrUpdateSeries: (series: DiagramSeriesConfig) => void;
  updateSeries: (key: keyof DataRow, updates: Partial<DiagramSeriesConfig>) => void;
  removeSeries: (key: keyof DataRow) => void;
  addLimitLine: (line: Omit<DiagramLimitLine, 'id'>) => void;
  updateLimitLine: (id: string, updates: Partial<DiagramLimitLine>) => void;
  removeLimitLine: (id: string) => void;
  setTimeWindowSeconds: (seconds: number) => void;
  setShowGrid: (show: boolean) => void;
  setShowLegend: (show: boolean) => void;
  setTension: (tension: number) => void;
  toggleDiagramPause: () => void;
  resetDiagramConfig: () => void;
}

export const createDiagramSlice: StateCreator<
  DiagramSlice,
  [],
  [],
  DiagramSlice
> = (set) => ({
  diagramConfig: loadInitialDiagramConfig(),
  isDiagramPaused: false,

  toggleSeries: (key) =>
    set((state) => {
      const existing = state.diagramConfig.series.find((s) => s.key === key);
      let newSeries: DiagramSeriesConfig[];
      if (existing) {
        newSeries = state.diagramConfig.series.map((s) =>
          s.key === key ? { ...s, enabled: !s.enabled } : s
        );
      } else {
        const metricDef = AVAILABLE_METRICS.find((m) => m.key === key);
        if (!metricDef) return state;
        newSeries = [
          ...state.diagramConfig.series,
          {
            key,
            label: metricDef.label,
            color: metricDef.defaultColor,
            enabled: true,
            unit: metricDef.unit,
            axis: metricDef.defaultAxis,
          },
        ];
      }
      const newConfig = { ...state.diagramConfig, series: newSeries };
      saveDiagramConfig(newConfig);
      return { diagramConfig: newConfig };
    }),

  addOrUpdateSeries: (series) =>
    set((state) => {
      const index = state.diagramConfig.series.findIndex((s) => s.key === series.key);
      let newSeries: DiagramSeriesConfig[];
      if (index >= 0) {
        newSeries = [...state.diagramConfig.series];
        newSeries[index] = series;
      } else {
        newSeries = [...state.diagramConfig.series, series];
      }
      const newConfig = { ...state.diagramConfig, series: newSeries };
      saveDiagramConfig(newConfig);
      return { diagramConfig: newConfig };
    }),

  updateSeries: (key, updates) =>
    set((state) => {
      const newSeries = state.diagramConfig.series.map((s) =>
        s.key === key ? { ...s, ...updates } : s
      );
      const newConfig = { ...state.diagramConfig, series: newSeries };
      saveDiagramConfig(newConfig);
      return { diagramConfig: newConfig };
    }),

  removeSeries: (key) =>
    set((state) => {
      const newSeries = state.diagramConfig.series.filter((s) => s.key !== key);
      const newConfig = { ...state.diagramConfig, series: newSeries };
      saveDiagramConfig(newConfig);
      return { diagramConfig: newConfig };
    }),

  addLimitLine: (line) =>
    set((state) => {
      const newLine: DiagramLimitLine = {
        ...line,
        id: `limit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      };
      const newLimitLines = [...state.diagramConfig.limitLines, newLine];
      const newConfig = { ...state.diagramConfig, limitLines: newLimitLines };
      saveDiagramConfig(newConfig);
      return { diagramConfig: newConfig };
    }),

  updateLimitLine: (id, updates) =>
    set((state) => {
      const newLimitLines = state.diagramConfig.limitLines.map((l) =>
        l.id === id ? { ...l, ...updates } : l
      );
      const newConfig = { ...state.diagramConfig, limitLines: newLimitLines };
      saveDiagramConfig(newConfig);
      return { diagramConfig: newConfig };
    }),

  removeLimitLine: (id) =>
    set((state) => {
      const newLimitLines = state.diagramConfig.limitLines.filter((l) => l.id !== id);
      const newConfig = { ...state.diagramConfig, limitLines: newLimitLines };
      saveDiagramConfig(newConfig);
      return { diagramConfig: newConfig };
    }),

  setTimeWindowSeconds: (seconds) =>
    set((state) => {
      const newConfig = { ...state.diagramConfig, timeWindowSeconds: seconds };
      saveDiagramConfig(newConfig);
      return { diagramConfig: newConfig };
    }),

  setShowGrid: (show) =>
    set((state) => {
      const newConfig = { ...state.diagramConfig, showGrid: show };
      saveDiagramConfig(newConfig);
      return { diagramConfig: newConfig };
    }),

  setShowLegend: (show) =>
    set((state) => {
      const newConfig = { ...state.diagramConfig, showLegend: show };
      saveDiagramConfig(newConfig);
      return { diagramConfig: newConfig };
    }),

  setTension: (tension) =>
    set((state) => {
      const newConfig = { ...state.diagramConfig, tension };
      saveDiagramConfig(newConfig);
      return { diagramConfig: newConfig };
    }),

  toggleDiagramPause: () =>
    set((state) => ({ isDiagramPaused: !state.isDiagramPaused })),

  resetDiagramConfig: () =>
    set(() => {
      saveDiagramConfig(DEFAULT_DIAGRAM_CONFIG);
      return { diagramConfig: DEFAULT_DIAGRAM_CONFIG };
    }),
});
