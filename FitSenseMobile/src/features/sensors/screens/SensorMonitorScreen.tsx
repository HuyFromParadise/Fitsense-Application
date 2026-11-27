import React from 'react';
import { ScrollView, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../../app/providers/ThemeProvider';
import { MotionSensorTelemetry } from '../components/MotionSensorTelemetry';
import { SensorStepCard } from '../components/SensorStepCard';

export function SensorMonitorScreen() {
  const { colors, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      contentContainerStyle={{
        padding: spacing.lg,
        paddingBottom: Math.max(insets.bottom, spacing.lg),
        gap: spacing.lg,
      }}
      style={{ backgroundColor: colors.background }}>
      <Text style={[typography.heading, { color: colors.text }]}>
        Sensor Monitor
      </Text>

      <MotionSensorTelemetry />

      <SensorStepCard />

      <Text style={[typography.caption, { color: colors.textMuted }]}>
        Phân loại chuyển động là ước tính từ ngưỡng độ lệch chuẩn, chỉ dùng để kiểm tra cảm biến.
      </Text>
    </ScrollView>
  );
}
