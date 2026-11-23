import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { useTheme } from '../../../app/providers/ThemeProvider';
import { ROAD_SEGMENT_WIDTH } from '../animations/useRunningTurtleAnimation';

export interface AnimatedRoadProps {
  roadTranslateX: Animated.AnimatedInterpolation<number>;
}

const ROAD_DASH_INDEXES = [0, 1, 2, 3, 4, 5, 6, 7];

/**
 * Seamless right-to-left scrolling road with synchronized lane markings.
 */
export function AnimatedRoad({ roadTranslateX }: AnimatedRoadProps) {
  const { colors, radius } = useTheme();

  return (
    <View
      pointerEvents="none"
      style={[
        styles.roadContainer,
        {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
      ]}>
      <View
        style={[
          styles.roadTopCurb,
          { backgroundColor: colors.primary },
        ]}
      />

      <Animated.View
        style={[
          styles.roadDashesRow,
          { transform: [{ translateX: roadTranslateX }] },
        ]}>
        {ROAD_DASH_INDEXES.map(idx => (
          <View key={`road-dash-${idx}`} style={styles.roadDashSegment}>
            <View
              style={[
                styles.roadDashPill,
                {
                  backgroundColor: colors.textMuted,
                  borderRadius: radius.pill,
                },
              ]}
            />
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  roadContainer: {
    width: '100%',
    height: 54,
    borderTopWidth: 2,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  roadTopCurb: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    opacity: 0.45,
  },
  roadDashesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: ROAD_SEGMENT_WIDTH * 8,
  },
  roadDashSegment: {
    width: ROAD_SEGMENT_WIDTH,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  roadDashPill: {
    width: 28,
    height: 5,
    opacity: 0.45,
  },
});
