import React from 'react';
import { ScrollView, Text } from 'react-native';

import { useTheme } from '../../../app/providers/ThemeProvider';
import { Card, EmptyState } from '../../../components/common';

export function AnalyticsScreen() {
  const { colors, spacing, typography } = useTheme();

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      <Text style={[typography.heading, { color: colors.text }]}>Thống kê</Text>
      <Card>
        <EmptyState
          title="Chưa triển khai (F3)"
          message="Màn placeholder. Biểu đồ tuần/tháng của A sẽ nằm ở đây."
        />
      </Card>
    </ScrollView>
  );
}
