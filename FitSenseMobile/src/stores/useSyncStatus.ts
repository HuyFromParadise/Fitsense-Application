import { create } from 'zustand';

interface SyncStatusState {
  pending: number;
  syncing: boolean;
  lastSyncAtMs: number | null;
  // shortcut: chỉ giữ trong RAM — sau restart item FAILED vẫn hiện "chờ đồng bộ" nhưng mất lý do; persist khi có AsyncStorage.
  lastError: string | null;
  setStatus: (status: Partial<Omit<SyncStatusState, 'setStatus' | 'reset'>>) => void;
  reset: () => void;
}

const initial = {
  pending: 0,
  syncing: false,
  lastSyncAtMs: null,
  lastError: null,
};

export const useSyncStatus = create<SyncStatusState>(set => ({
  ...initial,
  setStatus: status => set(status),
  reset: () => set(initial),
}));
