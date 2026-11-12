import React from 'react';
import { ScrollView, Text } from 'react-native';

import { useTheme } from '../../../app/providers/ThemeProvider';
import { Card, EmptyState } from '../../../components/common';

export function ResetPasswordScreen() {
  const { colors, spacing, typography } = useTheme();

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      <Text style={[typography.heading, { color: colors.text }]}>Quên mật khẩu</Text>
      <Card>
        <EmptyState
          title="Chưa triển khai (F1)"
          message="Màn placeholder. A sẽ đổ luồng reset password Firebase vào đây."
        />
      </Card>
    </ScrollView>
  );
}
