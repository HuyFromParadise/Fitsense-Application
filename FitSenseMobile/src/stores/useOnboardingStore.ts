import { create } from 'zustand';

import { LocalDb } from '../services/native';

export interface OnboardingState {
  hasCompletedOnboarding: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
}

export const useOnboardingStore = create<OnboardingState>(set => ({
  hasCompletedOnboarding: false,
  hydrated: false,
  hydrate: async () => {
    try {
      const completed = await LocalDb.getOnboardingCompleted?.();
      set({
        hasCompletedOnboarding: Boolean(completed),
        hydrated: true,
      });
    } catch {
      set({ hydrated: true });
    }
  },
  completeOnboarding: async () => {
    set({ hasCompletedOnboarding: true, hydrated: true });
    try {
      await LocalDb.setOnboardingCompleted?.(true);
    } catch {
      // Ignore native persistence errors so user navigation is never blocked
    }
  },
  resetOnboarding: async () => {
    set({ hasCompletedOnboarding: false, hydrated: true });
    try {
      await LocalDb.setOnboardingCompleted?.(false);
    } catch {
      // Ignore native persistence errors
    }
  },
}));

