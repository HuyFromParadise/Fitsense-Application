import React, { memo, useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  Animated,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '../../app/providers/ThemeProvider';

export interface SkeletonLoaderProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Geometry-matched skeleton placeholder using GPU-composited opacity pulse
 * while respecting system reduce-motion preferences.
 */
export const SkeletonLoader = memo(function SkeletonLoader({
  width = '100%',
  height = 20,
  borderRadius,
  style,
}: SkeletonLoaderProps) {
  const { colors, radius } = useTheme();
  const opacityAnim = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    let active = true;
    let loopAnim: Animated.CompositeAnimation | null = null;

    AccessibilityInfo.isReduceMotionEnabled()
      .then(reduceMotion => {
        if (!active || reduceMotion) {
          return;
        }
        loopAnim = Animated.loop(
          Animated.sequence([
            Animated.timing(opacityAnim, {
              toValue: 0.9,
              duration: 750,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0.45,
              duration: 750,
              useNativeDriver: true,
            }),
          ]),
        );
        loopAnim.start();
      })
      .catch(() => {
        // Keep static fallback opacity if AccessibilityInfo query fails
      });

    return () => {
      active = false;
      loopAnim?.stop();
    };
  }, [opacityAnim]);

  return (
    <Animated.View
      accessibilityRole="progressbar"
      style={[
        {
          width,
          height,
          borderRadius: borderRadius ?? radius.md,
          backgroundColor: colors.surfaceAlt,
          opacity: opacityAnim,
        },
        style,
      ]}
    />
  );
});
