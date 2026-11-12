import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { colors, spacing, typography } from '../../theme';
import { Card, EmptyState, Loading } from '../../components/common';
import { exerciseApi } from './exerciseApi';
import { exerciseNative } from './exerciseNative';
import {
  EXERCISE_TYPE_META,
  formatDateTime,
  formatDistanceKm,
  formatDuration,
  formatPace,
} from './exerciseUtils';
import { ExerciseSummary, ExerciseType, GpsPoint } from './types';

interface ExerciseHistoryScreenProps {
  navigation: any;
}

export const ExerciseHistoryScreen: React.FC<ExerciseHistoryScreenProps> = ({
  navigation,
}) => {
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
        (r) => r.status === 'FINISHED' && r.syncState !== 'SYNCED'
      );
      setPendingCount(pending.length);

      const mapped: ExerciseSummary[] = localRows
        .filter((r) => r.status === 'FINISHED')
        .filter((r) => !filterType || r.type === filterType)
        .map((r) => ({
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

  const handleSyncPending = async () => {
    setSyncing(true);
    try {
      const pendingRows = await exerciseNative.getPendingSyncExercises(20);
      let syncedCount = 0;
      for (const row of pendingRows) {
        const pts = await exerciseNative.getLocalExercisePoints(row.id);
        const apiPoints: GpsPoint[] = pts.map((p) => ({
          seq: p.seq,
          latitude: p.latitude,
          longitude: p.longitude,
          altitudeM: p.altitudeM,
          speedMps: p.speedMps,
          accuracyM: p.accuracyM,
          recordedAt: new Date(p.recordedAtMs).toISOString(),
        }));
        await exerciseApi.createExercise({
          id: row.id,
          type: row.type,
          status: row.status,
          startedAt: new Date(row.startedAtMs).toISOString(),
          endedAt: row.endedAtMs ? new Date(row.endedAtMs).toISOString() : null,
          pausedSeconds: Math.floor(row.pausedTotalMs / 1000),
          gpsPoints: apiPoints,
          metrics: {
            distanceM: row.distanceM,
            durationSeconds: row.durationSeconds,
            avgPaceSecPerKm:
              row.distanceM > 0 ? row.durationSeconds / (row.distanceM / 1000) : null,
            avgSpeedMps: row.durationSeconds > 0 ? row.distanceM / row.durationSeconds : 0,
            calories: row.calories,
          },
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
  };

  // Merge pending local workouts with remote paginated workouts (deduplicating by id)
  const mergedItems: ExerciseSummary[] = React.useMemo(() => {
    const remoteItems = remoteData?.items ?? [];
    const seen = new Set(remoteItems.map((i) => i.id));
    const unsyncedLocal = localList.filter((l) => !seen.has(l.id));
    return [...unsyncedLocal, ...remoteItems];
  }, [remoteData, localList]);

  const handleRefresh = async () => {
    await loadLocalSessions();
    await refetch();
  };

  const renderItem = ({ item }: { item: ExerciseSummary }) => {
    const meta = EXERCISE_TYPE_META[item.type];
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() =>
          navigation.navigate('ExerciseDetail', {
            exerciseId: item.id,
            fallbackSummary: item,
          })
        }
      >
        <Card style={styles.itemCard}>
          <View style={styles.itemHeader}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeIcon}>{meta.icon}</Text>
              <View>
                <Text style={[typography.bodyBold, { color: meta.color }]}>
                  {meta.label}
                </Text>
                <Text style={[typography.caption, styles.dateText]}>
                  {formatDateTime(item.startedAt)}
                </Text>
              </View>
            </View>
            {item.isLocalOnly && (
              <View style={styles.pendingChip}>
                <Text style={[typography.captionBold, styles.pendingText]}>
                  Chờ đồng bộ
                </Text>
              </View>
            )}
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={[typography.caption, styles.statLabel]}>Quãng đường</Text>
              <Text style={[typography.bodyBold, styles.statVal]}>
                {formatDistanceKm(item.metrics.distanceM)} km
              </Text>
            </View>
            <View style={styles.statCol}>
              <Text style={[typography.caption, styles.statLabel]}>Thời gian</Text>
              <Text style={[typography.bodyBold, styles.statVal]}>
                {formatDuration(item.metrics.durationSeconds)}
              </Text>
            </View>
            <View style={styles.statCol}>
              <Text style={[typography.caption, styles.statLabel]}>Pace</Text>
              <Text style={[typography.bodyBold, styles.statVal]}>
                {formatPace(item.metrics.avgPaceSecPerKm)}
              </Text>
            </View>
            <View style={styles.statCol}>
              <Text style={[typography.caption, styles.statLabel]}>Calo</Text>
              <Text style={[typography.bodyBold, styles.statVal]}>
                {item.metrics.calories.toFixed(0)}
              </Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Filter Pills */}
      <View style={styles.filterRow}>
        {[
          { label: 'Tất cả', value: undefined },
          { label: 'Đi bộ', value: 'WALKING' as ExerciseType },
          { label: 'Chạy bộ', value: 'RUNNING' as ExerciseType },
          { label: 'Đạp xe', value: 'CYCLING' as ExerciseType },
        ].map((f) => {
          const active = filterType === f.value;
          return (
            <TouchableOpacity
              key={f.label}
              style={[styles.filterPill, active && styles.filterPillActive]}
              onPress={() => {
                setFilterType(f.value);
                setPage(0);
              }}
            >
              <Text
                style={[
                  typography.captionBold,
                  { color: active ? colors.white : colors.textSecondary },
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Offline / Pending Sync Banner */}
      {pendingCount > 0 && (
        <TouchableOpacity
          style={styles.syncBanner}
          onPress={handleSyncPending}
          disabled={syncing}
        >
          <Text style={[typography.captionBold, styles.syncBannerText]}>
            {syncing
              ? '⏳ Đang đồng bộ lên server...'
              : `☁️ Có ${pendingCount} buổi tập offline chờ đồng bộ — Nhấn để đồng bộ ngay`}
          </Text>
        </TouchableOpacity>
      )}

      {isError && (
        <View style={styles.offlineBanner}>
          <Text style={[typography.caption, styles.offlineText]}>
            📡 Đang hiển thị dữ liệu lưu cục bộ trên máy (Offline mode)
          </Text>
        </View>
      )}

      {isLoading && mergedItems.length === 0 ? (
        <Loading message="Đang tải lịch sử bài tập..." />
      ) : (
        <FlatList
          data={mergedItems}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="👟"
              title="Chưa có buổi tập nào"
              description="Hãy bắt đầu một buổi chạy bộ hoặc đi bộ để theo dõi lộ trình GPS của bạn!"
              actionText="Bắt đầu ngay"
              onAction={() => navigation.goBack()}
            />
          }
          ListFooterComponent={
            remoteData && (remoteData.hasNext || page > 0) ? (
              <View style={styles.paginationRow}>
                <TouchableOpacity
                  disabled={page === 0}
                  onPress={() => setPage((p) => Math.max(0, p - 1))}
                  style={[styles.pageBtn, page === 0 && styles.pageBtnDisabled]}
                >
                  <Text style={[typography.captionBold, styles.pageBtnText]}>
                    ← Trang trước
                  </Text>
                </TouchableOpacity>
                <Text style={[typography.caption, styles.pageInfo]}>
                  Trang {page + 1} / {Math.max(1, remoteData.totalPages)}
                </Text>
                <TouchableOpacity
                  disabled={!remoteData.hasNext}
                  onPress={() => setPage((p) => p + 1)}
                  style={[
                    styles.pageBtn,
                    !remoteData.hasNext && styles.pageBtnDisabled,
                  ]}
                >
                  <Text style={[typography.captionBold, styles.pageBtnText]}>
                    Trang sau →
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  filterRow: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  filterPill: {
    flex: 1,
    paddingVertical: spacing.xs + 2,
    borderRadius: 20,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
  },
  filterPillActive: {
    backgroundColor: colors.primary,
  },
  syncBanner: {
    backgroundColor: colors.primary + '25',
    borderBottomWidth: 1,
    borderColor: colors.primary,
    padding: spacing.sm,
    alignItems: 'center',
  },
  syncBannerText: {
    color: colors.primary,
  },
  offlineBanner: {
    backgroundColor: colors.warning + '25',
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  offlineText: {
    color: colors.warning,
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  itemCard: {
    padding: spacing.md,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  typeIcon: {
    fontSize: 28,
  },
  dateText: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  pendingChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: colors.warning + '25',
  },
  pendingText: {
    color: colors.warning,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  statCol: {
    alignItems: 'center',
  },
  statLabel: {
    color: colors.textMuted,
    marginBottom: 2,
  },
  statVal: {
    color: colors.text,
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  pageBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  pageBtnText: {
    color: colors.primary,
  },
  pageInfo: {
    color: colors.textSecondary,
  },
});
