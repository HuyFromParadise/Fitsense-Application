import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useIsFocused, useNavigation, type NavigationProp } from '@react-navigation/native';
import { Activity, ChevronRight, Cpu, Target } from 'lucide-react-native';
import React, { memo, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { MainTabParamList, RootStackParamList } from '../../../app/navigation/types';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { Button, Card, SyncStatusPill } from '../../../components/common';
import { Exercise } from '../../../services/native';
import { syncManager } from '../../../services/sync';
import { useSyncStatus } from '../../../stores/useSyncStatus';
import { tabularNums } from '../../../theme';
import type { ExerciseActiveSession } from '../../../types/native-interface';
import { useProfile } from '../../profile/useProfile';
import { StepHeroCounter } from '../components/StepHeroCounter';

const todayDateFormatter = new Intl.DateTimeFormat('vi-VN', {
  weekday: 'long',
  day: '2-digit',
  month: '2-digit',
});

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
  const { colors, radius, spacing, typography } = useTheme();
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

  const greeting = profile?.displayName
    ? `Xin chào, ${profile.displayName}`
    : 'Hoạt động hôm nay';
  const dateLabel = todayDateFormatter.format(new Date());

  return (
    <ScrollView
      contentContainerStyle={{
        padding: spacing.lg,
        paddingTop: insets.top + spacing.lg,
        paddingBottom: Math.max(insets.bottom, spacing.xl),
        gap: spacing.lg,
      }}
      style={{ backgroundColor: colors.background }}>
      <View style={[styles.header, { gap: spacing.sm }]}>
        <View style={styles.headerText}>
          <Text
            numberOfLines={1}
            style={[typography.title, { color: colors.text }]}>
            {greeting}
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted, textTransform: 'capitalize' }]}>
            {dateLabel}
          </Text>
        </View>
        <SyncStatusPill />
      </View>

      <SyncErrorBanner />

      <StepHeroCounter profile={profile} />

      <Card style={{ gap: spacing.md }}>
        <View style={[styles.cardTitleRow, { gap: spacing.sm }]}>
          <View
            style={[
              styles.iconBadge,
              {
                backgroundColor: colors.primaryMuted,
                borderRadius: radius.md,
              },
            ]}>
            <Activity size={20} color={colors.primary} strokeWidth={2} />
          </View>
          <View style={styles.flex}>
            <Text style={[typography.heading, { color: colors.text }]}>
              Tập luyện GPS
            </Text>
            <Text style={[typography.caption, tabularNums, { color: colors.textMuted }]}>
              {activeSession
                ? `Đang tập ${activeSession.type} · ${Math.round(activeSession.distanceM)} m`
                : 'Bắt đầu một buổi chạy hoặc đi bộ để ghi lộ trình.'}
            </Text>
          </View>
        </View>
        <Button
          title={activeSession ? 'Xem buổi tập' : 'Bắt đầu tập luyện'}
          variant="primary"
          onPress={() => navigation.navigate('Exercise')}
        />
      </Card>

      <View style={[styles.quickRow, { gap: spacing.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mở mục tiêu"
          onPress={() => navigation.navigate('Goals')}
          style={({ pressed }) => [
            styles.flex,
            { opacity: pressed ? 0.85 : 1 },
          ]}>
          <Card style={[styles.quickCard, { gap: spacing.sm }]}>
            <View style={styles.quickHeader}>
              <View
                style={[
                  styles.iconBadgeSmall,
                  {
                    backgroundColor: colors.primaryMuted,
                    borderRadius: radius.sm,
                  },
                ]}>
                <Target size={16} color={colors.primary} strokeWidth={2} />
              </View>
              <ChevronRight size={16} color={colors.textMuted} strokeWidth={2} />
            </View>
            <Text style={[typography.label, { color: colors.text }]}>
              Mục tiêu
            </Text>
            <Text numberOfLines={2} style={[typography.caption, { color: colors.textMuted }]}>
              Theo dõi chỉ tiêu ngày & tuần
            </Text>
          </Card>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mở Sensor Monitor"
          onPress={() => rootNavigation.navigate('SensorMonitor')}
          style={({ pressed }) => [
            styles.flex,
            { opacity: pressed ? 0.85 : 1 },
          ]}>
          <Card style={[styles.quickCard, { gap: spacing.sm }]}>
            <View style={styles.quickHeader}>
              <View
                style={[
                  styles.iconBadgeSmall,
                  {
                    backgroundColor: colors.primaryMuted,
                    borderRadius: radius.sm,
                  },
                ]}>
                <Cpu size={16} color={colors.primary} strokeWidth={2} />
              </View>
              <ChevronRight size={16} color={colors.textMuted} strokeWidth={2} />
            </View>
            <Text style={[typography.label, { color: colors.text }]}>
              Sensor Monitor
            </Text>
            <Text numberOfLines={2} style={[typography.caption, { color: colors.textMuted }]}>
              Cảm biến gia tốc & con quay
            </Text>
          </Card>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
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
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBadge: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickRow: {
    flexDirection: 'row',
  },
  quickCard: {
    flex: 1,
  },
  quickHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBadgeSmall: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
