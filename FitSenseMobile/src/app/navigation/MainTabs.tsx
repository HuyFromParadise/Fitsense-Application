import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from './types';
import { ProfileScreen } from '../../features/profile';
import { ExerciseNavigator } from '../../features/exercise';
import { AnalyticsScreen } from '../../features/analytics';
import { TabPlaceholderScreen } from '../../components/common/TabPlaceholderScreen';
import { colors } from '../../theme';

const Tab = createBottomTabNavigator<MainTabParamList>();

const DashboardPlaceholder = () => (
  <TabPlaceholderScreen
    title="Dashboard & Bước chân"
    subtitle="Theo dõi số bước hôm nay, lượng calo, quãng đường và thời gian vận động tích cực."
    icon="👟"
    owner="B"
  />
);

const GoalsPlaceholder = () => (
  <TabPlaceholderScreen
    title="Mục tiêu Thể dục"
    subtitle="Thiết lập mục tiêu bước chân, calo và theo dõi tỷ lệ hoàn thành."
    icon="🎯"
    owner="B"
  />
);

export const MainTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.text,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardPlaceholder}
        options={{
          title: 'Tổng quan',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🏠</Text>,
        }}
      />
      <Tab.Screen
        name="Exercise"
        component={ExerciseNavigator}
        options={{
          title: 'Bài tập',
          headerShown: false,
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🏃</Text>,
        }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          title: 'Thống kê',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>📊</Text>,
        }}
      />
      <Tab.Screen
        name="Goals"
        component={GoalsPlaceholder}
        options={{
          title: 'Mục tiêu',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🎯</Text>,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Hồ sơ',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
};
