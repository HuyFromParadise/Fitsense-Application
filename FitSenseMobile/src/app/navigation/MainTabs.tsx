import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Activity, BarChart3, Target, User, Zap } from 'lucide-react-native';
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../providers/ThemeProvider';
import { AnalyticsScreen } from '../../features/analytics/screens/AnalyticsScreen';
import { ExerciseScreen } from '../../features/exercise/screens/ExerciseScreen';
import { GoalsScreen } from '../../features/goals/screens/GoalsScreen';
import { ProfileScreen } from '../../features/profile/screens/ProfileScreen';
import { DashboardScreen } from '../../features/steps-dashboard/screens/DashboardScreen';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<keyof MainTabParamList, typeof Zap> = {
  Dashboard: Zap,
  Exercise: Activity,
  Analytics: BarChart3,
  Goals: Target,
  Profile: User,
};

const TabBarIcon = memo(function TabBarIcon({
  routeName,
  focused,
  color,
}: {
  routeName: keyof MainTabParamList;
  focused: boolean;
  color: string;
}) {
  const { colors, radius, spacing } = useTheme();
  const IconComponent = TAB_ICONS[routeName];

  return (
    <View
      style={[
        styles.iconPill,
        {
          backgroundColor: focused ? colors.primaryMuted : 'transparent',
          borderRadius: radius.pill,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
        },
      ]}>
      <IconComponent size={24} color={color} strokeWidth={2} />
    </View>
  );
});

export function MainTabs() {
  const { colors, spacing, typography } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
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
          borderTopWidth: StyleSheet.hairlineWidth,
          minHeight: 64,
          paddingTop: spacing.xs,
          paddingBottom: spacing.sm,
        },
        tabBarItemStyle: {
          minHeight: 48,
          paddingVertical: spacing.xs,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabel: ({ focused, color, children }) => (
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            numberOfLines={2}
            style={[
              styles.tabLabel,
              {
                color,
                fontWeight: focused ? '700' : '600',
              },
            ]}>
            {children}
          </Text>
        ),
        tabBarIcon: ({ focused, color }) => (
          <TabBarIcon routeName={route.name} focused={focused} color={color} />
        ),
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

const styles = StyleSheet.create({
  iconPill: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
  },
});
