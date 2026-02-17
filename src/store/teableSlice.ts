import { StateCreator } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { showToast } from '@/lib/utils';

/**
 * User info returned by the Teable API
 */
export interface TeableUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

/**
 * Teable integration state and actions
 */
export interface TeableSlice {
  // State
  teableUrl: string | null;
  teableUserName: string | null;
  teableUserEmail: string | null;
  teableUserAvatar: string | null;
  isTeableConnected: boolean;
  isTeableLoading: boolean;
  teableSpaceId: string | null;
  teableBaseId: string | null;
  teableTableId: string | null;

  // Actions
  loadTeableConfig: () => Promise<void>;
  testTeableConnection: (url: string, token: string) => Promise<TeableUser>;
  saveTeableConfig: (
    url: string,
    token: string,
    userName: string,
    userEmail: string,
    userAvatar: string | null,
  ) => Promise<void>;
  removeTeableConfig: () => Promise<void>;
  saveTeableTarget: (spaceId: string, baseId: string, tableId: string) => Promise<void>;
}

interface AppConfig {
  output_path: string;
  teable_url?: string | null;
  teable_token?: string | null;
  teable_user_name?: string | null;
  teable_user_email?: string | null;
  teable_user_avatar?: string | null;
  teable_space_id?: string | null;
  teable_base_id?: string | null;
  teable_table_id?: string | null;
}

export const createTeableSlice: StateCreator<
  TeableSlice,
  [],
  [],
  TeableSlice
> = (set) => ({
  // Initial state
  teableUrl: null,
  teableUserName: null,
  teableUserEmail: null,
  teableUserAvatar: null,
  isTeableConnected: false,
  isTeableLoading: false,
  teableSpaceId: null,
  teableBaseId: null,
  teableTableId: null,

  // Actions
  loadTeableConfig: async () => {
    try {
      const config = await invoke<AppConfig>('get_config');
      const connected = !!(config.teable_url && config.teable_token);
      set({
        teableUrl: config.teable_url ?? null,
        teableUserName: config.teable_user_name ?? null,
        teableUserEmail: config.teable_user_email ?? null,
        teableUserAvatar: config.teable_user_avatar ?? null,
        isTeableConnected: connected,
        teableSpaceId: config.teable_space_id ?? null,
        teableBaseId: config.teable_base_id ?? null,
        teableTableId: config.teable_table_id ?? null,
      });
    } catch (err) {
      console.error('Failed to load Teable config:', err);
    }
  },

  testTeableConnection: async (url: string, token: string) => {
    set({ isTeableLoading: true });
    try {
      const user = await invoke<TeableUser>('test_teable_connection', {
        url,
        token,
      });
      return user;
    } finally {
      set({ isTeableLoading: false });
    }
  },

  saveTeableConfig: async (
    url: string,
    token: string,
    userName: string,
    userEmail: string,
    userAvatar: string | null,
  ) => {
    try {
      await invoke('save_teable_config', {
        url,
        token,
        userName,
        userEmail,
        userAvatar,
      });
      set({
        teableUrl: url,
        teableUserName: userName,
        teableUserEmail: userEmail,
        teableUserAvatar: userAvatar,
        isTeableConnected: true,
      });
      showToast.success('Teable integration connected');
    } catch (err) {
      console.error('Failed to save Teable config:', err);
      showToast.error('Failed to save Teable config', String(err));
      throw err;
    }
  },

  removeTeableConfig: async () => {
    try {
      await invoke('remove_teable_config');
      set({
        teableUrl: null,
        teableUserName: null,
        teableUserEmail: null,
        teableUserAvatar: null,
        isTeableConnected: false,
        teableSpaceId: null,
        teableBaseId: null,
        teableTableId: null,
      });
      showToast.success('Teable integration removed');
    } catch (err) {
      console.error('Failed to remove Teable config:', err);
      showToast.error('Failed to remove Teable config', String(err));
    }
  },

  saveTeableTarget: async (spaceId: string, baseId: string, tableId: string) => {
    try {
      await invoke('save_teable_target', {
        spaceId,
        baseId,
        tableId,
      });
      set({
        teableSpaceId: spaceId,
        teableBaseId: baseId,
        teableTableId: tableId,
      });
      showToast.success('Teable target table saved');
    } catch (err) {
      console.error('Failed to save Teable target:', err);
      showToast.error('Failed to save Teable target', String(err));
      throw err;
    }
  },
});
