import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../../../app/providers/ThemeProvider';

export interface OnboardingPaginationProps {
  total: number;
  currentIndex: number;
  onSelectIndex?: (index: number) => void;
}

export function OnboardingPagination({
  total,
  currentIndex,
  onSelectIndex,
}: OnboardingPaginationProps) {
  const { colors, radius, spacing } = useTheme();

  return (
    <View
      accessible
      accessibilityRole="tablist"
      accessibilityLabel={`Step ${currentIndex + 1} of ${total}`}
      style={[styles.container, { gap: spacing.sm }]}>
      {Array.from({ length: total }).map((_, index) => {
        const isActive = index === currentIndex;
        return (
          <Pressable
            key={`dot-${index}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`Onboarding slide ${index + 1}`}
            hitSlop={8}
            onPress={() => onSelectIndex?.(index)}
            style={[
              styles.dot,
              isActive ? styles.dotActive : styles.dotInactive,
              {
                backgroundColor: isActive ? colors.primary : colors.border,
                borderRadius: radius.pill,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    height: 10,
  },
  dotActive: {
    width: 28,
  },
  dotInactive: {
    width: 10,
  },
});

