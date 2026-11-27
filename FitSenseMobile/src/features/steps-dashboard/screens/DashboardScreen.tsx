import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useIsFocused, useNavigation, type NavigationProp } from '@react-navigation/native';
import React, { memo, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { MainTabParamList, RootStackParamList } from '../../../app/navigation/types';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { Button, Card, SyncStatusPill } from '../../../components/common';
import { Exercise } from '../../../services/native';
import { syncManager } from '../../../services/sync';
import { useSyncStatus } from '../../../stores/useSyncStatus';
import type { ExerciseActiveSession } from '../../../types/native-interface';
import { useProfile } from '../../profile/useProfile';
import { StepHeroCounter } from '../components/StepHeroCounter';

const SyncErrorBanner = memo(function SyncErrorBanner() {
  const { colors, typography } = useTheme();
  const lastError = useSyncStatus(state => state.lastError);
  const syncing = useSyncStatus(state => state.syncing);

  if (!lastError) {
    return null;
  }

  return (
    <Card style={styles.syncError}>
      <Text
        numberOfLines={2}
        style={[typography.caption, styles.syncErrorText, { color: colors.warning }]}>
        {lastError}
      </Text>
      <Button
        title="Thử lại"
        variant="secondary"
        loading={syncing}
        onPress={() => {
          syncManager.retryFailed().catch(() => {});
        }}
      />
    </Card>
  );
});

export function DashboardScreen() {
  const { colors, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const rootNavigation = useNavigation<NavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();

  const { profile } = useProfile();

  const [activeSession, setActiveSession] = useState<ExerciseActiveSession | null>(null);
  useEffect(() => {
    if (!isFocused) return;
    Exercise.getActiveSession()
      .then(setActiveSession)
      .catch(() => setActiveSession(null));
  }, [isFocused]);

  return (
    <ScrollView
      contentContainerStyle={{
        padding: spacing.lg,
        paddingTop: insets.top + spacing.lg,
        gap: spacing.lg,
      }}
      style={{ backgroundColor: colors.background }}>
      <View style={[styles.header, { gap: spacing.sm }]}>
        <Text
          numberOfLines={1}
          style={[typography.heading, styles.headerTitle, { color: colors.text }]}>
          Hoạt động hôm nay
        </Text>
        <SyncStatusPill />
      </View>

      <SyncErrorBanner />

      <StepHeroCounter profile={profile} />

      <Card style={{ gap: spacing.sm }}>
        <Text style={[typography.label, { color: colors.text }]}>Tập luyện</Text>
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          {activeSession
            ? `Đang tập ${activeSession.type} · ${Math.round(activeSession.distanceM)} m`
            : 'Bắt đầu một buổi chạy hoặc đi bộ để cộng dồn vào hoạt động hôm nay.'}
        </Text>
        <Button
          title={activeSession ? 'Xem buổi tập' : 'Bắt đầu tập luyện'}
          variant="primary"
          onPress={() => navigation.navigate('Exercise')}
        />
      </Card>

      <Card style={{ gap: spacing.sm }}>
        <Text style={[typography.label, { color: colors.text }]}>Kiểm tra cảm biến</Text>
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          Xem accelerometer/gyroscope, nhãn chuyển động và biểu đồ realtime.
        </Text>
        <Button
          title="Mở Sensor Monitor"
          variant="secondary"
          onPress={() => rootNavigation.navigate('SensorMonitor')}
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
  headerTitle: {
    flexShrink: 1,
  },
  syncError: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  syncErrorText: {
    flex: 1,
  },
});
