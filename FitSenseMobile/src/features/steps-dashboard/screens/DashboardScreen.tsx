import { useQuery } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../../app/providers/ThemeProvider';
import { Button, Card, ErrorState, Loading } from '../../../components/common';
import { fetchHealth } from '../../../services/api';
import { useTodayActivity } from '../../../stores/useTodayActivity';
import type { RootStackParamList } from '../../../app/navigation/types';

function Stat({ label, value }: { label: string; value: string }) {
  const { colors, typography } = useTheme();
  return (
    <View style={styles.stat}>
      <Text style={[typography.title, { color: colors.text }]}>{value}</Text>
      <Text style={[typography.caption, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

export function DashboardScreen() {
  const { colors, spacing, typography } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const health = useQuery({ queryKey: ['health'], queryFn: fetchHealth });
  const activity = useTodayActivity();
  const refresh = useTodayActivity(state => state.refresh);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <ScrollView
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
      style={{ backgroundColor: colors.background }}>
      <Text style={[typography.heading, { color: colors.text }]}>Hoạt động hôm nay</Text>

      {activity.isLoading ? (
        <Loading message="Đang đọc local_activity..." />
      ) : (
        <Card style={styles.row}>
          <Stat label="Bước" value={String(activity.steps)} />
          <Stat label="km" value={(activity.distanceM / 1000).toFixed(2)} />
          <Stat label="kcal" value={String(Math.round(activity.calories))} />
          <Stat label="phút" value={String(activity.activeMinutes)} />
        </Card>
      )}

      <Card style={{ gap: spacing.sm }}>
        <Text style={[typography.label, { color: colors.text }]}>Backend /api/health</Text>
        {health.isLoading ? (
          <Loading message="Đang gọi backend..." />
        ) : health.isError ? (
          <ErrorState
            message={health.error instanceof Error ? health.error.message : 'Không gọi được backend'}
            onRetry={() => health.refetch()}
          />
        ) : (
          <Text style={[typography.body, { color: colors.success }]}>
            {health.data?.status} · {health.data?.service} · auth: {health.data?.authMode}
          </Text>
        )}
      </Card>

      <Button
        title="Mở Sensor Monitor"
        variant="secondary"
        onPress={() => navigation.navigate('SensorMonitor')}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
});
