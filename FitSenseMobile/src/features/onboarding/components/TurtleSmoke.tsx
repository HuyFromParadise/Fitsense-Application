import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '../../../app/providers/ThemeProvider';
import type { DustParticleAnim } from '../animations/useRunningTurtleAnimation';

export interface TurtleSmokeProps {
  particles: DustParticleAnim[];
  visible?: boolean;
}

/**
 * Pooled soft dust/smoke clouds spawning behind the turtle.
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
          <Svg width={28} height={24} viewBox="0 0 28 24">
            <Circle
              cx="11"
              cy="13"
              r="7.5"
              fill={colors.textMuted}
              fillOpacity="0.52"
            />
            <Circle
              cx="17"
              cy="11"
              r="6"
              fill={colors.text}
              fillOpacity="0.38"
            />
            <Circle
              cx="14"
              cy="15"
              r="5"
              fill={colors.textMuted}
              fillOpacity="0.4"
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
    left: '26%',
    width: 28,
    height: 24,
  },
  dustParticle: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
