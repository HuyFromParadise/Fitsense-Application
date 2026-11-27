import { Flame, Gauge, Route, Zap } from 'lucide-react-native';
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../../app/providers/ThemeProvider';
import { MetricTile } from '../../../components/common';
import { tabularNums } from '../../../theme';
import {
  formatDistanceKm,
  formatDuration,
  formatPace,
  formatSpeedKmh,
} from '../exerciseUtils';

export interface LivePaceReadoutProps {
  elapsedSeconds: number;
  distanceM: number;
  avgPaceSecPerKm: number | null;
  currentSpeedMps: number;
  calories: number;
}

/**
 * Isolated leaf component rendering the 1Hz workout timer and telemetry grid
 * with tabular-nums so digits never jitter during live tracking.
 */
export const LivePaceReadout = memo(function LivePaceReadout({
  elapsedSeconds,
  distanceM,
  avgPaceSecPerKm,
  currentSpeedMps,
  calories,
}: LivePaceReadoutProps) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View>
      <View style={[styles.timerContainer, { marginBottom: spacing.sm }]}>
        <Text
          style={[
            typography.caption,
            styles.timerLabel,
            { color: colors.textMuted },
          ]}>
          THỜI GIAN
        </Text>
        <Text style={[styles.timerValue, tabularNums, { color: colors.text }]}>
          {formatDuration(elapsedSeconds)}
        </Text>
      </View>

      <View
        style={[
          styles.metricsGrid,
          { gap: spacing.sm, marginBottom: spacing.md },
        ]}>
        <MetricTile
          icon={<Route size={14} color={colors.primary} strokeWidth={2} />}
          label="Quãng đường"
          value={formatDistanceKm(distanceM)}
          unit="km"
          style={styles.metricCard}
        />
        <MetricTile
          icon={<Gauge size={14} color={colors.primary} strokeWidth={2} />}
          label="Pace TB"
          value={formatPace(avgPaceSecPerKm)}
          unit="/km"
          style={styles.metricCard}
        />
        <MetricTile
          icon={<Zap size={14} color={colors.primary} strokeWidth={2} />}
          label="Tốc độ"
          value={formatSpeedKmh(currentSpeedMps)}
          unit="km/h"
          style={styles.metricCard}
        />
        <MetricTile
          icon={<Flame size={14} color={colors.primary} strokeWidth={2} />}
          label="Calo"
          value={calories.toFixed(0)}
          unit="kcal"
          style={styles.metricCard}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  timerContainer: {
    alignItems: 'center',
  },
  timerLabel: {
    letterSpacing: 1,
  },
  timerValue: {
    fontSize: 38,
    fontWeight: '700',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metricCard: {
    width: '48.5%',
  },
});
