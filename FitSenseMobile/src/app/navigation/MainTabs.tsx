import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';

import { AnalyticsScreen } from '../../features/analytics/screens/AnalyticsScreen';
import { ExerciseScreen } from '../../features/exercise/screens/ExerciseScreen';
import { GoalsScreen } from '../../features/goals/screens/GoalsScreen';
import { ProfileScreen } from '../../features/profile/screens/ProfileScreen';
import { DashboardScreen } from '../../features/steps-dashboard/screens/DashboardScreen';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ tabBarIcon: () => null }}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Hôm nay' }} />
      <Tab.Screen name="Exercise" component={ExerciseScreen} options={{ title: 'Tập luyện' }} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} options={{ title: 'Thống kê' }} />
      <Tab.Screen name="Goals" component={GoalsScreen} options={{ title: 'Mục tiêu' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Cá nhân' }} />
    </Tab.Navigator>
  );
}
