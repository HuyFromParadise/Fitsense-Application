import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
import React, { useEffect } from 'react';

import { syncProfileToBackend } from '../../features/profile/profileApi';
import { useAuthStore } from '../../stores/useAuthStore';

/**
 * Bridges the Firebase session into useAuthStore so navigation and the API client
 * see a logged-in user on cold start and after login/logout.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(
    () =>
      onAuthStateChanged(getAuth(), async user => {
        const { setSession, clearSession } = useAuthStore.getState();
        if (!user) {
          clearSession();
          return;
        }
        const token = await user.getIdToken();
        setSession(token, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
        });
        // Firebase login does not touch MySQL; the backend creates/updates the
        // row on the first authenticated /api/users/me request.
        void syncProfileToBackend(user);
      }),
    [],
  );

  return <>{children}</>;
}
