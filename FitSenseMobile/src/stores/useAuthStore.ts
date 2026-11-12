import { create } from 'zustand';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { UserProfile } from '../services/api/types';
import { userApi } from '../services/api/client';

interface AuthState {
  firebaseUser: FirebaseAuthTypes.User | null;
  userProfile: UserProfile | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  setFirebaseUser: (user: FirebaseAuthTypes.User | null) => void;
  setUserProfile: (profile: UserProfile | null) => void;
  fetchProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  firebaseUser: null,
  userProfile: null,
  isLoading: true,
  isInitialized: false,
  error: null,

  setFirebaseUser: (user) => {
    set({
      firebaseUser: user,
      isLoading: false,
      isInitialized: true,
    });
    if (user) {
      get().fetchProfile();
    } else {
      set({ userProfile: null });
    }
  },

  setUserProfile: (profile) => set({ userProfile: profile }),

  fetchProfile: async () => {
    try {
      const profile = await userApi.getMe();
      set({ userProfile: profile, error: null });
    } catch (err: any) {
      console.warn('Failed to fetch user profile:', err);
    }
  },

  signOut: async () => {
    try {
      await auth().signOut();
      set({ firebaseUser: null, userProfile: null, error: null });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  setError: (error) => set({ error }),
}));
