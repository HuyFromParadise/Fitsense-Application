import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing, typography } from '../../theme';
import { Card, Loading } from '../../components/common';
import { exerciseApi } from './exerciseApi';
import { exerciseNative } from './exerciseNative';
import {
  EXERCISE_TYPE_META,
  formatDateTime,
  formatDistanceKm,
  formatDuration,
  formatPace,
  formatSpeedKmh,
} from './exerciseUtils';
import { ExerciseDetail, ExerciseSummary } from './types';

interface ExerciseDetailScreenProps {
  route: {
    params: {
      exerciseId: string;
      fallbackSummary?: ExerciseSummary;
    };
  };
}

export const ExerciseDetailScreen: React.FC<ExerciseDetailScreenProps> = ({
  route,
}) => {
  const { exerciseId, fallbackSummary } = route.params;
  const mapRef = useRef<MapView | null>(null);
  const [localDetail, setLocalDetail] = useState<ExerciseDetail | null>(null);

  const { data: remoteDetail, isLoading } = useQuery({
    queryKey: ['exercise', exerciseId],
    queryFn: () => exerciseApi.getExerciseDetail(exerciseId),
    retry: 1,
  });

  // Load local points as offline fallback
  useEffect(() => {
    if (!remoteDetail && fallbackSummary) {
      exerciseNative.getLocalExercisePoints(exerciseId).then((pts) => {
        setLocalDetail({
          ...fallbackSummary,
          gpsPoints: pts.map((p) => ({
            seq: p.seq,
            latitude: p.latitude,
            longitude: p.longitude,
            altitudeM: p.altitudeM,
            speedMps: p.speedMps,
            accuracyM: p.accuracyM,
            recordedAt: new Date(p.recordedAtMs).toISOString(),
          })),
        });
      });
    }
  }, [exerciseId, remoteDetail, fallbackSummary]);

  const detail = remoteDetail || localDetail;
  const coords = (detail?.gpsPoints ?? []).map((p) => ({
    latitude: p.latitude,
    longitude: p.longitude,
  }));

  useEffect(() => {
    if (coords.length >= 2 && mapRef.current) {
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(coords, {
          edgePadding: { top: 48, right: 48, bottom: 48, left: 48 },
          animated: true,
        });
      }, 300);
    }
  }, [coords]);

  if (isLoading && !detail) {
    return <Loading message="Đang tải chi tiết lộ trình..." />;
  }

  if (!detail) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[typography.body, { color: colors.textSecondary }]}>
          Không tìm thấy thông tin buổi tập.
        </Text>
      </View>
    );
  }

  const meta = EXERCISE_TYPE_META[detail.type];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Route Polyline Map */}
      <Card style={styles.mapCard}>
        {coords.length > 0 ? (
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={{
              latitude: coords[0].latitude,
              longitude: coords[0].longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
          >
            <Marker coordinate={coords[0]} title="Xuất phát" pinColor="green" />
            {coords.length > 1 && (
              <>
                <Marker
                  coordinate={coords[coords.length - 1]}
                  title="Kết thúc"
                  pinColor="red"
                />
                <Polyline
                  coordinates={coords}
                  strokeColor={meta.color}
                  strokeWidth={5}
                />
              </>
            )}
          </MapView>
        ) : (
          <View style={styles.noGpsBox}>
            <Text style={styles.noGpsIcon}>🗺️</Text>
            <Text style={[typography.body, styles.noGpsText]}>
              Buổi tập này không có tọa độ GPS
            </Text>
          </View>
        )}
      </Card>

      {/* Header Summary */}
      <Card style={styles.infoCard}>
        <View style={styles.headerRow}>
          <Text style={styles.typeIcon}>{meta.icon}</Text>
          <View>
            <Text style={[typography.h2, { color: meta.color }]}>{meta.label}</Text>
            <Text style={[typography.caption, styles.dateText]}>
              Bắt đầu: {formatDateTime(detail.startedAt)}
            </Text>
            {detail.endedAt && (
              <Text style={[typography.caption, styles.dateText]}>
                Kết thúc: {formatDateTime(detail.endedAt)}
              </Text>
            )}
          </View>
        </View>
      </Card>

      {/* Metrics Breakdown */}
      <View style={styles.metricsGrid}>
        <Card style={styles.metricBox}>
          <Text style={[typography.caption, styles.metricLabel]}>Quãng đường</Text>
          <Text style={[typography.h2, styles.metricVal]}>
            {formatDistanceKm(detail.metrics.distanceM)} km
          </Text>
        </Card>
        <Card style={styles.metricBox}>
          <Text style={[typography.caption, styles.metricLabel]}>Thời gian tập</Text>
          <Text style={[typography.h2, styles.metricVal]}>
            {formatDuration(detail.metrics.durationSeconds)}
          </Text>
        </Card>
        <Card style={styles.metricBox}>
          <Text style={[typography.caption, styles.metricLabel]}>Pace trung bình</Text>
          <Text style={[typography.h2, styles.metricVal]}>
            {formatPace(detail.metrics.avgPaceSecPerKm)} /km
          </Text>
        </Card>
        <Card style={styles.metricBox}>
          <Text style={[typography.caption, styles.metricLabel]}>Tốc độ trung bình</Text>
          <Text style={[typography.h2, styles.metricVal]}>
            {formatSpeedKmh(detail.metrics.avgSpeedMps)} km/h
          </Text>
        </Card>
        <Card style={styles.metricBox}>
          <Text style={[typography.caption, styles.metricLabel]}>Calo tiêu hao</Text>
          <Text style={[typography.h2, styles.metricVal]}>
            {detail.metrics.calories.toFixed(0)} kcal
          </Text>
        </Card>
        <Card style={styles.metricBox}>
          <Text style={[typography.caption, styles.metricLabel]}>Điểm GPS đã ghi</Text>
          <Text style={[typography.h2, styles.metricVal]}>
            {detail.gpsPoints.length} điểm
          </Text>
        </Card>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapCard: {
    padding: 0,
    overflow: 'hidden',
    height: 260,
  },
  map: {
    flex: 1,
  },
  noGpsBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noGpsIcon: {
    fontSize: 40,
    marginBottom: spacing.xs,
  },
  noGpsText: {
    color: colors.textSecondary,
  },
  infoCard: {
    padding: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  typeIcon: {
    fontSize: 40,
  },
  dateText: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metricBox: {
    width: '48.5%',
    padding: spacing.md,
  },
  metricLabel: {
    color: colors.textSecondary,
    marginBottom: 4,
  },
  metricVal: {
    color: colors.text,
  },
});
