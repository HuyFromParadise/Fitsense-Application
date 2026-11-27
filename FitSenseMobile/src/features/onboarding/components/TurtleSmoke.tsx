import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useTheme } from '../../../app/providers/ThemeProvider';
import type { DustParticleAnim } from '../animations/useRunnerAnimation';

export interface TurtleSmokeProps {
  particles: DustParticleAnim[];
  visible?: boolean;
}

/**
 * Comic-book billowing dust & smoke puffs trailing behind the runner.
 * Reuses a fixed pool of Animated nodes to avoid runtime allocations.
 */
export function TurtleSmoke({ particles, visible = true }: TurtleSmokeProps) {
  const { colors } = useTheme();

  if (!visible) {
    return null;
  }

  return (
    <View pointerEvents="none" style={styles.dustOrigin}>
      {particles.map((particle, idx) => (
        <Animated.View
          key={`smoke-${idx}`}
          style={[
            styles.dustParticle,
            {
              transform: [
                { translateX: particle.translateX },
                { translateY: particle.translateY },
                { scale: particle.scale },
              ],
              opacity: particle.opacity,
            },
          ]}>
          <Svg width={54} height={46} viewBox="0 0 54 46">
            <Circle
              cx="22"
              cy="28"
              r="14"
              fill={colors.textMuted}
              fillOpacity="0.45"
            />
            <Circle
              cx="20"
              cy="24"
              r="13"
              fill={colors.onPrimary}
              fillOpacity="0.9"
            />
            <Circle
              cx="32"
              cy="20"
              r="10"
              fill={colors.onPrimary}
              fillOpacity="0.88"
            />
            <Circle
              cx="12"
              cy="29"
              r="9"
              fill={colors.onPrimary}
              fillOpacity="0.85"
            />
            <Circle
              cx="38"
              cy="29"
              r="7.5"
              fill={colors.onPrimary}
              fillOpacity="0.82"
            />
            <Path
              d="M8 24 C10 15 20 11 27 16 M27 13 C33 10 41 14 41 21 M14 35 C20 38 28 36 32 32"
              stroke={colors.background}
              strokeOpacity="0.55"
              strokeWidth="1.8"
              strokeLinecap="round"
              fill="none"
            />
          </Svg>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dustOrigin: {
    position: 'absolute',
    bottom: 24,
    left: '20%',
    width: 54,
    height: 46,
  },
  dustParticle: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
