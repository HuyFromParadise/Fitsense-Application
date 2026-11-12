import React from 'react';
import { ScrollView, Text } from 'react-native';

import { useTheme } from '../../../app/providers/ThemeProvider';
import { Card, EmptyState } from '../../../components/common';

export function GoalsScreen() {
  const { colors, spacing, typography } = useTheme();

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      <Text style={[typography.heading, { color: colors.text }]}>Mục tiêu</Text>
      <Card>
        <EmptyState
          title="Chưa triển khai (F7)"
          message="Màn placeholder. B sẽ đổ CRUD mục tiêu qua /api/goals vào đây."
        />
      </Card>
    </ScrollView>
  );
}
