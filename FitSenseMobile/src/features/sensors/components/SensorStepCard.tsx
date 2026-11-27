import { Footprints } from 'lucide-react-native';
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../../app/providers/ThemeProvider';
import { Card } from '../../../components/common';
import { tabularNums } from '../../../theme';
import { useStepCounter } from '../../steps-dashboard/useStepCounter';

const stepsFormatter = new Intl.NumberFormat('vi-VN');

/**
 * Isolated leaf component for live step readout on SensorMonitorScreen.
 */
export const SensorStepCard = memo(function SensorStepCard() {
  const { colors, radius, spacing, typography } = useTheme();
  const { snapshot } = useStepCounter();

  return (
    <Card style={{ gap: spacing.sm }}>
      <View style={[styles.headerRow, { gap: spacing.xs }]}>
        <View
          style={[
            styles.iconBadge,
            {
              backgroundColor: colors.primaryMuted,
              borderRadius: radius.sm,
              padding: spacing.xs,
            },
          ]}>
          <Footprints size={16} color={colors.primary} strokeWidth={2} />
        </View>
        <Text style={[typography.label, { color: colors.text }]}>
          Bước chân hôm nay
        </Text>
      </View>
      <Text style={[typography.title, tabularNums, { color: colors.text }]}>
        {stepsFormatter.format(snapshot?.stepsToday ?? 0)} bước
      </Text>
    </Card>
  );
});

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBadge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
