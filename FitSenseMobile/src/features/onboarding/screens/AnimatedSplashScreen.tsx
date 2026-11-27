import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { useTheme } from '../../../app/providers/ThemeProvider';
import { RunnerAnimation } from '../components/RunnerAnimation';

export interface AnimatedSplashScreenProps {
  message?: string;
}

function FitSenseLogoIcon({
  primaryColor,
  accentColor,
}: {
  primaryColor: string;
  accentColor: string;
}) {
  return (
    <Svg width={36} height={36} viewBox="0 0 36 36" fill="none">
      <Circle
        cx="18"
        cy="18"
        r="15"
        stroke={primaryColor}
        strokeWidth="2.4"
        strokeOpacity="0.35"
      />
      <Path
        d="M20 5L9 20H18L16 31L27 16H18L20 5Z"
        fill={primaryColor}
        stroke={primaryColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="27" cy="9" r="3" fill={accentColor} />
    </Svg>
  );
}

/**
 * PART A: Animated FitSense Splash Screen
 * - Appears on app launch while initialization completes
 * - Displays centered FitSense logo, "FitSense" title, and tagline "Move Better. Live Healthier."
 * - Displays cute green turtle running on a road with soft dust clouds and moving road markings
 * - No user interaction required; does not block indefinitely
 */
export function AnimatedSplashScreen({
  message = 'Đang khởi tạo FitSense...',
}: AnimatedSplashScreenProps) {
  const { colors, spacing, radius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isCompactWidth = width < 380;

  const progressPhase = useRef(new Animated.Value(0)).current;
  const entranceFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entranceFade, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    const loop = Animated.loop(
      Animated.timing(progressPhase, {
        toValue: 1,
        duration: 1800,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [entranceFade, progressPhase]);

  const pulseScale = progressPhase.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.95, 1.05, 0.95],
  });

  const barTranslateX = progressPhase.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [-68, 68, -68],
  });

  return (
    <Animated.View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`FitSense. Move Better. Live Healthier. ${message}`}
      style={[
        styles.root,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + spacing.xl,
          paddingBottom: Math.max(insets.bottom, spacing.xl),
          paddingHorizontal: spacing.lg,
          opacity: entranceFade,
        },
      ]}>
      {/* Centered FitSense Logo & Brand Tagline */}
      <View style={[styles.brandCenterBlock, { gap: spacing.sm }]}>
        <Animated.View
          style={[
            styles.logoBadge,
            {
              backgroundColor: colors.surface,
              borderColor: colors.primary,
              borderRadius: radius.lg,
              transform: [{ scale: pulseScale }],
            },
          ]}>
          <FitSenseLogoIcon
            primaryColor={colors.primary}
            accentColor={colors.success}
          />
        </Animated.View>

        <Text
          style={[
            typography.title,
            styles.brandName,
            isCompactWidth ? styles.brandNameCompact : styles.brandNameRegular,
            { color: colors.text },
          ]}>
          FitSense
        </Text>

        <Text
          style={[
            typography.heading,
            styles.taglineText,
            { color: colors.primary },
          ]}>
          Move Better. Live Healthier.
        </Text>
      </View>

      {/* Animated Runner SVG on Road with Parallax Background & Dust Trail */}
      <View style={styles.mascotSection}>
        <RunnerAnimation height={248} />
      </View>

      {/* Subtle Loading Indicator */}
      <View style={[styles.footerSection, { gap: spacing.sm }]}>
        <View
          style={[
            styles.progressTrack,
            {
              backgroundColor: colors.surfaceAlt,
              borderRadius: radius.pill,
            },
          ]}>
          <Animated.View
            style={[
              styles.progressThumb,
              {
                backgroundColor: colors.primary,
                borderRadius: radius.pill,
                transform: [{ translateX: barTranslateX }],
              },
            ]}
          />
        </View>
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}

export { AnimatedSplashScreen as SplashScreen };

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandCenterBlock: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  brandNameCompact: {
    fontSize: 30,
  },
  brandNameRegular: {
    fontSize: 34,
  },
  taglineText: {
    textAlign: 'center',
  },
  mascotSection: {
    width: '100%',
    alignItems: 'center',
  },
  footerSection: {
    width: '100%',
    alignItems: 'center',
  },
  progressTrack: {
    width: 180,
    height: 6,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressThumb: {
    width: 66,
    height: 6,
  },
});
