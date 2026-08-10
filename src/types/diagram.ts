import { DataRow } from '@/types/extruder';

export type MetricCategory = 'temperatures' | 'filament' | 'motors' | 'power';

export interface MetricDefinition {
  key: keyof DataRow;
  label: string;
  category: MetricCategory;
  unit: string;
  defaultColor: string;
  description: string;
  defaultAxis: 'left' | 'right';
}

export interface DiagramSeriesConfig {
  key: keyof DataRow;
  label: string;
  color: string;
  enabled: boolean;
  unit: string;
  axis: 'left' | 'right';
}

export interface DiagramLimitLine {
  id: string;
  label: string;
  value: number;
  color: string;
  lineStyle: 'solid' | 'dashed';
  axis: 'left' | 'right';
  enabled: boolean;
}

export interface DiagramConfig {
  series: DiagramSeriesConfig[];
  limitLines: DiagramLimitLine[];
  timeWindowSeconds: number; // e.g. 30, 60, 120, 300, 0 (0 = all data)
  showGrid: boolean;
  showLegend: boolean;
  tension: number; // 0 for straight lines, 0.3 for smooth curves
}

export const AVAILABLE_METRICS: MetricDefinition[] = [
  // Temperatures
  { key: 'temp1', label: 'Heater 1 Actual', category: 'temperatures', unit: '°C', defaultColor: '#ef4444', description: 'Nozzle heater 1 temperature', defaultAxis: 'left' },
  { key: 'set_t1', label: 'Heater 1 Target', category: 'temperatures', unit: '°C', defaultColor: '#f87171', description: 'Nozzle heater 1 setpoint', defaultAxis: 'left' },
  { key: 'temp2', label: 'Heater 2 Actual', category: 'temperatures', unit: '°C', defaultColor: '#f97316', description: 'Heater 2 temperature', defaultAxis: 'left' },
  { key: 'set_t2', label: 'Heater 2 Target', category: 'temperatures', unit: '°C', defaultColor: '#fb923c', description: 'Heater 2 setpoint', defaultAxis: 'left' },
  { key: 'temp3', label: 'Heater 3 Actual', category: 'temperatures', unit: '°C', defaultColor: '#eab308', description: 'Heater 3 temperature', defaultAxis: 'left' },
  { key: 'set_t3', label: 'Heater 3 Target', category: 'temperatures', unit: '°C', defaultColor: '#fde047', description: 'Heater 3 setpoint', defaultAxis: 'left' },
  { key: 'temp4', label: 'Heater 4 Actual', category: 'temperatures', unit: '°C', defaultColor: '#84cc16', description: 'Heater 4 temperature', defaultAxis: 'left' },
  { key: 'set_t4', label: 'Heater 4 Target', category: 'temperatures', unit: '°C', defaultColor: '#a3e635', description: 'Heater 4 setpoint', defaultAxis: 'left' },
  { key: 'ext_tmp', label: 'Extruder Motor Temp', category: 'temperatures', unit: '°C', defaultColor: '#ec4899', description: 'Extruder motor temperature', defaultAxis: 'left' },
  { key: 'int_t4', label: 'Internal Temp', category: 'temperatures', unit: '°C', defaultColor: '#06b6d4', description: 'Electronics internal temperature', defaultAxis: 'left' },
  { key: 'fs_int_t', label: 'Filament Sensor Temp', category: 'temperatures', unit: '°C', defaultColor: '#14b8a6', description: 'Filament sensor temperature', defaultAxis: 'left' },

  // Filament
  { key: 'ft', label: 'Filament Diameter', category: 'filament', unit: 'mm', defaultColor: '#3b82f6', description: 'Live filament thickness reading', defaultAxis: 'right' },
  { key: 'ft_avg', label: 'Filament Diameter (Avg)', category: 'filament', unit: 'mm', defaultColor: '#60a5fa', description: 'Averaged filament thickness', defaultAxis: 'right' },
  { key: 'sp_dia', label: 'Spool Diameter', category: 'filament', unit: 'mm', defaultColor: '#8b5cf6', description: 'Calculated spool diameter', defaultAxis: 'right' },

  // Motors & Speeds
  { key: 'rpm', label: 'Extruder RPM', category: 'motors', unit: 'RPM', defaultColor: '#10b981', description: 'Extruder motor actual speed', defaultAxis: 'left' },
  { key: 'set_rpm', label: 'Extruder Target RPM', category: 'motors', unit: 'RPM', defaultColor: '#34d399', description: 'Extruder motor setpoint', defaultAxis: 'left' },
  { key: 'puller', label: 'Puller Speed', category: 'motors', unit: '%', defaultColor: '#6366f1', description: 'Puller speed / duty', defaultAxis: 'right' },
  { key: 'pos_spd', label: 'Positioner Speed', category: 'motors', unit: '%', defaultColor: '#a855f7', description: 'Positioner motor speed', defaultAxis: 'right' },
  { key: 'wndr_spd', label: 'Winder Speed', category: 'motors', unit: '%', defaultColor: '#d946ef', description: 'Winder motor speed', defaultAxis: 'right' },

  // Power & Metrics
  { key: 'ext_cur', label: 'Extruder Current', category: 'power', unit: 'mA', defaultColor: '#f43f5e', description: 'Extruder motor current draw', defaultAxis: 'left' },
  { key: 'ext_pwm', label: 'Extruder PWM', category: 'power', unit: '%', defaultColor: '#fb7185', description: 'Extruder motor PWM duty', defaultAxis: 'right' },
  { key: 'dc1', label: 'Heater 1 Duty Cycle', category: 'power', unit: '%', defaultColor: '#fca5a5', description: 'Heater 1 duty cycle percentage', defaultAxis: 'right' },
  { key: 'dc2', label: 'Heater 2 Duty Cycle', category: 'power', unit: '%', defaultColor: '#fdba74', description: 'Heater 2 duty cycle percentage', defaultAxis: 'right' },
  { key: 'dc3', label: 'Heater 3 Duty Cycle', category: 'power', unit: '%', defaultColor: '#fef08a', description: 'Heater 3 duty cycle percentage', defaultAxis: 'right' },
  { key: 'dc4', label: 'Heater 4 Duty Cycle', category: 'power', unit: '%', defaultColor: '#bef264', description: 'Heater 4 duty cycle percentage', defaultAxis: 'right' },
  { key: 'length', label: 'Extruded Length', category: 'power', unit: 'm', defaultColor: '#0284c7', description: 'Total extruded filament length', defaultAxis: 'right' },
  { key: 'volume', label: 'Extruded Volume', category: 'power', unit: 'cm³', defaultColor: '#0ea5e9', description: 'Total extruded filament volume', defaultAxis: 'right' },
  { key: 'sp_fill', label: 'Spool Fill', category: 'power', unit: '%', defaultColor: '#c084fc', description: 'Spool fill percentage', defaultAxis: 'right' },
];

