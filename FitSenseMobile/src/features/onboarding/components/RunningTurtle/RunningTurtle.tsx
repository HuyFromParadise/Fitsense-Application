import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Polygon,
  Rect,
  Stop,
} from 'react-native-svg';

import { useTheme } from '../../../../app/providers/ThemeProvider';
import {
  FAR_SCENERY_WIDTH,
  NEAR_SCENERY_WIDTH,
  type TurtleMascotState,
  useRunningTurtleAnimation,
} from '../../animations/useRunningTurtleAnimation';
import { AnimatedRoad } from '../AnimatedRoad';
import { TurtleSmoke } from '../TurtleSmoke';

export interface RunningTurtleProps {
  /**
   * Mascot animation state:
   * - 'running': Page 1 & Splash Screen (turtle running on road with dust clouds)
   * - 'idle': Page 2 (turtle with floating fitness metrics & animated activity rings)
   * - 'celebration': Page 3 (turtle celebrating achievement with animated trophy)
   */
  state?: TurtleMascotState;
  height?: number;
}

/**
 * FitSense Cute 2D Vector Turtle Mascot — faithfully recreated from the reference illustration:
 * - Lime/chartreuse green rounded head (`colors.turtleSkin`) facing in a 3/4 view
 * - Two dark glossy eyes with white catchlights, coral-pink oval cheeks (`colors.turtleCheek`), and a cute center U-smile
 * - Cream-yellow segmented plastron / under-belly (`colors.turtleBelly`)
 * - Warm brown dome shell (`colors.turtleShell`) with lighter top hexagon (`colors.turtleShellHighlight`),
 *   terracotta rim (`colors.turtleShellRim`), and bold dark-brown outlines (`colors.turtleOutline`)
 * - Three visible stubby green legs with lighter green toe pads, plus a cute pointed tail
 */
