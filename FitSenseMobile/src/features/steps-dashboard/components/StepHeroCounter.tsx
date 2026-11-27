import { useIsFocused } from '@react-navigation/native';
import {
  CheckCircle2,
  Flame,
  Footprints,
  MapPin,
  Radio,
  Timer,
} from 'lucide-react-native';
import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '../../../app/providers/ThemeProvider';
import { Button, Card, MetricTile } from '../../../components/common';
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
  const { colors, radius, spacing, typography } = useTheme();
  const size = 204;
  const stroke = 14;
  const ringRadius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * ringRadius;
  const isCompleted = progress >= 1;
  const ringColor = isCompleted ? colors.success : colors.primary;

  return (
    <View style={[styles.ring, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={ringRadius}
          stroke={colors.surfaceAlt}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={ringRadius}
          stroke={ringColor}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - progress)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[styles.ringCenter, { gap: spacing.xs }]}>
        <View
          style={[
            styles.ringIconBadge,
            {
              backgroundColor: isCompleted ? colors.surfaceAlt : colors.primaryMuted,
              borderRadius: radius.pill,
              padding: spacing.xs,
            },
          ]}>
          <Footprints size={18} color={ringColor} strokeWidth={2.2} />
        </View>
        <Text
          style={[
            typography.hero,
            tabularNums,
            { color: colors.text },
          ]}>
          {stepsFormatter.format(steps)}
        </Text>
        <Text
          style={[
            typography.caption,
            tabularNums,
            { color: colors.textMuted, fontWeight: '600' },
          ]}>
          / {stepsFormatter.format(goal)} bước
        </Text>
      </View>
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
  const { colors, radius, spacing, typography } = useTheme();
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
  const pct = Math.round(metrics.goalProgress * 100);
  const remainingSteps = Math.max(0, metrics.goalSteps - metrics.steps);
  const isCompleted = metrics.goalProgress >= 1;

  return (
    <View style={{ gap: spacing.lg }}>
      <Card style={[styles.hero, { gap: spacing.md }]}>
        <GoalRing
          progress={metrics.goalProgress}
          steps={metrics.steps}
          goal={metrics.goalSteps}
        />

        <View style={[styles.heroMetaRow, { gap: spacing.sm }]}>
          <View
            style={[
              styles.goalBadge,
              {
                backgroundColor: isCompleted ? colors.surfaceAlt : colors.primaryMuted,
                borderRadius: radius.pill,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.xs,
                gap: spacing.xs,
              },
            ]}>
            {isCompleted ? (
              <CheckCircle2 size={14} color={colors.success} strokeWidth={2.2} />
            ) : null}
            <Text
              style={[
                typography.label,
                tabularNums,
                { color: isCompleted ? colors.success : colors.primary },
              ]}>
              {pct}% mục tiêu ngày
            </Text>
          </View>

          {status === 'AVAILABLE' && !permissionBlocked ? (
            <View
              style={[
                styles.liveBadge,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderRadius: radius.pill,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.xs,
                  gap: spacing.xs,
                },
              ]}>
              <Radio
                size={12}
                color={isListening ? colors.success : colors.textMuted}
                strokeWidth={2.2}
              />
              <Text
                style={[
                  typography.caption,
                  { color: isListening ? colors.success : colors.textMuted },
                ]}>
                {isListening ? 'Đang đếm' : 'Tạm dừng'}
              </Text>
            </View>
          ) : null}
        </View>

        <Text style={[typography.caption, tabularNums, { color: colors.textMuted }]}>
          {isCompleted
            ? 'Tuyệt vời! Bạn đã đạt mục tiêu bước chân hôm nay.'
            : `Còn ${stepsFormatter.format(remainingSteps)} bước nữa để hoàn thành mục tiêu`}
        </Text>
      </Card>

      <View style={[styles.metricsRow, { gap: spacing.sm }]}>
        <MetricTile
          icon={<MapPin size={14} color={colors.primary} strokeWidth={2} />}
          label="Quãng đường"
          value={(metrics.distanceM / 1000).toFixed(2)}
          unit="km"
          style={styles.flex}
        />
        <MetricTile
          icon={<Flame size={14} color={colors.primary} strokeWidth={2} />}
          label="Calo"
          value={String(Math.round(metrics.calories))}
          unit="kcal"
          style={styles.flex}
        />
        <MetricTile
          icon={<Timer size={14} color={colors.primary} strokeWidth={2} />}
          label="Vận động"
          value={String(metrics.activeMinutes)}
          unit="phút"
          style={styles.flex}
        />
      </View>

      {status === 'UNAVAILABLE' ? (
        <Card style={{ gap: spacing.xs }}>
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
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  hero: {
    alignItems: 'center',
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
  ringIconBadge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  goalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
  },
});
