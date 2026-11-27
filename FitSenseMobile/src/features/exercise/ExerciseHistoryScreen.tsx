import { FlashList } from '@shopify/flash-list';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  CloudUpload,
  RefreshCw,
  WifiOff,
} from 'lucide-react-native';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../app/providers/ThemeProvider';
import {
  Card,
  EmptyState,
  ErrorState,
  SkeletonLoader,
} from '../../components/common';
import { toExerciseCreatePayload } from '../../services/sync/exerciseSync';
import { tabularNums } from '../../theme';
import { exerciseApi } from './exerciseApi';
import { exerciseNative } from './exerciseNative';
import {
  EXERCISE_TYPE_META,
  formatDateTime,
  formatDistanceKm,
  formatDuration,
  formatPace,
} from './exerciseUtils';
import { ExerciseSummary, ExerciseType } from './types';

interface ExerciseHistoryScreenProps {
  navigation: any;
}

const ExerciseHistoryRow = memo(function ExerciseHistoryRow({
  item,
  onPress,
}: {
  item: ExerciseSummary;
  onPress: (item: ExerciseSummary) => void;
}) {
  const { colors, radius, spacing, typography } = useTheme();
  const meta = EXERCISE_TYPE_META[item.type];
  const isPending = item.isLocalOnly || item.syncState === 'PENDING';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(item)}
      style={({ pressed }) => ({
        marginBottom: spacing.md,
        opacity: pressed ? 0.88 : 1,
      })}>
      <Card style={{ padding: spacing.md }}>
        <View style={[styles.itemHeader, { marginBottom: spacing.md }]}>
          <View style={[styles.typeBadge, { gap: spacing.sm }]}>
            <Text style={styles.typeIcon}>{meta.icon}</Text>
            <View>
              <Text style={[typography.heading, { color: meta.color }]}>
                {meta.label}
              </Text>
              <Text
                style={[
                  typography.caption,
                  tabularNums,
                  { color: colors.textMuted, marginTop: 2 },
                ]}>
                {formatDateTime(item.startedAt)}
              </Text>
            </View>
          </View>

          {isPending ? (
            <View
              style={[
                styles.pendingChip,
                {
                  backgroundColor: colors.primaryMuted,
                  borderRadius: radius.pill,
                },
              ]}>
              <Text
                style={[
                  typography.caption,
                  { color: colors.warning, fontWeight: '700' },
                ]}>
                Chưa sync
              </Text>
            </View>
          ) : null}
        </View>

        <View
          style={[
            styles.statsRow,
            { paddingTop: spacing.sm, borderColor: colors.border },
          ]}>
          <View style={styles.statCol}>
            <Text
              style={[
                typography.caption,
                { color: colors.textMuted, marginBottom: 2 },
              ]}>
              Quãng đường
            </Text>
            <Text style={[typography.label, tabularNums, { color: colors.text }]}>
              {formatDistanceKm(item.metrics.distanceM)} km
            </Text>
          </View>

          <View style={styles.statCol}>
            <Text
              style={[
                typography.caption,
                { color: colors.textMuted, marginBottom: 2 },
              ]}>
              Thời gian
            </Text>
            <Text style={[typography.label, tabularNums, { color: colors.text }]}>
              {formatDuration(item.metrics.durationSeconds)}
            </Text>
          </View>

          <View style={styles.statCol}>
            <Text
              style={[
                typography.caption,
                { color: colors.textMuted, marginBottom: 2 },
              ]}>
              Pace
            </Text>
            <Text style={[typography.label, tabularNums, { color: colors.text }]}>
              {formatPace(item.metrics.avgPaceSecPerKm)}
            </Text>
          </View>

          <View style={styles.statCol}>
            <Text
              style={[
                typography.caption,
                { color: colors.textMuted, marginBottom: 2 },
              ]}>
              Calo
            </Text>
            <Text style={[typography.label, tabularNums, { color: colors.text }]}>
              {item.metrics.calories.toFixed(0)} kcal
            </Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );
});