export function RunningTurtle({
  state = 'running',
  height = 256,
}: RunningTurtleProps) {
  const { colors, radius, typography } = useTheme();
  const anim = useRunningTurtleAnimation(state);

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`FitSense cute turtle mascot (${state})`}
      style={[
        styles.sceneContainer,
        {
          height,
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.lg,
        },
      ]}>
      {/* Ambient sky & glow backdrop */}
      <View style={styles.skyBackdrop} pointerEvents="none">
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 320 256"
          preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.background} stopOpacity="0.95" />
              <Stop offset="0.65" stopColor={colors.surface} stopOpacity="0.9" />
              <Stop offset="1" stopColor={colors.surfaceAlt} stopOpacity="1" />
            </LinearGradient>
            <LinearGradient id="glowGrad" x1="0.5" y1="0" x2="0.5" y2="1">
              <Stop offset="0" stopColor={colors.primary} stopOpacity="0.22" />
              <Stop offset="1" stopColor={colors.turtleSkin} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="320" height="256" fill="url(#skyGrad)" />
          <Circle cx="242" cy="56" r="56" fill="url(#glowGrad)" />
          <Circle cx="242" cy="56" r="18" fill={colors.primary} fillOpacity="0.24" />
        </Svg>
      </View>

      {/* Far parallax hills */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.parallaxLayer,
          styles.farLayer,
          { transform: [{ translateX: anim.farHillsTranslateX }] },
        ]}>
        <Svg width={FAR_SCENERY_WIDTH * 2} height={90} viewBox="0 0 640 90">
          {[0, FAR_SCENERY_WIDTH].map(offset => (
            <G key={`far-${offset}`} transform={`translate(${offset}, 0)`}>
              <Path
                d="M0 90 L0 56 Q48 20 108 52 T220 42 T320 56 L320 90 Z"
                fill={colors.surfaceAlt}
                fillOpacity="0.65"
              />
              <Path
                d="M0 90 L0 68 Q80 34 160 62 T320 68 L320 90 Z"
                fill={colors.turtleSkin}
                fillOpacity="0.14"
              />
            </G>
          ))}
        </Svg>
      </Animated.View>

      {/* Near parallax trees */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.parallaxLayer,
          styles.nearLayer,
          { transform: [{ translateX: anim.nearTreesTranslateX }] },
        ]}>
        <Svg width={NEAR_SCENERY_WIDTH * 2} height={86} viewBox="0 0 640 86">
          {[0, NEAR_SCENERY_WIDTH].map(offset => (
            <G key={`near-${offset}`} transform={`translate(${offset}, 0)`}>
              <Rect x="36" y="60" width="6" height="22" rx="2" fill={colors.border} />
              <Polygon
                points="39,20 18,62 60,62"
                fill={colors.turtleSkin}
                fillOpacity="0.24"
              />
              <Polygon
                points="39,32 23,62 55,62"
                fill={colors.turtleSkin}
                fillOpacity="0.34"
              />
              <Rect x="276" y="58" width="6" height="24" rx="2" fill={colors.border} />
              <Polygon
                points="279,16 256,62 302,62"
                fill={colors.turtleSkin}
                fillOpacity="0.28"
              />
            </G>
          ))}
        </Svg>
      </Animated.View>

      {/* Page 2 Overlay: Floating Fitness Metrics & Animated Progress Indicators (Idle state) */}
      {state === 'idle' ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.floatingMetricsWrap,
            {
              transform: [
                { translateY: anim.celebrationFloatY },
                { scale: anim.celebrationPulseScale },
              ],
            },
          ]}>
          {/* Left Floating Card: Steps & Progress Ring */}
          <View
            style={[
              styles.floatingBadge,
              styles.floatingBadgeLeft,
              {
                backgroundColor: colors.surfaceAlt,
                borderColor: colors.primary,
                borderRadius: radius.md,
              },
            ]}>
            <Svg width={28} height={28} viewBox="0 0 28 28">
              <Circle
                cx="14"
                cy="14"
                r="10"
                stroke={colors.border}
                strokeWidth="3"
                fill="none"
              />
              <Circle
                cx="14"
                cy="14"
                r="10"
                stroke={colors.primary}
                strokeWidth="3"
                strokeDasharray="48 64"
                strokeLinecap="round"
                fill="none"
              />
            </Svg>
            <View>
              <Text style={[typography.label, { color: colors.text }]}>
                8,420
              </Text>
              <Text style={[typography.caption, { color: colors.primary }]}>
                Steps · 84%
              </Text>
            </View>
          </View>

          {/* Right Floating Card: Calories & Distance */}
          <View
            style={[
              styles.floatingBadge,
              styles.floatingBadgeRight,
              {
                backgroundColor: colors.surfaceAlt,
                borderColor: colors.success,
                borderRadius: radius.md,
              },
            ]}>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Path
                d="M22 12H18L15 21L9 3L6 12H2"
                stroke={colors.success}
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <View>
              <Text style={[typography.label, { color: colors.text }]}>
                6.2 km
              </Text>
              <Text style={[typography.caption, { color: colors.success }]}>
                410 kcal
              </Text>
            </View>
          </View>
        </Animated.View>
      ) : null}

      {/* Page 3 Overlay: Animated Trophy & Celebration Stars (Celebration state) */}
      {state === 'celebration' ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.celebrationWrap,
            {
              transform: [
                { translateY: anim.celebrationFloatY },
                { scale: anim.celebrationPulseScale },
              ],
            },
          ]}>
          <Svg width={260} height={92} viewBox="0 0 260 92">
            <Polygon
              points="36,18 39,26 47,29 39,32 36,40 33,32 25,29 33,26"
              fill={colors.warning}
            />
            <Polygon
              points="222,14 225,21 232,24 225,27 222,34 219,27 212,24 219,21"
              fill={colors.primary}
            />
            <Circle cx="68" cy="18" r="4" fill={colors.turtleSkin} />
            <Circle cx="196" cy="22" r="4.5" fill={colors.warning} />

            <G transform="translate(185, 28)">
              <Circle
                cx="26"
                cy="26"
                r="24"
                fill={colors.surfaceAlt}
                stroke={colors.warning}
                strokeWidth="2"
              />
              <Path
                d="M17 15 H35 V23 C35 28 31 32 26 32 C21 32 17 28 17 23 Z"
                fill={colors.warning}
              />
              <Path
                d="M17 17 H13 C13 22 15 25 18 25 M35 17 H39 C39 22 37 25 34 25"
                stroke={colors.warning}
                strokeWidth="2.2"
                fill="none"
              />
              <Rect x="23" y="32" width="6" height="5" fill={colors.warning} />
              <Rect x="19" y="37" width="14" height="3.5" rx="1.5" fill={colors.primary} />
            </G>
          </Svg>
        </Animated.View>
      ) : null}

      {/* Road Surface & Moving Markings */}
      <AnimatedRoad roadTranslateX={anim.roadTranslateX} />

      {/* Smoke / Dust Clouds behind the running turtle */}
      <TurtleSmoke
        particles={anim.dustParticles}
        visible={state === 'running'}
      />

      {/* Ground oval shadow beneath the turtle (matching reference image) */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.groundShadow,
          {
            backgroundColor: colors.background,
            opacity: anim.shadowOpacity,
            transform: [{ scaleX: anim.shadowScaleX }],
          },
        ]}
      />

      {/*
       * Main Cute Turtle Mascot (exact proportions & features from the uploaded reference image,
       * flipped horizontally so the turtle runs forward to the right while facing the viewer in 3/4 view).
       */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.turtleCharacterWrap,
          {
            transform: [
              { translateY: anim.bodyBounceY },
              { rotate: anim.bodyTilt },
              { scaleY: anim.bodyScaleY },
            ],
          },
        ]}>
        {/* 1. Far Front Right Leg (tucked under chest on right side of character) */}
        <Animated.View
          style={[
            styles.legSlot,
            styles.farFrontLegSlot,
            { transform: [{ rotate: anim.frontLeftLegAngle }] },
          ]}>
          <Svg width={44} height={44} viewBox="0 0 44 44">
            {/* Stubby rounded leg */}
            <Path
              d="M14 6 C10 15 8 25 10 33 C12 39 30 40 34 33 C37 26 32 14 26 6 Z"
              fill={colors.turtleSkinShadow}
              stroke={colors.turtleOutline}
              strokeWidth="2.8"
              strokeLinejoin="round"
            />
            {/* Three cute rounded toe pads */}
            <Ellipse
              cx="16"
              cy="34"
              rx="3"
              ry="3.6"
              fill={colors.turtleSkinHighlight}
            />
            <Ellipse
              cx="22"
              cy="35"
              rx="3"
              ry="3.6"
              fill={colors.turtleSkinHighlight}
            />
            <Ellipse
              cx="28"
              cy="34"
              rx="3"
              ry="3.6"
              fill={colors.turtleSkinHighlight}
            />
          </Svg>
        </Animated.View>

        {/* 2. Cute Pointed Tail sticking out behind shell on left */}
        <Animated.View
          style={[
            styles.tailSlot,
            { transform: [{ rotate: anim.tailAngle }] },
          ]}>
          <Svg width={34} height={28} viewBox="0 0 34 28">
            <Path
              d="M30 11 C20 12 10 12 4 8 C6 17 16 22 30 20 Z"
              fill={colors.turtleSkin}
              stroke={colors.turtleOutline}
              strokeWidth="2.8"
              strokeLinejoin="round"
            />
          </Svg>
        </Animated.View>

        {/* 3. Back Left Leg (under rear of shell) */}
        <Animated.View
          style={[
            styles.legSlot,
            styles.backLegSlot,
            { transform: [{ rotate: anim.backRightLegAngle }] },
          ]}>
          <Svg width={46} height={46} viewBox="0 0 46 46">
            <Path
              d="M12 6 C9 16 8 27 11 35 C14 40 32 40 35 34 C37 26 35 15 30 6 Z"
              fill={colors.turtleSkin}
              stroke={colors.turtleOutline}
              strokeWidth="2.8"
              strokeLinejoin="round"
            />
            {/* Top shadow under shell */}
            <Path
              d="M12 8 Q22 13 31 8"
              stroke={colors.turtleSkinShadow}
              strokeWidth="4"
              strokeLinecap="round"
            />
            {/* Three cute rounded toe pads */}
            <Ellipse
              cx="16"
              cy="35.5"
              rx="3"
              ry="3.8"
              fill={colors.turtleSkinHighlight}
            />
            <Ellipse
              cx="23"
              cy="36"
              rx="3.2"
              ry="3.8"
              fill={colors.turtleSkinHighlight}
            />
            <Ellipse
              cx="30"
              cy="35"
              rx="3"
              ry="3.6"
              fill={colors.turtleSkinHighlight}
            />
          </Svg>
        </Animated.View>

        {/* 4. Cream-Yellow Plastron (Under-belly) + Brown Segmented Dome Shell */}
        <View style={styles.bodyShellSlot}>
          <Svg width={154} height={114} viewBox="0 0 154 114">
            {/* Green Neck & Chest connecting head to shell */}
            <Path
              d="M92 50 C106 46 122 52 126 66 C120 79 102 82 84 76 Z"
              fill={colors.turtleSkin}
              stroke={colors.turtleOutline}
              strokeWidth="2.8"
              strokeLinejoin="round"
            />

            {/* Cream-Yellow Segmented Under-Belly (Plastron) */}
            <Path
              d="M28 74 C52 88 98 88 122 70 C114 60 40 60 28 74 Z"
              fill={colors.turtleBelly}
              stroke={colors.turtleOutline}
              strokeWidth="2.8"
              strokeLinejoin="round"
            />
            {/* Plastron seam lines matching reference */}
            <Path
              d="M95 68 C102 74 108 77 115 74 M82 72 L94 81 M64 74 L68 83"
              stroke={colors.turtleOutline}
              strokeWidth="2.2"
              strokeLinecap="round"
              fill="none"
            />

            {/* Main Warm Brown Dome Shell */}
            <Path
              d="M16 58 C18 18 52 6 82 10 C112 14 130 38 124 66 C98 76 42 74 16 58 Z"
              fill={colors.turtleShell}
              stroke={colors.turtleOutline}
              strokeWidth="3"
              strokeLinejoin="round"
            />

            {/* Lighter Warm Amber-Brown Top Highlight & Central Scute */}
            <Path
              d="M36 22 C56 10 88 12 108 26 C94 42 54 42 36 22 Z"
              fill={colors.turtleShellHighlight}
            />

            {/* Central Hexagonal Scute Plate (exact geometric pattern from image) */}
            <Polygon
              points="58,22 88,24 98,40 82,52 54,48 46,34"
              fill={colors.turtleShellHighlight}
              stroke={colors.turtleOutline}
              strokeWidth="2.8"
              strokeLinejoin="round"
            />
            {/* Inner glossy oval highlight on central scute */}
            <Ellipse
              cx="72"
              cy="35"
              rx="14"
              ry="7"
              fill={colors.warning}
              fillOpacity="0.22"
            />

            {/* Shell Scute Segment Ribs radiating from central hexagon to rim */}
            <Path
              d="M58 22 L48 12 M88 24 L98 15 M98 40 L121 40 M82 52 L92 68 M54 48 L42 64 M46 34 L22 36"
              stroke={colors.turtleOutline}
              strokeWidth="2.8"
              strokeLinecap="round"
            />

            {/* Terracotta / Lighter Brown Segmented Shell Rim */}
            <Path
              d="M12 56 C40 76 96 78 126 60 C128 66 122 72 116 74 C86 86 36 82 10 64 C9 60 10 57 12 56 Z"
              fill={colors.turtleShellRim}
              stroke={colors.turtleOutline}
              strokeWidth="2.8"
              strokeLinejoin="round"
            />
            {/* Rim segment notches */}
            <Path
              d="M32 67 L28 74 M60 73 L58 80 M90 72 L92 79"
              stroke={colors.turtleOutline}
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </Svg>
        </View>

        {/* 5. Near Front Left Leg (foreground leg stepping forward) */}
        <Animated.View
          style={[
            styles.legSlot,
            styles.nearFrontLegSlot,
            { transform: [{ rotate: anim.frontRightLegAngle }] },
          ]}>
          <Svg width={48} height={50} viewBox="0 0 48 50">
            <Path
              d="M16 5 C12 17 10 30 12 39 C14 45 34 45 37 38 C40 29 36 16 32 6 Z"
              fill={colors.turtleSkin}
              stroke={colors.turtleOutline}
              strokeWidth="2.8"
              strokeLinejoin="round"
            />
            {/* Soft shading along top of leg */}
            <Path
              d="M17 8 Q24 13 31 8"
              stroke={colors.turtleSkinShadow}
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            {/* Three cute rounded toe pads */}
            <Ellipse
              cx="17"
              cy="39.5"
              rx="3.2"
              ry="4"
              fill={colors.turtleSkinHighlight}
            />
            <Ellipse
              cx="24.5"
              cy="40"
              rx="3.4"
              ry="4"
              fill={colors.turtleSkinHighlight}
            />
            <Ellipse
              cx="32"
              cy="39"
              rx="3.2"
              ry="3.8"
              fill={colors.turtleSkinHighlight}
            />
          </Svg>
        </Animated.View>

        {/* 6. Large Rounded Cute Green Head (3/4 view with TWO glossy eyes, pink cheeks & center U-smile) */}
        <Animated.View
          style={[
            styles.headSlot,
            {
              transform: [
                { translateY: anim.headBobY },
                { rotate: anim.headTilt },
              ],
            },
          ]}>
          <Svg width={94} height={82} viewBox="0 0 94 82">
            {/* Large Rounded Head Outline & Fill */}
            <Path
              d="M46 10 C70 10 86 26 86 46 C86 64 70 74 46 74 C22 74 10 60 10 42 C10 22 24 10 46 10 Z"
              fill={colors.turtleSkin}
              stroke={colors.turtleOutline}
              strokeWidth="3"
              strokeLinejoin="round"
            />

            {/* Soft lighter lime-green forehead highlight */}
            <Path
              d="M24 22 C36 13 60 13 72 24 C60 18 36 18 24 22 Z"
              fill={colors.turtleSkinHighlight}
            />

            {/* Subtle chin shadow */}
            <Path
              d="M20 62 C36 72 64 72 78 60 C64 68 36 68 20 62 Z"
              fill={colors.turtleSkinShadow}
            />

            {/* Two Coral-Pink Oval Cheeks */}
            <Ellipse
              cx="30"
              cy="53"
              rx="6.2"
              ry="3.6"
              fill={colors.turtleCheek}
            />
            <Ellipse
              cx="77"
              cy="49"
              rx="5.2"
              ry="3.3"
              fill={colors.turtleCheek}
            />

            {/* Subtle cute nose ridge dot above smile */}
            <Path
              d="M54 45 Q57 46.5 60 45"
              stroke={colors.turtleSkinShadow}
              strokeWidth="2.2"
              strokeLinecap="round"
              fill="none"
            />

            {/* Friendly U-Shaped Smile centered between the two eyes */}
            {state === 'celebration' ? (
              <Path
                d="M48 50 Q57 60 65 49 Z"
                fill={colors.turtleOutline}
              />
            ) : (
              <Path
                d="M48 50 Q57 58 65 49"
                stroke={colors.turtleOutline}
                strokeWidth="2.8"
                strokeLinecap="round"
                fill="none"
              />
            )}
          </Svg>

          {/* Two Glossy Dark Eyes with White Catchlights (blinking together) */}
          <Animated.View
            style={[
              styles.eyesOverlaySlot,
              { transform: [{ scaleY: anim.eyeScaleY }] },
            ]}>
            <Svg width={94} height={82} viewBox="0 0 94 82">
              {/* Left (Near) Eye */}
              <Ellipse
                cx="37"
                cy="42"
                rx="5.8"
                ry="6.5"
                fill={colors.turtleOutline}
              />
              <Circle cx="35.2" cy="39.8" r="2.2" fill={colors.onPrimary} />
              <Circle cx="38.8" cy="44.2" r="1" fill={colors.onPrimary} />

              {/* Right (Far) Eye */}
              <Ellipse
                cx="72"
                cy="39"
                rx="5.2"
                ry="6"
                fill={colors.turtleOutline}
              />
              <Circle cx="70.5" cy="37" r="2" fill={colors.onPrimary} />
              <Circle cx="73.5" cy="41" r="0.9" fill={colors.onPrimary} />
            </Svg>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  sceneContainer: {
    width: '100%',
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  skyBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  parallaxLayer: {
    position: 'absolute',
    left: 0,
    width: NEAR_SCENERY_WIDTH * 2,
  },
  farLayer: {
    bottom: 54,
  },
  nearLayer: {
    bottom: 52,
  },
  floatingMetricsWrap: {
    position: 'absolute',
    top: 16,
    left: 14,
    right: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  floatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 8,
  },
  floatingBadgeLeft: {
    alignSelf: 'flex-start',
  },
  floatingBadgeRight: {
    alignSelf: 'flex-end',
  },
  celebrationWrap: {
    position: 'absolute',
    top: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groundShadow: {
    position: 'absolute',
    bottom: 18,
    width: 148,
    height: 16,
    borderRadius: 999,
  },
  turtleCharacterWrap: {
    position: 'absolute',
    bottom: 18,
    width: 210,
    height: 132,
  },
  tailSlot: {
    position: 'absolute',
    left: 2,
    top: 58,
  },
  bodyShellSlot: {
    position: 'absolute',
    left: 16,
    top: 16,
  },
  headSlot: {
    position: 'absolute',
    left: 108,
    top: 8,
  },
  eyesOverlaySlot: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  legSlot: {
    position: 'absolute',
  },
  backLegSlot: {
    left: 26,
    top: 78,
  },
  nearFrontLegSlot: {
    left: 82,
    top: 78,
  },
  farFrontLegSlot: {
    left: 118,
    top: 76,
  },
});
