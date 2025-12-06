import { StateCreator } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import type { ExtruderDataSlice } from './extruderDataSlice';

/**
 * Port information from the serial port scan
 */
export interface PortInfo {
  port_name: string;
  port_type: string;
}

/**
 * Serial connection state and actions
 */
export interface SerialSlice {
  // State
  ports: PortInfo[];
  selectedPort: string;
  baudRate: string;
  isConnected: boolean;
  serialData: string[];
  error: string;
  unlistenFunctions: UnlistenFn[];

  // Actions
  setPorts: (ports: PortInfo[]) => void;
  setSelectedPort: (port: string) => void;
  setBaudRate: (rate: string) => void;
  setIsConnected: (connected: boolean) => void;
  addSerialData: (data: string) => void;
  clearSerialData: () => void;
  setError: (error: string) => void;
  loadPorts: () => Promise<void>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  sendWakeup: () => Promise<void>;
  setupListeners: () => Promise<void>;
  cleanupListeners: () => Promise<void>;
}

export const createSerialSlice: StateCreator<
  SerialSlice & ExtruderDataSlice,
  [],
  [],
  SerialSlice
> = (set, get) => ({
  // Initial state
  ports: [],
  selectedPort: '',
  baudRate: '115200',
  isConnected: false,
  serialData: [],
  error: '',
  unlistenFunctions: [],

  // Actions
  setPorts: (ports) => set({ ports }),
  
  setSelectedPort: (port) => set({ selectedPort: port }),
  
  setBaudRate: (rate) => set({ baudRate: rate }),
  
  setIsConnected: (connected) => set({ isConnected: connected }),
  
  addSerialData: (data) =>
    set((state: SerialSlice) => ({ serialData: [...state.serialData, data] })),
  
  clearSerialData: () => set({ serialData: [] }),
  
  setError: (error) => set({ error }),

  loadPorts: async () => {
    try {
      const availablePorts = await invoke<PortInfo[]>('list_serial_ports');
      set({ ports: availablePorts });
      
      const { selectedPort } = get();
      if (availablePorts.length > 0 && !selectedPort) {
        set({ selectedPort: availablePorts[0].port_name });
      }
    } catch (err) {
      set({ error: `Failed to load ports: ${err}` });
    }
  },

  connect: async () => {
    const { selectedPort, baudRate, setupListeners } = get();
    
    if (!selectedPort) {
      set({ error: 'Please select a port' });
      return;
    }

    try {
      set({ error: '', serialData: [] });
      await invoke('connect_serial_port', {
        portName: selectedPort,
        baudRate: parseInt(baudRate),
      });
      set({ isConnected: true });
      
      // Setup event listeners
      await setupListeners();
    } catch (err) {
      set({ error: `Connection failed: ${err}` });
    }
  },

  disconnect: async () => {
    try {
      await invoke('disconnect_serial_port');
      set({ isConnected: false });
      
      // Cleanup listeners
      const { cleanupListeners } = get();
      await cleanupListeners();
    } catch (err) {
      set({ error: `Disconnect failed: ${err}` });
    }
  },

  sendWakeup: async () => {
    try {
      set({ error: '' });
      await invoke('send_wakeup');
    } catch (err) {
      set({ error: `Wakeup failed: ${err}` });
    }
  },

  setupListeners: async () => {
    const unlistenFns: UnlistenFn[] = [];

    // Listen for serial data (raw)
    const unlistenData = await listen<string>('serial-data', (event) => {
      get().addSerialData(event.payload);
    });
    unlistenFns.push(unlistenData);

    // Listen for serial errors
    const unlistenError = await listen<string>('serial-error', (event) => {
      set({ error: event.payload, isConnected: false });
      const state = get();
      if ('setExtruderConnected' in state) {
        state.setExtruderConnected(false);
      }
    });
    unlistenFns.push(unlistenError);

    // Listen for init block
    const unlistenInitBlock = await listen<string>('init-block', (event) => {
      const state = get();
      if ('setInitBlock' in state) {
        state.setInitBlock(event.payload);
      }
    });
    unlistenFns.push(unlistenInitBlock);

    // Listen for header detection
    const unlistenHeader = await listen<string>('header-detected', (event) => {
      const state = get();
      if ('setHeader' in state) {
        state.setHeader(event.payload);
      }
    });
    unlistenFns.push(unlistenHeader);

    // Listen for parsed data rows
    const unlistenDataRow = await listen('data-row', (event) => {
      const state = get();
      if ('addDataRow' in state) {
        state.addDataRow(event.payload as any);
      }
    });
    unlistenFns.push(unlistenDataRow);

    // Listen for parse warnings
    const unlistenWarning = await listen<string>('parse-warning', (event) => {
      const state = get();
      if ('addParseWarning' in state) {
        state.addParseWarning(event.payload);
      }
    });
    unlistenFns.push(unlistenWarning);

    set({ unlistenFunctions: unlistenFns });
  },

  cleanupListeners: async () => {
    const { unlistenFunctions } = get();
    unlistenFunctions.forEach((fn: UnlistenFn) => fn());
    set({ unlistenFunctions: [] });
  },
});
