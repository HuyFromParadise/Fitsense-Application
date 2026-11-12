import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import auth from '@react-native-firebase/auth';
import { RootStackParamList } from './types';
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';
import { useAuthStore } from '../../stores/useAuthStore';
import { Loading } from '../../components/common';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const { firebaseUser, isInitialized, setFirebaseUser } = useAuthStore();

  useEffect(() => {
    const subscriber = auth().onAuthStateChanged((user) => {
      setFirebaseUser(user);
    });
    return subscriber; // unsubscribe on unmount
  }, [setFirebaseUser]);

  if (!isInitialized) {
    return <Loading message="Đang khởi tạo FitSense..." />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {firebaseUser ? (
        <Stack.Screen name="Main" component={MainTabs} />
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}
    </Stack.Navigator>
  );
};
