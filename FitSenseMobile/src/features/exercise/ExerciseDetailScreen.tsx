import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../app/providers/ThemeProvider';
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
  const { colors, spacing, typography } = useTheme();
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
      <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
        <Text style={[typography.body, { color: colors.textMuted }]}>
          Không tìm thấy thông tin buổi tập.
        </Text>
      </View>
    );
  }

  const meta = EXERCISE_TYPE_META[detail.type];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={[styles.content, { padding: spacing.md, gap: spacing.md }]}>
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
            <Text style={[typography.body, { color: colors.textMuted }]}>
              Buổi tập này không có tọa độ GPS
            </Text>
          </View>
        )}
      </Card>

      {/* Header Summary */}
      <Card style={{ padding: spacing.md }}>
        <View style={[styles.headerRow, { gap: spacing.md }]}>
          <Text style={styles.typeIcon}>{meta.icon}</Text>
          <View>
            <Text style={[typography.heading, { color: meta.color }]}>{meta.label}</Text>
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
              Bắt đầu: {formatDateTime(detail.startedAt)}
            </Text>
            {detail.endedAt && (
              <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
                Kết thúc: {formatDateTime(detail.endedAt)}
              </Text>
            )}
          </View>
        </View>
      </Card>

      {/* Metrics Breakdown */}
      <View style={[styles.metricsGrid, { gap: spacing.sm }]}>
        <Card style={styles.metricBox}>
          <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 4 }]}>Quãng đường</Text>
          <Text style={[typography.heading, { color: colors.text }]}>
            {formatDistanceKm(detail.metrics.distanceM)} km
          </Text>
        </Card>
        <Card style={styles.metricBox}>
          <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 4 }]}>Thời gian tập</Text>
          <Text style={[typography.heading, { color: colors.text }]}>
            {formatDuration(detail.metrics.durationSeconds)}
          </Text>
        </Card>
        <Card style={styles.metricBox}>
          <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 4 }]}>Pace trung bình</Text>
          <Text style={[typography.heading, { color: colors.text }]}>
            {formatPace(detail.metrics.avgPaceSecPerKm)} /km
          </Text>
        </Card>
        <Card style={styles.metricBox}>
          <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 4 }]}>Tốc độ trung bình</Text>
          <Text style={[typography.heading, { color: colors.text }]}>
            {formatSpeedKmh(detail.metrics.avgSpeedMps)} km/h
          </Text>
        </Card>
        <Card style={styles.metricBox}>
          <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 4 }]}>Calo tiêu hao</Text>
          <Text style={[typography.heading, { color: colors.text }]}>
            {detail.metrics.calories.toFixed(0)} kcal
          </Text>
        </Card>
        <Card style={styles.metricBox}>
          <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 4 }]}>Điểm GPS đã ghi</Text>
          <Text style={[typography.heading, { color: colors.text }]}>
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
  },
  content: {
    paddingBottom: 40,
  },
  emptyContainer: {
    flex: 1,
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
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIcon: {
    fontSize: 40,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metricBox: {
    width: '48.5%',
  },
});
