import { StateCreator } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { showToast } from '@/lib/utils';
import type { ExtruderDataSlice } from './extruderDataSlice';

/**
 * Connection state enum for state machine
 */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'disconnecting';

/**
 * Port information from the serial port scan
 */
export interface PortInfo {
  port_name: string;
  port_type: string;
  // USB device information (optional, only present for USB ports)
  vendor_id?: number;
  product_id?: number;
  manufacturer?: string;
  product?: string;
  serial_number?: string;
}

/**
 * Serial connection state and actions
 */
export interface SerialSlice {
  // State
  ports: PortInfo[];
  selectedPort: string;
  baudRate: string;
  connectionState: ConnectionState;
  serialData: string[];
  error: string;
  unlistenFunctions: UnlistenFn[];
  listenersRegistered: boolean;

  // Actions
  setPorts: (ports: PortInfo[]) => void;
  setSelectedPort: (port: string) => void;
  setBaudRate: (rate: string) => void;
  setConnectionState: (state: ConnectionState) => void;
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
  connectionState: 'disconnected',
  serialData: [],
  error: '',
  unlistenFunctions: [],
  listenersRegistered: false,

  // Actions
  setPorts: (ports) => set({ ports }),
  
  setSelectedPort: (port) => set({ selectedPort: port }),
  
  setBaudRate: (rate) => set({ baudRate: rate }),
  
  setConnectionState: (connectionState) => set({ connectionState }),
  
  addSerialData: (data) =>
    set((state: SerialSlice) => ({ serialData: [...state.serialData, data] })),
  
  clearSerialData: () => set({ serialData: [] }),
  
  setError: (error) => set({ error }),

  loadPorts: async () => {
    try {
      const availablePorts = await invoke<PortInfo[]>('list_serial_ports');
      set({ ports: availablePorts });
    } catch (err) {
      const message = `Failed to load ports: ${err}`;
      set({ error: message });
      showToast.error('Port Loading Failed', message);
    }
  },

  connect: async () => {
    const { selectedPort, baudRate, connectionState, setupListeners } = get();
    
    // Guard: prevent duplicate operations
    if (connectionState === 'connecting' || connectionState === 'connected') {
      showToast.warning('Already Connected', 'Connection is already active or in progress');
      return;
    }
    
    if (!selectedPort) {
      const message = 'Please select a port';
      set({ error: message });
      showToast.error('No Port Selected', message);
      return;
    }

    try {
      set({ error: '', serialData: [], connectionState: 'connecting' });
      
      await invoke('connect_serial_port', {
        portName: selectedPort,
        baudRate: parseInt(baudRate),
      });
      
      set({ connectionState: 'connected' });
      
      // Setup event listeners
      await setupListeners();
      
      showToast.connected(selectedPort);
    } catch (err) {
      const message = `Connection failed: ${err}`;
      set({ error: message, connectionState: 'disconnected' });
      showToast.connectionError(err);
    }
  },

  disconnect: async () => {
    const { connectionState, cleanupListeners } = get();
    
    // Guard: prevent duplicate operations
    if (connectionState === 'disconnecting' || connectionState === 'disconnected') {
      return;
    }

    try {
      set({ connectionState: 'disconnecting' });
      
      // Cleanup listeners first
      await cleanupListeners();
      
      await invoke('disconnect_serial_port');
      
      set({ connectionState: 'disconnected', selectedPort: '' });
      showToast.disconnected();
    } catch (err) {
      const message = `Disconnect failed: ${err}`;
      set({ error: message, connectionState: 'disconnected' });
      showToast.error('Disconnect Error', message);
    }
  },

  sendWakeup: async () => {
    try {
      set({ error: '' });
      await invoke('send_wakeup');
    } catch (err) {
      const message = `Wakeup failed: ${err}`;
      set({ error: message });
      showToast.error('Wakeup Failed', message);
    }
  },

