import React from 'react';
import { ScrollView, Text } from 'react-native';

import { useTheme } from '../../../app/providers/ThemeProvider';
import { Card, EmptyState } from '../../../components/common';

export function ExerciseScreen() {
  const { colors, spacing, typography } = useTheme();

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      <Text style={[typography.heading, { color: colors.text }]}>Tập luyện</Text>
      <Card>
        <EmptyState
          title="Chưa triển khai (F2)"
          message="Màn placeholder. A sẽ đổ bản đồ GPS và điều khiển phiên tập vào đây."
        />
      </Card>
    </ScrollView>
  );
}
