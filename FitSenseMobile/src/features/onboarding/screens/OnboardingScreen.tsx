import React, { useCallback, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { useTheme } from '../../../app/providers/ThemeProvider';
import { Button, Card } from '../../../components/common';
import { useOnboardingStore } from '../../../stores/useOnboardingStore';
import type { TurtleMascotState } from '../animations/useRunningTurtleAnimation';
import { OnboardingPagination } from '../components/OnboardingPagination';
import { RunningTurtle } from '../components/RunningTurtle';

export interface OnboardingSlide {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  mascotState: TurtleMascotState;
  metricLabel: string;
  metricValue: string;
}

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: 'track-journey',
    badge: 'FITSENSE JOURNEY',
    title: 'Track Your Fitness Journey',
    subtitle: 'Small steps. Big achievements.',
    description:
      'Monitor your daily activity and discover your fitness progress.',
    mascotState: 'running',
    metricLabel: 'DAILY PACE',
    metricValue: 'Running Turtle · Live Progress',
  },
  {
    id: 'understand-activity',
    badge: 'ACTIVITY INSIGHTS',
    title: 'Understand Your Activity',
    subtitle: 'Every step and calorie measured.',
    description:
      'Track your steps, distance, calories, and daily movement.',
    mascotState: 'idle',
    metricLabel: 'SMART METRICS',
    metricValue: 'Steps · Distance · Calories · Time',
  },
  {
    id: 'reach-goals',
    badge: 'HEALTH MILESTONES',
    title: 'Reach Your Health Goals',
    subtitle: 'Stay motivated every single day.',
    description:
      'Set your goals, stay motivated, and become healthier every day.',
    mascotState: 'celebration',
    metricLabel: 'GOAL ACHIEVED',
    metricValue: 'Daily Targets · Streaks · Rewards',
  },
];

export interface OnboardingScreenProps {
  onComplete?: () => void;
}

function FeatureBadgeIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M13 2L3 14H12L11 22L21 10H12L13 2Z"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MetricPulseIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 12H18L15 21L9 3L6 12H2"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="12" r="2" fill={color} />
    </Svg>
  );
}

/**
 * PART B: FitSense 3-Page Onboarding Experience
 * - Page 1: "Track Your Fitness Journey" (Turtle running on a road with smoke)
 * - Page 2: "Understand Your Activity" (Turtle mascot with floating metrics & progress rings)
 * - Page 3: "Reach Your Health Goals" (Turtle celebrating achievement with animated trophy)
 * - Smooth horizontal slide transitions + Next, Skip, and Get Started navigation
 */
