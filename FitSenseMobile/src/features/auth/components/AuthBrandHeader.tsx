import React, { memo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../../app/providers/ThemeProvider';

const FITSENSE_LOGO = require('../../../../assets/images/fitsense_logo.jpg');

export interface AuthBrandHeaderProps {
  title: string;
  subtitle: string;
  tagline?: string;
  icon?: React.ReactNode;
  showLogo?: boolean;
}

/**
 * Shared header for AuthStack screens combining FitSense brand badge or
 * contextual icon with clear title and subtitle hierarchy.
 */
export const AuthBrandHeader = memo(function AuthBrandHeader({
  title,
  subtitle,
  tagline,
  icon,
  showLogo = false,
}: AuthBrandHeaderProps) {
  const { colors, radius, spacing, typography } = useTheme();

  return (
    <View style={[styles.container, { gap: spacing.xs }]}>
      {showLogo ? (
        <View
          style={[
            styles.logoBadge,
            {
              backgroundColor: colors.surface,
              borderColor: colors.primary,
              borderRadius: radius.lg,
              marginBottom: spacing.xs,
            },
          ]}>
          <Image
            source={FITSENSE_LOGO}
            style={styles.logoImage}
            resizeMode="cover"
            accessibilityLabel="Logo FitSense"
          />
        </View>
      ) : icon ? (
        <View
          style={[
            styles.iconBadge,
            {
              backgroundColor: colors.primaryMuted,
              borderRadius: radius.lg,
              marginBottom: spacing.xs,
            },
          ]}>
          {icon}
        </View>
      ) : null}

      <Text style={[typography.title, styles.centered, { color: colors.text }]}>
        {title}
      </Text>

      {tagline ? (
        <Text
          style={[
            typography.label,
            styles.centered,
            { color: colors.primary },
          ]}>
          {tagline}
        </Text>
      ) : null}

      <Text
        style={[
          typography.body,
          styles.centered,
          { color: colors.textMuted, marginTop: spacing.xs },
        ]}>
        {subtitle}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderWidth: 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  iconBadge: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    textAlign: 'center',
  },
});
