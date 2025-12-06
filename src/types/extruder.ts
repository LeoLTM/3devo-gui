/**
 * Type definitions for filament extruder data
 * These interfaces match the Rust structs for proper serialization/deserialization
 */

export type SystemStatus = 
  | 'IDLE' 
  | 'HOMING' 
  | 'HEATING' 
  | 'PREPARED' 
  | 'RUNNING' 
  | 'ERROR' 
  | { Unknown: string };

/**
 * Represents a single row of data from the filament extruder
 * All 27 data fields as defined in the spec
 */
export interface DataRow {
  // Time
  time: number;

  // Heater 1
  set_t1: number;
  temp1: number;
  dc1: number;
  err1: number;

  // Heater 2
  set_t2: number;
  temp2: number;
  dc2: number;
  err2: number;

  // Heater 3
  set_t3: number;
  temp3: number;
  dc3: number;
  err3: number;

  // Heater 4
  set_t4: number;
  temp4: number;
  dc4: number;
  err4: number;

  // Internal temperature
  int_t4: number;

  // Extruder motor
  ext_cur: number;
  ext_pwm: number;
  ext_tmp: number;

  // Unused
  unused: number;

  // Motor status
  fault: number;
  set_rpm: number;
  rpm: number;

  // Filament
  ft: number;
  ft_avg: number;

  // Puller
  puller: number;

  // Memory
  mem_free: number;

  // Status
  status: SystemStatus;

  // Winder and positioner
  wndr_spd: number;
  pos_spd: number;

  // Length and volume
  length: number;
  volume: number;

  // Spool
  sp_dia: number;
  sp_fill: number;

  // Filament sensor
  fs_int_t: number;
}

/**
 * Overall state of the extruder data
 */
export interface ExtruderState {
  // Init block (raw text from device startup)
  initBlock: string;
  
  // Header line
  header: string;
  
  // Current (latest) data values
  currentData: DataRow | null;
  
  // Historical data buffer (max 500 points)
  historicalData: DataRow[];
  
  // Connection status
  isConnected: boolean;
  
  // Parse warnings/errors
  parseWarnings: string[];
}

/**
 * Helper function to get a display-friendly status string
 */
export function getStatusDisplay(status: SystemStatus): string {
  if (typeof status === 'string') {
    return status;
  }
  return status.Unknown || 'UNKNOWN';
}

/**
 * Helper function to check if fault is active
 */
export function isFaultActive(data: DataRow | null): boolean {
  return data?.fault === 1;
}

/**
 * Helper function to format temperature with unit
 */
export function formatTemperature(temp: number): string {
  return `${temp.toFixed(2)}°C`;
}

/**
 * Helper function to format diameter with unit
 */
export function formatDiameter(diameter: number): string {
  return `${diameter.toFixed(3)} mm`;
}

/**
 * Helper function to format percentage
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Helper function to format RPM
 */
export function formatRPM(rpm: number): string {
  return `${Math.round(rpm)} RPM`;
}
