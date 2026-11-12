import { create } from 'zustand';

import { LocalDb } from '../services/native';

export interface TodayActivity {
  date: string;
  steps: number;
  distanceM: number;
  calories: number;
  activeMinutes: number;
}

interface TodayActivityState extends TodayActivity {
  isLoading: boolean;
  error: string | null;
  setActivity: (activity: TodayActivity) => void;
  refresh: () => Promise<void>;
}

const initial: TodayActivity = {
  date: '',
  steps: 0,
  distanceM: 0,
  calories: 0,
  activeMinutes: 0,
};

export const useTodayActivity = create<TodayActivityState>(set => ({
  ...initial,
  isLoading: false,
  error: null,
  setActivity: activity => set({ ...activity, error: null }),
  refresh: async () => {
    set({ isLoading: true, error: null });
    try {
      const row = await LocalDb.getTodayActivity();
      set({
        isLoading: false,
        ...(row
          ? {
              date: row.date,
              steps: row.steps,
              distanceM: row.distanceM,
              calories: row.calories,
              activeMinutes: row.activeMinutes,
            }
          : {}),
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
}));
