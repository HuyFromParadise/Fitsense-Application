import React, { memo } from 'react';
import { Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '../../app/providers/ThemeProvider';
import { tabularNums } from '../../theme';

export interface MetricTileProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Standardized athletic telemetry tile with optional icon badge,
 * uppercase label, and tabular-nums value readout.
 */
export const MetricTile = memo(function MetricTile({
  label,
  value,
  unit,
  icon,
  style,
}: MetricTileProps) {
  const { isDark, colors, spacing, radius, typography } = useTheme();

  const elevationStyle = isDark
    ? undefined
    : Platform.select({
        android: { elevation: 2 },
        ios: {
          shadowColor: colors.text,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.08,
          shadowRadius: 4,
        },
      });

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceAlt,
          borderColor: colors.border,
          borderWidth: isDark ? 1 : StyleSheet.hairlineWidth,
          borderRadius: radius.md,
          padding: spacing.md,
          gap: spacing.xs,
        },
        elevationStyle,
        style,
      ]}>
      <View style={[styles.header, { gap: spacing.xs }]}>
        {icon ? (
          <View
            style={[
              styles.iconBadge,
              {
                backgroundColor: colors.primaryMuted,
                borderRadius: radius.sm,
                padding: spacing.xs,
              },
            ]}>
            {icon}
          </View>
        ) : null}
        <Text
          numberOfLines={1}
          style={[
            typography.label,
            styles.labelText,
            { color: colors.textMuted },
          ]}>
          {label}
        </Text>
      </View>

      <View style={[styles.valueRow, { gap: spacing.xs }]}>
        <Text
          numberOfLines={1}
          style={[typography.title, tabularNums, { color: colors.text }]}>
          {value}
        </Text>
        {unit ? (
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            {unit}
          </Text>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBadge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelText: {
    flex: 1,
    textTransform: 'uppercase',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
});
