import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ExerciseTrackingScreen } from './ExerciseTrackingScreen';
import { ExerciseHistoryScreen } from './ExerciseHistoryScreen';
import { ExerciseDetailScreen } from './ExerciseDetailScreen';
import { colors } from '../../theme';

export type ExerciseStackParamList = {
  ExerciseTracking: undefined;
  ExerciseHistory: undefined;
  ExerciseDetail: {
    exerciseId: string;
    fallbackSummary?: any;
  };
};

const Stack = createNativeStackNavigator<ExerciseStackParamList>();

export const ExerciseNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="ExerciseTracking"
        component={ExerciseTrackingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ExerciseHistory"
        component={ExerciseHistoryScreen}
        options={{ title: 'Lịch sử bài tập' }}
      />
      <Stack.Screen
        name="ExerciseDetail"
        component={ExerciseDetailScreen}
        options={{ title: 'Chi tiết lộ trình' }}
      />
    </Stack.Navigator>
  );
};