export const DEFAULT_DIAGRAM_CONFIG: DiagramConfig = {
  series: [
    { key: 'temp1', label: 'Heater 1 Actual', color: '#ef4444', enabled: true, unit: '°C', axis: 'left' },
    { key: 'set_t1', label: 'Heater 1 Target', color: '#f87171', enabled: true, unit: '°C', axis: 'left' },
    { key: 'temp2', label: 'Heater 2 Actual', color: '#f97316', enabled: true, unit: '°C', axis: 'left' },
    { key: 'temp3', label: 'Heater 3 Actual', color: '#eab308', enabled: true, unit: '°C', axis: 'left' },
    { key: 'temp4', label: 'Heater 4 Actual', color: '#84cc16', enabled: true, unit: '°C', axis: 'left' },
    { key: 'ft', label: 'Filament Diameter', color: '#3b82f6', enabled: true, unit: 'mm', axis: 'right' },
  ],
  limitLines: [
    { id: 'default-limit-1', label: 'Target Diameter 1.75mm', value: 1.75, color: '#22c55e', lineStyle: 'dashed', axis: 'right', enabled: true },
    { id: 'default-limit-2', label: 'Max Target Temp 220°C', value: 220, color: '#ef4444', lineStyle: 'dashed', axis: 'left', enabled: false },
  ],
  timeWindowSeconds: 60, // Last 60s
  showGrid: true,
  showLegend: true,
  tension: 0.2,
};
