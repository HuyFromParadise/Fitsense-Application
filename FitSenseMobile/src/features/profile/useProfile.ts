import { useEffect, useState } from 'react';
import firestore from '@react-native-firebase/firestore';
import { useAuthStore } from '../../stores/useAuthStore';
import { UserProfile } from '../../services/api/types';

export const useProfile = () => {
  const { firebaseUser, userProfile: storeProfile, fetchProfile } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(storeProfile);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!firebaseUser) {
      setProfile(null);
      setLoading(false);
      return;
    }

    // Subscribe to real-time Firestore snapshot for profile
    const unsubscribe = firestore()
      .collection('users')
      .doc(firebaseUser.uid)
      .collection('profile')
      .doc('main')
      .onSnapshot(
        (doc) => {
          if (doc.exists) {
            const data = doc.data() as any;
            setProfile((prev) => ({
              id: data.id || prev?.id || '',
              email: data.email || firebaseUser.email || '',
              displayName: data.displayName || firebaseUser.displayName || null,
              birthDate: data.birthDate || null,
              heightCm: data.heightCm ? Number(data.heightCm) : null,
              weightKg: data.weightKg ? Number(data.weightKg) : null,
              gender: data.gender || null,
              fitnessLevel: data.fitnessLevel || null,
              avatarUrl: data.avatarUrl || null,
              bmi: data.bmi ? Number(data.bmi) : null,
              createdAt: data.createdAt || new Date().toISOString(),
            }));
          } else {
            // Fallback to MySQL API cached profile
            setProfile(storeProfile);
          }
          setLoading(false);
        },
        (error) => {
          console.warn('Firestore profile snapshot listener error:', error.message);
          // Fallback to MySQL cached profile if Firestore fails
          setProfile(storeProfile);
          setLoading(false);
        }
      );

    return () => unsubscribe();
  }, [firebaseUser, storeProfile]);

  return {
    profile,
    loading,
    refresh: fetchProfile,
  };
};
