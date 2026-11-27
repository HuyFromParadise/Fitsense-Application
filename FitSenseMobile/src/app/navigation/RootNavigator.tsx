import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  type Theme as NavigationTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';

import {
  setupExerciseFinishedNotification,
  setupForegroundFcmNotification,
  setupPushTokenSync,
} from '../../features/notifications';
import { notificationApi } from '../../features/notifications/notificationApi';
import { AnimatedSplashScreen } from '../../features/onboarding';
import { SensorMonitorScreen } from '../../features/sensors/screens/SensorMonitorScreen';
import { SyncGate } from '../../features/sync/SyncGate';
import { useAuthStore } from '../../stores/useAuthStore';
import { useTheme } from '../providers/ThemeProvider';
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const SPLASH_DURATION_MS = 1000;
const SPLASH_EXIT_MS = 380;

export function RootNavigator() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const initializing = useAuthStore(state => state.initializing);
  const [splashDone, setSplashDone] = useState(false);
  const [splashDismissed, setSplashDismissed] = useState(false);
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const splashScale = useRef(new Animated.Value(1)).current;
  const theme = useTheme();

  useEffect(() => {
    const timer = setTimeout(() => {
      setSplashDone(true);
    }, SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  const isReady = !initializing && splashDone;

  useEffect(() => {
    if (!isReady || splashDismissed) return;
    let active = true;
    let exitAnim: Animated.CompositeAnimation | null = null;

    AccessibilityInfo.isReduceMotionEnabled()
      .then(reduceMotion => {
        if (!active) return;
        if (reduceMotion) {
          setSplashDismissed(true);
          return;
        }
        exitAnim = Animated.parallel([
          Animated.timing(splashOpacity, {
            toValue: 0,
            duration: SPLASH_EXIT_MS,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(splashScale, {
            toValue: 1.04,
            duration: SPLASH_EXIT_MS,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]);
        exitAnim.start(({ finished }) => {
          if (active && finished) {
            setSplashDismissed(true);
          }
        });
      })
      .catch(() => {
        if (active) {
          setSplashDismissed(true);
        }
      });

    return () => {
      active = false;
      exitAnim?.stop();
    };
  }, [isReady, splashDismissed, splashOpacity, splashScale]);

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

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      {!initializing ? (
        <NavigationContainer theme={navigationTheme}>
          <SyncGate />
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              animation: 'fade',
            }}>
            {isAuthenticated ? (
              <Stack.Screen name="Main" component={MainTabs} />
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
      ) : null}

      {!splashDismissed ? (
        <Animated.View
          pointerEvents={isReady ? 'none' : 'auto'}
          style={[
            StyleSheet.absoluteFill,
            styles.splashOverlay,
            {
              opacity: splashOpacity,
              transform: [{ scale: splashScale }],
            },
          ]}>
          <AnimatedSplashScreen message="Đang kiểm tra đăng nhập..." />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  splashOverlay: {
    zIndex: 10,
  },
});
