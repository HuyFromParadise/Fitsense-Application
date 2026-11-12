import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../app/providers/ThemeProvider';

export function Loading({ message }: { message?: string }) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={[styles.center, { gap: spacing.sm }]}>
      <ActivityIndicator color={colors.primary} />
      {message ? (
        <Text style={[typography.caption, { color: colors.textMuted }]}>
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
    paddingVertical: 24,
  },
});