export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { colors, spacing, radius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const completeOnboarding = useOnboardingStore(
    state => state.completeOnboarding,
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Smooth horizontal page transition animation
  const slideTranslateX = useRef(new Animated.Value(0)).current;
  const slideOpacity = useRef(new Animated.Value(1)).current;

  const slide = ONBOARDING_SLIDES[currentIndex] ?? ONBOARDING_SLIDES[0];
  const isLastSlide = currentIndex === ONBOARDING_SLIDES.length - 1;
  const isCompactWidth = width < 380;

  const animateToSlide = useCallback(
    (nextIndex: number) => {
      if (nextIndex === currentIndex) return;
      const direction = nextIndex > currentIndex ? 1 : -1;
      setCurrentIndex(nextIndex);
      slideTranslateX.setValue(direction * 36);
      slideOpacity.setValue(0.35);

      Animated.parallel([
        Animated.timing(slideTranslateX, {
          toValue: 0,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(slideOpacity, {
          toValue: 1,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    },
    [currentIndex, slideOpacity, slideTranslateX],
  );

  const finishOnboarding = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await completeOnboarding();
      onComplete?.();
    } finally {
      setSubmitting(false);
    }
  }, [completeOnboarding, onComplete, submitting]);

  const handleNext = useCallback(() => {
    if (isLastSlide) {
      finishOnboarding().catch(() => {});
    } else {
      animateToSlide(Math.min(currentIndex + 1, ONBOARDING_SLIDES.length - 1));
    }
  }, [animateToSlide, currentIndex, finishOnboarding, isLastSlide]);

  const handleSkip = useCallback(() => {
    finishOnboarding().catch(() => {});
  }, [finishOnboarding]);

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + spacing.md,
          paddingBottom: Math.max(insets.bottom, spacing.md),
        },
      ]}>
      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: spacing.lg,
            gap: isCompactWidth ? spacing.md : spacing.lg,
          },
        ]}>
        {/* Top bar: Brand pill & Skip action */}
        <View style={styles.topBar}>
          <View
            style={[
              styles.brandBadge,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radius.pill,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.xs,
                gap: spacing.xs,
              },
            ]}>
            <FeatureBadgeIcon color={colors.primary} />
            <Text
              style={[
                typography.caption,
                styles.badgeText,
                { color: colors.text },
              ]}>
              {slide.badge}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding"
            disabled={submitting}
            hitSlop={12}
            onPress={handleSkip}
            style={({ pressed }) => [
              styles.skipButton,
              {
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.xs,
                borderRadius: radius.pill,
                backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
                opacity: submitting ? 0.5 : 1,
              },
            ]}>
            <Text style={[typography.label, { color: colors.textMuted }]}>
              Skip
            </Text>
          </Pressable>
        </View>

        {/* Horizontally Animated Slide Content: Mascot Scene + Telemetry + Copy */}
        <Animated.View
          style={[
            styles.animatedSlideContainer,
            {
              gap: isCompactWidth ? spacing.md : spacing.lg,
              opacity: slideOpacity,
              transform: [{ translateX: slideTranslateX }],
            },
          ]}>
          {/* Main Hero Visual: Cute Turtle Mascot with Page-specific State */}
          <View style={styles.heroWrapper}>
            <RunningTurtle state={slide.mascotState} />

            {/* Live Fitness Telemetry Strip overlaid below the track */}
            <Card
              style={[
                styles.telemetryStrip,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.md,
                  marginTop: spacing.sm,
                },
              ]}>
              <View style={[styles.telemetryRow, { gap: spacing.sm }]}>
                <View
                  style={[
                    styles.iconBubble,
                    {
                      backgroundColor: colors.surface,
                      borderRadius: radius.sm,
                    },
                  ]}>
                  <MetricPulseIcon color={colors.success} />
                </View>
                <View style={styles.telemetryCopy}>
                  <Text
                    style={[
                      typography.caption,
                      styles.telemetryLabel,
                      { color: colors.primary },
                    ]}>
                    {slide.metricLabel}
                  </Text>
                  <Text style={[typography.label, { color: colors.text }]}>
                    {slide.metricValue}
                  </Text>
                </View>
              </View>
            </Card>
          </View>

          {/* Value Proposition Copy Block */}
          <View style={[styles.textSection, { gap: spacing.sm }]}>
            <Text
              accessibilityRole="header"
              style={[
                typography.title,
                styles.titleText,
                isCompactWidth ? styles.titleCompact : styles.titleRegular,
                {
                  color: colors.text,
                },
              ]}>
              {slide.title}
            </Text>

            <Text
              style={[
                typography.heading,
                {
                  color: colors.primary,
                },
              ]}>
              {slide.subtitle}
            </Text>

            <Text
              style={[
                typography.body,
                styles.descriptionText,
                {
                  color: colors.textMuted,
                },
              ]}>
              {slide.description}
            </Text>
          </View>
        </Animated.View>

        {/* Bottom Navigation Footer: Pagination + Next / Get Started CTA */}
        <View style={[styles.footerSection, { gap: spacing.lg }]}>
          <OnboardingPagination
            total={ONBOARDING_SLIDES.length}
            currentIndex={currentIndex}
            onSelectIndex={animateToSlide}
          />

          <View style={[styles.ctaRow, { gap: spacing.md }]}>
            {currentIndex > 0 ? (
              <Button
                title="Back"
                variant="secondary"
                disabled={submitting}
                onPress={() => animateToSlide(Math.max(0, currentIndex - 1))}
                style={styles.backButton}
              />
            ) : null}

            <Button
              title={isLastSlide ? 'Get Started' : 'Next'}
              variant="primary"
              loading={submitting}
              onPress={handleNext}
              style={styles.nextButton}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  badgeText: {
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  skipButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  animatedSlideContainer: {
    width: '100%',
  },
  heroWrapper: {
    width: '100%',
  },
  telemetryStrip: {
    borderWidth: 1,
  },
  telemetryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBubble: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  telemetryCopy: {
    flex: 1,
  },
  telemetryLabel: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  textSection: {
    alignItems: 'flex-start',
  },
  titleText: {
    lineHeight: 36,
    letterSpacing: -0.3,
  },
  titleCompact: {
    fontSize: 26,
  },
  titleRegular: {
    fontSize: 30,
  },
  descriptionText: {
    lineHeight: 22,
  },
  footerSection: {
    width: '100%',
    paddingTop: 4,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    flex: 1,
  },
  nextButton: {
    flex: 2,
  },
});
