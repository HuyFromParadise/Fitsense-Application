import React, { useEffect, useState } from 'react';
import { ScrollView, Text } from 'react-native';

import { useTheme } from '../../../app/providers/ThemeProvider';
import { Card } from '../../../components/common';
import { LocalDb, MotionSensor, StepCounter } from '../../../services/native';

export function SensorMonitorScreen() {
  const { colors, spacing, typography } = useTheme();
  const [stepStatus, setStepStatus] = useState('...');
  const [motionLabel, setMotionLabel] = useState('...');
  const [localSteps, setLocalSteps] = useState('...');

  useEffect(() => {
    StepCounter.getStatus().then(setStepStatus).catch(() => setStepStatus('ERROR'));
    MotionSensor.getSnapshot()
      .then(snapshot => setMotionLabel(`${snapshot.label} (${snapshot.confidence})`))
      .catch(() => setMotionLabel('ERROR'));
    LocalDb.getTodayActivity()
      .then(row => setLocalSteps(String(row?.steps ?? 0)))
      .catch(() => setLocalSteps('ERROR'));
  }, []);

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      <Text style={[typography.heading, { color: colors.text }]}>Sensor Monitor</Text>
      <Card style={{ gap: spacing.sm }}>
        <Text style={[typography.body, { color: colors.text }]}>
          StepCounter: {stepStatus}
        </Text>
        <Text style={[typography.body, { color: colors.text }]}>
          MotionSensor: {motionLabel}
        </Text>
        <Text style={[typography.body, { color: colors.text }]}>
          local_activity steps: {localSteps}
        </Text>
      </Card>
      <Text style={[typography.caption, { color: colors.textMuted }]}>
        Giá trị trên lấy từ module native stub (hoặc mock khi chưa build native).
      </Text>
    </ScrollView>
  );
}
