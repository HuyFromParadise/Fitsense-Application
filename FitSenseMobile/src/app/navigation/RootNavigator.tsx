import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  type Theme as NavigationTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect, useMemo } from 'react';

import {
  AnimatedSplashScreen,
  OnboardingScreen,
} from '../../features/onboarding';
import { SensorMonitorScreen } from '../../features/sensors/screens/SensorMonitorScreen';
import { SyncGate } from '../../features/sync/SyncGate';
import {
  setupExerciseFinishedNotification,
  setupForegroundFcmNotification,
  setupPushTokenSync,
} from '../../features/notifications';
import { notificationApi } from '../../features/notifications/notificationApi';
import { useAuthStore } from '../../stores/useAuthStore';
import { useOnboardingStore } from '../../stores/useOnboardingStore';
import { useTheme } from '../providers/ThemeProvider';
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const initializing = useAuthStore(state => state.initializing);
  const hasCompletedOnboarding = useOnboardingStore(
    state => state.hasCompletedOnboarding,
  );
  const onboardingHydrated = useOnboardingStore(state => state.hydrated);
  const hydrateOnboarding = useOnboardingStore(state => state.hydrate);
  const theme = useTheme();

  useEffect(() => {
    hydrateOnboarding().catch(() => {});
  }, [hydrateOnboarding]);

  const navigationTheme: NavigationTheme = useMemo(() => {
    const base = theme.isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: theme.colors.primary,
        background: theme.colors.background,
        card: theme.colors.surface,
        text: theme.colors.text,
        border: theme.colors.border,
        notification: theme.colors.danger,
      },
    };
  }, [theme]);

  // Setup exercise finished + foreground FCM notification listeners once on mount
  useEffect(() => {
    const cleanExercise = setupExerciseFinishedNotification();
    const cleanForegroundFcm = setupForegroundFcmNotification();
    return () => {
      cleanExercise();
      cleanForegroundFcm();
    };
  }, []);

  // Automatically register device FCM token and listen for token refresh while signed in
  useEffect(() => {
    if (!isAuthenticated) return;
    notificationApi.registerDevice().catch(() => {});
    return setupPushTokenSync();
  }, [isAuthenticated]);

  if (initializing || !onboardingHydrated) {
    return <AnimatedSplashScreen message="Đang kiểm tra đăng nhập..." />;
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <SyncGate />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : !hasCompletedOnboarding ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <Stack.Screen name="Auth" component={AuthStack} />
        )}
        <Stack.Screen
          name="SensorMonitor"
          component={SensorMonitorScreen}
          options={{ headerShown: true, title: 'Sensor Monitor' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
