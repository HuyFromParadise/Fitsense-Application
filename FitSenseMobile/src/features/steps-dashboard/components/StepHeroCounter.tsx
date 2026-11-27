import { useIsFocused } from '@react-navigation/native';
import { Flame, MapPin, Timer } from 'lucide-react-native';
import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '../../../app/providers/ThemeProvider';
import { Button, Card } from '../../../components/common';
import { LocalDb } from '../../../services/native';
import { syncManager } from '../../../services/sync';
import { useTodayActivity } from '../../../stores/useTodayActivity';
import { tabularNums } from '../../../theme';
import type { StepSnapshotRow } from '../../../types/native-interface';
import { deviceTimeZone } from '../../../utils/date';
import { dashboardMetrics } from '../dashboardMetrics';
import { useStepCounter } from '../useStepCounter';

const stepsFormatter = new Intl.NumberFormat();

const GoalRing = memo(function GoalRing({
  progress,
  steps,
  goal,
}: {
  progress: number;
  steps: number;
  goal: number;
}) {
  const { colors, typography } = useTheme();
  const size = 190;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <View style={[styles.ring, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.border}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.primary}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - progress)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.ringCenter}>
        <Text
          style={[
            typography.hero,
            tabularNums,
            { color: colors.text, fontSize: 32, fontWeight: '700' },
          ]}>
          {stepsFormatter.format(steps)}
        </Text>
        <Text
          style={[
            typography.caption,
            tabularNums,
            { color: colors.primary, fontWeight: '600' },
          ]}>
          / {stepsFormatter.format(goal)} bước
        </Text>
      </View>
    </View>
  );
});

const StatItem = memo(function StatItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  const { colors, spacing, typography } = useTheme();
  return (
    <View style={[styles.stat, { gap: spacing.xs }]}>
      {icon}
      <Text style={[typography.heading, tabularNums, { color: colors.text }]}>
        {value}
      </Text>
      <Text style={[typography.caption, { color: colors.textMuted }]}>
        {label}
      </Text>
    </View>
  );
});

export interface StepHeroCounterProps {
  profile: Parameters<typeof dashboardMetrics>[1];
}

/**
 * Isolated leaf component consuming high-frequency step updates and Room DB
 * fallback so the parent DashboardScreen does not re-render on sensor ticks.
 */
export const StepHeroCounter = memo(function StepHeroCounter({
  profile,
}: StepHeroCounterProps) {
  const { colors, spacing, typography } = useTheme();
  const isFocused = useIsFocused();

  const { snapshot, status, permission, requestPermission, isListening } = useStepCounter();
  const storedSteps = useTodayActivity(state => state.steps);
  const refreshActivity = useTodayActivity(state => state.refresh);

  useEffect(() => {
    if (!isFocused) return;
    // Read persisted Room DB activity immediately so offline/cold-start UI renders without waiting for native ticks.
    refreshActivity().catch(() => {});
  }, [isFocused, refreshActivity]);

  const steps = snapshot?.stepsToday ?? storedSteps;
  const metrics = useMemo(() => dashboardMetrics(steps, profile), [steps, profile]);

  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;
  const metricsRef = useRef(metrics);
  metricsRef.current = metrics;
  const lastWriteRef = useRef(0);

  const persist = useCallback(
    async (row: StepSnapshotRow) => {
      await LocalDb.upsertTodayActivity(row);
      await syncManager.enqueueDailyActivity(row).catch(() => {});
      await refreshActivity();
    },
    [refreshActivity],
  );

  useEffect(() => {
    if (!snapshot) return;
    const now = Date.now();
    if (now - lastWriteRef.current < 10_000) return;
    lastWriteRef.current = now;
    persist({
      date: snapshot.date,
      timezoneId: deviceTimeZone(),
      steps: metrics.steps,
      distanceM: metrics.distanceM,
      calories: metrics.calories,
      activeMinutes: metrics.activeMinutes,
      updatedAtMs: Date.now(),
      syncState: 'PENDING',
    }).catch(() => {});
  }, [snapshot, metrics, persist]);

  useEffect(
    () => () => {
      const latest = snapshotRef.current;
      if (!latest) return;
      const current = metricsRef.current;
      const row = {
        date: latest.date,
        timezoneId: deviceTimeZone(),
        steps: current.steps,
        distanceM: current.distanceM,
        calories: current.calories,
        activeMinutes: current.activeMinutes,
        updatedAtMs: Date.now(),
        syncState: 'PENDING' as const,
      };
      LocalDb.upsertTodayActivity(row)
        .then(() => syncManager.enqueueDailyActivity(row))
        .catch(() => {});
    },
    [],
  );

  const handlePermission = () => {
    requestPermission().catch(() => {});
  };

  const permissionBlocked = status === 'PERMISSION_DENIED' || permission !== 'GRANTED';

  return (
    <View style={{ gap: spacing.lg }}>
      <Card style={styles.hero}>
        <GoalRing
          progress={metrics.goalProgress}
          steps={metrics.steps}
          goal={metrics.goalSteps}
        />
        <Text style={[typography.caption, tabularNums, { color: colors.textMuted }]}>
          {Math.round(metrics.goalProgress * 100)}% mục tiêu ngày
        </Text>
      </Card>

      <Card style={styles.row}>
        <StatItem
          icon={<MapPin size={18} color={colors.primary} strokeWidth={2} />}
          label="km"
          value={(metrics.distanceM / 1000).toFixed(2)}
        />
        <StatItem
          icon={<Flame size={18} color={colors.primary} strokeWidth={2} />}
          label="kcal"
          value={String(Math.round(metrics.calories))}
        />
        <StatItem
          icon={<Timer size={18} color={colors.primary} strokeWidth={2} />}
          label="phút vận động"
          value={String(metrics.activeMinutes)}
        />
      </Card>

      {status === 'UNAVAILABLE' ? (
        <Card style={{ gap: spacing.sm }}>
          <Text style={[typography.label, { color: colors.text }]}>
            Thiết bị không có cảm biến đếm bước
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            Số liệu vẫn được đồng bộ từ các ngày trước nếu có.
          </Text>
        </Card>
      ) : permissionBlocked ? (
        <Card style={{ gap: spacing.sm }}>
          <Text style={[typography.label, { color: colors.text }]}>
            Cần quyền theo dõi vận động
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            FitSense dùng quyền ACTIVITY_RECOGNITION để đọc bộ đếm bước của thiết bị.
          </Text>
          {permission === 'PERMANENTLY_DENIED' ? (
            <Button
              title="Mở cài đặt"
              variant="secondary"
              onPress={() => {
                Linking.openSettings().catch(() => {});
              }}
            />
          ) : (
            <Button title="Cấp quyền" onPress={handlePermission} />
          )}
        </Card>
      ) : (
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          {isListening ? 'Đang theo dõi bước chân' : 'Chưa theo dõi bước chân'}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: 8,
  },
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
});