  setupListeners: async () => {
    // Guard: prevent duplicate listener registration
    if (get().listenersRegistered) {
      console.warn('Listeners already registered, skipping setup');
      return;
    }
    
    const unlistenFns: UnlistenFn[] = [];

    try {
      // Listen for serial data (raw)
      const unlistenData = await listen<string>('serial-data', (event) => {
        try {
          get().addSerialData(event.payload);
        } catch (err) {
          console.error('Error handling serial-data event:', err);
        }
      });
      unlistenFns.push(unlistenData);

      // Listen for serial errors
      const unlistenError = await listen<string>('serial-error', (event) => {
        try {
          set({ error: event.payload, connectionState: 'disconnected' });
          const state = get();
          if ('setExtruderConnected' in state) {
            state.setExtruderConnected(false);
          }
          showToast.error('Serial Error', event.payload);
        } catch (err) {
          console.error('Error handling serial-error event:', err);
        }
      });
      unlistenFns.push(unlistenError);

      // Listen for disconnect events from backend
      const unlistenDisconnect = await listen<string>('serial-disconnected', (event) => {
        try {
          console.log('Backend disconnected:', event.payload);
          // Trigger frontend disconnect to sync state
          get().disconnect();
          showToast.connectionLost();
        } catch (err) {
          console.error('Error handling serial-disconnected event:', err);
        }
      });
      unlistenFns.push(unlistenDisconnect);

      // Listen for init block
      const unlistenInitBlock = await listen<string>('init-block', (event) => {
        try {
          const state = get();
          if ('setInitBlock' in state) {
            state.setInitBlock(event.payload);
          }
        } catch (err) {
          console.error('Error handling init-block event:', err);
        }
      });
      unlistenFns.push(unlistenInitBlock);

      // Listen for header detection
      const unlistenHeader = await listen<string>('header-detected', (event) => {
        try {
          const state = get();
          if ('setHeader' in state) {
            state.setHeader(event.payload);
          }
        } catch (err) {
          console.error('Error handling header-detected event:', err);
        }
      });
      unlistenFns.push(unlistenHeader);

      // Listen for parsed data rows
      const unlistenDataRow = await listen('data-row', (event) => {
        try {
          const state = get();
          if ('addDataRow' in state) {
            // Validate payload before passing (basic check)
            if (event.payload && typeof event.payload === 'object') {
              state.addDataRow(event.payload as any);
            }
          }
        } catch (err) {
          console.error('Error handling data-row event:', err);
          showToast.warning('Data Parse Error', 'Failed to process incoming data row');
        }
      });
      unlistenFns.push(unlistenDataRow);

      // Listen for parse warnings
      const unlistenWarning = await listen<string>('parse-warning', (event) => {
        try {
          const state = get();
          if ('addParseWarning' in state) {
            state.addParseWarning(event.payload);
          }
        } catch (err) {
          console.error('Error handling parse-warning event:', err);
        }
      });
      unlistenFns.push(unlistenWarning);

      set({ unlistenFunctions: unlistenFns, listenersRegistered: true });
    } catch (err) {
      // If setup fails, cleanup any registered listeners
      console.error('Failed to setup listeners:', err);
      for (const fn of unlistenFns) {
        try {
          fn();
        } catch (cleanupErr) {
          console.error('Error during listener cleanup:', cleanupErr);
        }
      }
      showToast.error('Listener Setup Failed', String(err));
      throw err;
    }
  },

  cleanupListeners: async () => {
    const { unlistenFunctions } = get();
    
    // Execute all unlisten functions
    await Promise.all(
      unlistenFunctions.map(async (fn: UnlistenFn) => {
        try {
          fn();
        } catch (err) {
          console.error('Error cleaning up listener:', err);
        }
      })
    );
    
    set({ unlistenFunctions: [], listenersRegistered: false });
  },
});

/**
 * Selector functions for computed values
 */
export const selectIsConnected = (state: SerialSlice) => 
  state.connectionState === 'connected';

export const selectIsOperationInProgress = (state: SerialSlice) => 
  state.connectionState === 'connecting' || state.connectionState === 'disconnecting';
