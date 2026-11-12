import { getAuth, signOut as firebaseSignOut } from '@react-native-firebase/auth';
import { create } from 'zustand';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** True until Firebase reports the persisted session (first onAuthStateChanged). */
  initializing: boolean;
  setSession: (token: string, user: AuthUser) => void;
  clearSession: () => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>(set => ({
  token: null,
  user: null,
  isAuthenticated: false,
  initializing: true,
  setSession: (token, user) =>
    set({ token, user, isAuthenticated: true, initializing: false }),
  clearSession: () =>
    set({ token: null, user: null, isAuthenticated: false, initializing: false }),
  signOut: async () => {
    await firebaseSignOut(getAuth());
    set({ token: null, user: null, isAuthenticated: false, initializing: false });
  },
}));
