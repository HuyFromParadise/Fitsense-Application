import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../app/providers/ThemeProvider';

export function EmptyState({
  title,
  message,
}: {
  title: string;
  message?: string;
}) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={[styles.center, { gap: spacing.sm, padding: spacing.lg }]}>
      <Text style={[typography.heading, { color: colors.text }]}>{title}</Text>
      {message ? (
        <Text style={[typography.body, styles.textCenter, { color: colors.textMuted }]}>
          {message}
        </Text>
      ) : null}
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
