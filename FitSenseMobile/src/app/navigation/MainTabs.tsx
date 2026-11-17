import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Text } from 'react-native';

import { useTheme } from '../providers/ThemeProvider';
import { AnalyticsScreen } from '../../features/analytics/screens/AnalyticsScreen';
import { ExerciseScreen } from '../../features/exercise/screens/ExerciseScreen';
import { GoalsScreen } from '../../features/goals/screens/GoalsScreen';
import { ProfileScreen } from '../../features/profile/screens/ProfileScreen';
import { DashboardScreen } from '../../features/steps-dashboard/screens/DashboardScreen';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  const { colors, typography } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: {
          backgroundColor: colors.surface,
          shadowColor: 'transparent',
          elevation: 0,
        },
        headerTitleStyle: {
          ...typography.title,
          color: colors.text,
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarIcon: ({ focused }) => {
          let icon = '⚡';
          if (route.name === 'Dashboard') icon = '⚡';
          else if (route.name === 'Exercise') icon = '🏃';
          else if (route.name === 'Analytics') icon = '📊';
          else if (route.name === 'Goals') icon = '🎯';
          else if (route.name === 'Profile') icon = '👤';
          return (
            <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.6 }}>
              {icon}
            </Text>
          );
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Hôm nay' }} />
      <Tab.Screen name="Exercise" component={ExerciseScreen} options={{ title: 'Tập luyện', headerShown: false }} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} options={{ title: 'Thống kê' }} />
      <Tab.Screen name="Goals" component={GoalsScreen} options={{ title: 'Mục tiêu' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Cá nhân' }} />
    </Tab.Navigator>
  );
}
