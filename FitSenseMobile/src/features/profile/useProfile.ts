import { useEffect, useState, useCallback } from 'react';
import { doc, getFirestore, onSnapshot } from '@react-native-firebase/firestore';
import { useAuthStore } from '../../stores/useAuthStore';
import { UserProfile } from '../../services/api/types';
import { getMyProfile, updateMyProfile, deleteMyAccount } from './profileApi';

export const useProfile = () => {
  const user = useAuthStore(state => state.user);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getMyProfile();
      setProfile(data);
    } catch (e) {
      console.warn('Failed to fetch profile from API:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    refresh();

    // Subscribe to real-time Firestore snapshot for profile
    try {
      const profileDocRef = doc(getFirestore(), 'users', user.uid, 'profile', 'main');
      const unsubscribe = onSnapshot(
        profileDocRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as any;
            setProfile((prev) => ({
              id: data.id || prev?.id || '',
              email: data.email || user.email || '',
              displayName: data.displayName || user.displayName || null,
              birthDate: data.birthDate || null,
              heightCm: data.heightCm ? Number(data.heightCm) : null,
              weightKg: data.weightKg ? Number(data.weightKg) : null,
              gender: data.gender || null,
              fitnessLevel: data.fitnessLevel || null,
              avatarUrl: data.avatarUrl || null,
              bmi: data.bmi ? Number(data.bmi) : null,
              createdAt: data.createdAt || new Date().toISOString(),
            }));
          }
          setLoading(false);
        },
        (error) => {
          console.warn('Firestore profile snapshot listener error:', error.message);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.warn('Error setting up Firestore snapshot listener:', err);
      return undefined;
    }
  }, [user, refresh]);

  return {
    profile,
    loading,
    refresh,
    updateProfile: updateMyProfile,
    deleteAccount: deleteMyAccount,
  };
};
