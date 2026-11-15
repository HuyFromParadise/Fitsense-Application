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
import { useTheme } from '../../app/providers/ThemeProvider';
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
  const { colors, spacing, radius, typography } = useTheme();
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

  const handleRefresh = async () => {
    await loadLocalSessions();
    await refetch();
  };

  // Merge remote items with local-only pending items
  const remoteItems = remoteData?.items || [];
  const remoteIds = new Set(remoteItems.map((it) => it.id));
  const localOnly = localList.filter((it) => !remoteIds.has(it.id));
  const mergedItems = [...localOnly, ...remoteItems];

  const renderItem = ({ item }: { item: ExerciseSummary }) => {
    const meta = EXERCISE_TYPE_META[item.type];
    const isPending = item.isLocalOnly || item.syncState === 'PENDING';

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
        <Card style={[styles.itemCard, { padding: spacing.md }]}>
          <View style={[styles.itemHeader, { marginBottom: spacing.md }]}>
            <View style={[styles.typeBadge, { gap: spacing.sm }]}>
              <Text style={styles.typeIcon}>{meta.icon}</Text>
              <View>
                <Text style={[typography.heading, { color: meta.color }]}>
                  {meta.label}
                </Text>
                <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
                  {formatDateTime(item.startedAt)}
                </Text>
              </View>
            </View>

            {isPending && (
              <View style={[styles.pendingChip, { backgroundColor: colors.warning + '25', borderRadius: radius.pill }]}>
                <Text style={[typography.caption, { color: colors.warning, fontWeight: '700' }]}>
                  Chưa sync
                </Text>
              </View>
            )}
          </View>

          <View style={[styles.statsRow, { paddingTop: spacing.sm, borderColor: colors.border }]}>
            <View style={styles.statCol}>
              <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 2 }]}>Quãng đường</Text>
              <Text style={[typography.label, { color: colors.text }]}>
                {formatDistanceKm(item.metrics.distanceM)} km
              </Text>
            </View>

            <View style={styles.statCol}>
              <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 2 }]}>Thời gian</Text>
              <Text style={[typography.label, { color: colors.text }]}>
                {formatDuration(item.metrics.durationSeconds)}
              </Text>
            </View>

            <View style={styles.statCol}>
              <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 2 }]}>Pace</Text>
              <Text style={[typography.label, { color: colors.text }]}>
                {formatPace(item.metrics.avgPaceSecPerKm)}
              </Text>
            </View>

            <View style={styles.statCol}>
              <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 2 }]}>Calo</Text>
              <Text style={[typography.label, { color: colors.text }]}>
                {item.metrics.calories.toFixed(0)} kcal
              </Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Exercise Type Filter Bar */}
      <View style={[styles.filterRow, { backgroundColor: colors.surface, borderColor: colors.border, padding: spacing.md, gap: spacing.xs }]}>
        <TouchableOpacity
          style={[
            styles.filterPill,
            { backgroundColor: !filterType ? colors.primary : colors.surfaceAlt, borderRadius: radius.pill },
          ]}
          onPress={() => {
            setFilterType(undefined);
            setPage(0);
          }}
        >
          <Text
            style={[
              typography.caption,
              { color: !filterType ? colors.onPrimary : colors.textMuted, fontWeight: '700' },
            ]}
          >
            Tất cả
          </Text>
        </TouchableOpacity>

        {(['WALKING', 'RUNNING', 'CYCLING'] as ExerciseType[]).map((type) => {
          const m = EXERCISE_TYPE_META[type];
          const active = filterType === type;
          return (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterPill,
                { backgroundColor: active ? colors.primary : colors.surfaceAlt, borderRadius: radius.pill },
              ]}
              onPress={() => {
                setFilterType(type);
                setPage(0);
              }}
            >
              <Text
                style={[
                  typography.caption,
                  { color: active ? colors.onPrimary : colors.textMuted, fontWeight: '700' },
                ]}
              >
                {m.icon} {m.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Sync Pending Banner */}
      {pendingCount > 0 && (
        <TouchableOpacity
          style={[styles.syncBanner, { backgroundColor: colors.primary + '20', borderColor: colors.primary, padding: spacing.sm }]}
          disabled={syncing}
          onPress={handleSyncPending}
        >
          <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>
            {syncing
              ? '⏳ Đang đồng bộ dữ liệu lên cloud...'
              : `☁️ Có ${pendingCount} buổi tập offline. Bấm để đồng bộ ngay!`}
          </Text>
        </TouchableOpacity>
      )}

      {/* Offline Info Banner */}
      {isError && (
        <View style={[styles.offlineBanner, { backgroundColor: colors.warning + '20', paddingVertical: spacing.xs }]}>
          <Text style={[typography.caption, { color: colors.warning }]}>
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
          contentContainerStyle={[styles.listContent, { padding: spacing.md, gap: spacing.md }]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title="Chưa có buổi tập nào"
              message="Hãy bắt đầu một buổi chạy bộ hoặc đi bộ để theo dõi lộ trình GPS của bạn!"
            />
          }
          ListFooterComponent={
            remoteData && (remoteData.hasNext || page > 0) ? (
              <View style={[styles.paginationRow, { paddingVertical: spacing.md }]}>
                <TouchableOpacity
                  disabled={page === 0}
                  onPress={() => setPage((p) => Math.max(0, p - 1))}
                  style={[
                    styles.pageBtn,
                    { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
                    page === 0 && { opacity: 0.4 },
                  ]}
                >
                  <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>
                    ← Trang trước
                  </Text>
                </TouchableOpacity>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  Trang {page + 1} / {Math.max(1, remoteData.totalPages)}
                </Text>
                <TouchableOpacity
                  disabled={!remoteData.hasNext}
                  onPress={() => setPage((p) => p + 1)}
                  style={[
                    styles.pageBtn,
                    { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
                    !remoteData.hasNext && { opacity: 0.4 },
                  ]}
                >
                  <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>
                    Trang sau →
                  </Text>
                </TouchableOpacity>
              </View>
            ) : undefined
          }
        />
      )}
    </View>
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
    paddingVertical: 6,
    alignItems: 'center',
  },
  syncBanner: {
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  offlineBanner: {
    alignItems: 'center',
  },
  listContent: {},
  itemCard: {},
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
    borderWidth: 1,
  },
});
