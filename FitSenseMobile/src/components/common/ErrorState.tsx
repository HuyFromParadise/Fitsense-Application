import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../app/providers/ThemeProvider';
import { Button } from './Button';

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={[styles.center, { gap: spacing.md, padding: spacing.lg }]}>
      <Text style={[typography.heading, { color: colors.danger }]}>
        Đã xảy ra lỗi
      </Text>
      <Text style={[typography.body, styles.textCenter, { color: colors.textMuted }]}>
        {message}
      </Text>
      {onRetry ? <Button title="Thử lại" variant="secondary" onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCenter: {
    textAlign: 'center',
  },
});
