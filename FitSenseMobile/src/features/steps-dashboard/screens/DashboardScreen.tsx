import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import type { MainTabParamList } from '../../../app/navigation/types';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { Button, Card } from '../../../components/common';
import { LocalDb, Exercise } from '../../../services/native';
import { useSyncStatus } from '../../../stores/useSyncStatus';
import { useTodayActivity } from '../../../stores/useTodayActivity';
import type { ExerciseActiveSession, StepSnapshotRow } from '../../../types/native-interface';
import { deviceTimeZone } from '../../../utils/date';
import { useProfile } from '../../profile/useProfile';
import { dashboardMetrics } from '../dashboardMetrics';
import { useStepCounter } from '../useStepCounter';

function GoalRing({ progress, steps, goal }: { progress: number; steps: number; goal: number }) {
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
        <Text style={[typography.title, { color: colors.text }]}>{steps.toLocaleString()}</Text>
        <Text style={[typography.caption, { color: colors.textMuted }]}>/ {goal.toLocaleString()} bước</Text>
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const { colors, typography } = useTheme();
  return (
    <View style={styles.stat}>
      <Text style={[typography.heading, { color: colors.text }]}>{value}</Text>
      <Text style={[typography.caption, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

export function DashboardScreen() {
  const { colors, spacing, typography } = useTheme();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const isFocused = useIsFocused();

  const { profile } = useProfile();
  const { snapshot, status, permission, requestPermission, isListening } = useStepCounter();
  const activity = useTodayActivity();
  const refreshActivity = useTodayActivity(state => state.refresh);
  const syncStatus = useSyncStatus();

  const [activeSession, setActiveSession] = useState<ExerciseActiveSession | null>(null);
  useEffect(() => {
    if (!isFocused) return;
    Exercise.getActiveSession()
      .then(setActiveSession)
      .catch(() => setActiveSession(null));
  }, [isFocused]);

  const steps = snapshot?.stepsToday ?? activity.steps;
  const metrics = useMemo(() => dashboardMetrics(steps, profile), [steps, profile]);

  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;
  const metricsRef = useRef(metrics);
  metricsRef.current = metrics;
  const lastWriteRef = useRef(0);

  const persist = useCallback(
    async (row: StepSnapshotRow) => {
      await LocalDb.upsertTodayActivity(row);
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
      LocalDb.upsertTodayActivity({
        date: latest.date,
        timezoneId: deviceTimeZone(),
        steps: current.steps,
        distanceM: current.distanceM,
        calories: current.calories,
        activeMinutes: current.activeMinutes,
        updatedAtMs: Date.now(),
        syncState: 'PENDING',
      }).catch(() => {});
    },
    [],
  );

  const handlePermission = () => {
    requestPermission().catch(() => {});
  };

  const permissionBlocked = status === 'PERMISSION_DENIED' || permission !== 'GRANTED';
  const syncLabel =
    syncStatus.pending > 0 ? `${syncStatus.pending} chờ đồng bộ` : 'Đã đồng bộ';

  return (
    <ScrollView
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
      style={{ backgroundColor: colors.background }}>
      <View style={styles.header}>
        <Text style={[typography.heading, { color: colors.text }]}>Hoạt động hôm nay</Text>
        <View
          style={[
            styles.chip,
            { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
          ]}>
          <Text
            style={[
              typography.caption,
              { color: syncStatus.pending > 0 ? colors.warning : colors.success },
            ]}>
            {syncLabel}
          </Text>
        </View>
      </View>

      <Card style={styles.hero}>
        <GoalRing progress={metrics.goalProgress} steps={metrics.steps} goal={metrics.goalSteps} />
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          {Math.round(metrics.goalProgress * 100)}% mục tiêu ngày
        </Text>
      </Card>

      <Card style={styles.row}>
        <Stat label="km" value={(metrics.distanceM / 1000).toFixed(2)} />
        <Stat label="kcal" value={String(Math.round(metrics.calories))} />
        <Stat label="phút vận động" value={String(metrics.activeMinutes)} />
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
          <Text style={[typography.label, { color: colors.text }]}>Cần quyền theo dõi vận động</Text>
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

      <Card style={{ gap: spacing.sm }}>
        <Text style={[typography.label, { color: colors.text }]}>Tập luyện</Text>
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          {activeSession
            ? `Đang tập ${activeSession.type} · ${Math.round(activeSession.distanceM)} m`
            : 'Bắt đầu một buổi chạy hoặc đi bộ để cộng dồn vào hoạt động hôm nay.'}
        </Text>
        <Button
          title={activeSession ? 'Xem buổi tập' : 'Bắt đầu tập luyện'}
          variant="secondary"
          onPress={() => navigation.navigate('Exercise')}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
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