export const ExerciseHistoryScreen: React.FC<ExerciseHistoryScreenProps> = ({
  navigation,
}) => {
  const { colors, spacing, radius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState<ExerciseType | undefined>(undefined);
  const [page, setPage] = useState(0);
  const [localList, setLocalList] = useState<ExerciseSummary[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const loadLocalSessions = useCallback(async () => {
    try {
      const localRows = await exerciseNative.getLocalExercises(50, 0);
      const pending = localRows.filter(
        r => r.status === 'FINISHED' && r.syncState !== 'SYNCED',
      );
      setPendingCount(pending.length);

      const mapped: ExerciseSummary[] = localRows
        .filter(r => r.status === 'FINISHED')
        .filter(r => !filterType || r.type === filterType)
        .map(r => ({
          id: r.id,
          type: r.type,
          status: r.status,
          startedAt: new Date(r.startedAtMs).toISOString(),
          endedAt: r.endedAtMs ? new Date(r.endedAtMs).toISOString() : null,
          pausedSeconds: Math.floor(r.pausedTotalMs / 1000),
          isLocalOnly: r.syncState !== 'SYNCED',
          syncState: r.syncState,
          metrics: {
            distanceM: r.distanceM,
            durationSeconds: r.durationSeconds,
            avgPaceSecPerKm:
              r.distanceM > 0 ? r.durationSeconds / (r.distanceM / 1000) : null,
            avgSpeedMps: r.durationSeconds > 0 ? r.distanceM / r.durationSeconds : 0,
            calories: r.calories,
          },
        }));
      setLocalList(mapped);
    } catch (err) {
      console.warn('Error loading local exercises:', err);
    }
  }, [filterType]);

  useEffect(() => {
    loadLocalSessions();
  }, [loadLocalSessions]);

  const {
    data: remoteData,
    isLoading,
    isRefetching,
    refetch,
    isError,
  } = useQuery({
    queryKey: ['exercises', page, filterType],
    queryFn: () => exerciseApi.getExercises(page, 20, filterType),
    retry: 1,
  });

  const handleSyncPending = useCallback(async () => {
    setSyncing(true);
    try {
      const pendingRows = await exerciseNative.getPendingSyncExercises(20);
      let syncedCount = 0;
      for (const row of pendingRows) {
        const pts = await exerciseNative.getLocalExercisePoints(row.id);
        const payload = toExerciseCreatePayload(row, pts);
        await exerciseApi.createExercise({
          id: payload.id,
          type: payload.type,
          status: payload.status,
          startedAt: payload.startedAt,
          endedAt: payload.endedAt,
          pausedSeconds: payload.pausedSeconds,
          gpsPoints: payload.gpsPoints,
          metrics: payload.metrics,
        });
        await exerciseNative.markSessionSynced(row.id);
        syncedCount++;
      }
      if (syncedCount > 0) {
        Alert.alert('Đồng bộ thành công', `Đã đẩy ${syncedCount} buổi tập lên cloud.`);
        await loadLocalSessions();
        queryClient.invalidateQueries({ queryKey: ['exercises'] });
        queryClient.invalidateQueries({ queryKey: ['analytics'] });
      }
    } catch {
      Alert.alert('Chưa thể đồng bộ', 'Vui lòng kiểm tra kết nối mạng và thử lại.');
    } finally {
      setSyncing(false);
    }
  }, [loadLocalSessions, queryClient]);

  const handleRefresh = useCallback(async () => {
    await loadLocalSessions();
    await refetch();
  }, [loadLocalSessions, refetch]);

  const mergedItems = useMemo(() => {
    const remoteItems = remoteData?.items || [];
    const remoteIds = new Set(remoteItems.map(it => it.id));
    const localOnly = localList.filter(it => !remoteIds.has(it.id));
    return [...localOnly, ...remoteItems];
  }, [remoteData?.items, localList]);

  const handleSelectItem = useCallback(
    (item: ExerciseSummary) => {
      navigation.navigate('ExerciseDetail', {
        exerciseId: item.id,
        fallbackSummary: item,
      });
    },
    [navigation],
  );

  const keyExtractor = useCallback((item: ExerciseSummary) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: ExerciseSummary }) => (
      <ExerciseHistoryRow item={item} onPress={handleSelectItem} />
    ),
    [handleSelectItem],
  );

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Exercise Type Filter Bar */}
      <View
        style={[
          styles.filterRow,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            padding: spacing.md,
            gap: spacing.xs,
          },
        ]}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: !filterType }}
          style={({ pressed }) => [
            styles.filterPill,
            {
              backgroundColor: !filterType ? colors.primary : colors.surfaceAlt,
              borderRadius: radius.pill,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          onPress={() => {
            setFilterType(undefined);
            setPage(0);
          }}>
          <Text
            style={[
              typography.caption,
              {
                color: !filterType ? colors.onPrimary : colors.textMuted,
                fontWeight: '700',
              },
            ]}>
            Tất cả
          </Text>
        </Pressable>

        {(['WALKING', 'RUNNING', 'CYCLING'] as ExerciseType[]).map(type => {
          const m = EXERCISE_TYPE_META[type];
          const active = filterType === type;
          return (
            <Pressable
              key={type}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [
                styles.filterPill,
                {
                  backgroundColor: active ? colors.primary : colors.surfaceAlt,
                  borderRadius: radius.pill,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              onPress={() => {
                setFilterType(type);
                setPage(0);
              }}>
              <Text
                numberOfLines={1}
                style={[
                  typography.caption,
                  {
                    color: active ? colors.onPrimary : colors.textMuted,
                    fontWeight: '700',
                  },
                ]}>
                {m.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Sync Pending Banner */}
      {pendingCount > 0 ? (
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.syncBanner,
            {
              backgroundColor: colors.primaryMuted,
              borderColor: colors.primary,
              padding: spacing.sm,
              gap: spacing.xs,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          disabled={syncing}
          onPress={handleSyncPending}>
          {syncing ? (
            <RefreshCw size={14} color={colors.primary} strokeWidth={2.2} />
          ) : (
            <CloudUpload size={14} color={colors.primary} strokeWidth={2.2} />
          )}
          <Text style={[typography.caption, tabularNums, { color: colors.primary, fontWeight: '700' }]}>
            {syncing
              ? 'Đang đồng bộ dữ liệu lên cloud...'
              : `Có ${pendingCount} buổi tập offline. Bấm để đồng bộ ngay!`}
          </Text>
        </Pressable>
      ) : null}

      {/* Offline Info Banner */}
      {isError ? (
        <View
          style={[
            styles.offlineBanner,
            {
              backgroundColor: colors.surfaceAlt,
              paddingVertical: spacing.xs,
              gap: spacing.xs,
            },
          ]}>
          <WifiOff size={14} color={colors.warning} strokeWidth={2} />
          <Text style={[typography.caption, { color: colors.warning }]}>
            Đang hiển thị dữ liệu lưu cục bộ trên máy (Offline mode)
          </Text>
        </View>
      ) : null}

      {isLoading && mergedItems.length === 0 ? (
        <View style={{ padding: spacing.md, gap: spacing.md }}>
          <Card style={{ gap: spacing.sm }}>
            <SkeletonLoader width="50%" height={18} />
            <SkeletonLoader width="100%" height={40} />
          </Card>
          <Card style={{ gap: spacing.sm }}>
            <SkeletonLoader width="45%" height={18} />
            <SkeletonLoader width="100%" height={40} />
          </Card>
        </View>
      ) : (
        <FlashList
          data={mergedItems}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={{
            padding: spacing.md,
            paddingBottom: Math.max(insets.bottom, spacing.md),
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            isError ? (
              <ErrorState
                message="Không thể tải lịch sử từ máy chủ."
                onRetry={handleRefresh}
              />
            ) : (
              <EmptyState
                title="Chưa có buổi tập nào"
                message="Hãy bắt đầu một buổi chạy bộ hoặc đi bộ để theo dõi lộ trình GPS của bạn!"
              />
            )
          }
          ListFooterComponent={
            remoteData && (remoteData.hasNext || page > 0) ? (
              <View style={[styles.paginationRow, { paddingVertical: spacing.md }]}>
                <Pressable
                  accessibilityRole="button"
                  disabled={page === 0}
                  onPress={() => setPage(p => Math.max(0, p - 1))}
                  style={[
                    styles.pageBtn,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderRadius: radius.md,
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                      gap: spacing.xs,
                    },
                    page === 0 ? { opacity: 0.4 } : undefined,
                  ]}>
                  <ChevronLeft size={14} color={colors.primary} strokeWidth={2.2} />
                  <Text
                    style={[
                      typography.caption,
                      { color: colors.primary, fontWeight: '700' },
                    ]}>
                    Trang trước
                  </Text>
                </Pressable>
                <Text
                  style={[
                    typography.caption,
                    tabularNums,
                    { color: colors.textMuted },
                  ]}>
                  Trang {page + 1} / {Math.max(1, remoteData.totalPages)}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  disabled={!remoteData.hasNext}
                  onPress={() => setPage(p => p + 1)}
                  style={[
                    styles.pageBtn,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderRadius: radius.md,
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                      gap: spacing.xs,
                    },
                    !remoteData.hasNext ? { opacity: 0.4 } : undefined,
                  ]}>
                  <Text
                    style={[
                      typography.caption,
                      { color: colors.primary, fontWeight: '700' },
                    ]}>
                    Trang sau
                  </Text>
                  <ChevronRight size={14} color={colors.primary} strokeWidth={2.2} />
                </Pressable>
              </View>
            ) : undefined
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  filterPill: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 6,
    alignItems: 'center',
  },
  syncBanner: {
    flexDirection: 'row',
    justifyContent: 'center',
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  offlineBanner: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIcon: {
    fontSize: 28,
  },
  pendingChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
  },
  statCol: {
    alignItems: 'center',
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pageBtn: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
});
