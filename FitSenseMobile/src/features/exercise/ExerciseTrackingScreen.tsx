import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
} from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { colors, spacing, typography } from '../../theme';
import { Button, Card } from '../../components/common';
import {
  EXERCISE_TYPE_META,
  formatDistanceKm,
  formatDuration,
  formatPace,
  formatSpeedKmh,
} from './exerciseUtils';
import { ExerciseType } from './types';
import { useExerciseTracking } from './useExerciseTracking';

interface ExerciseTrackingScreenProps {
  navigation: any;
}

const DEFAULT_REGION = {
  latitude: 10.776889,
  longitude: 106.700806,
  latitudeDelta: 0.008,
  longitudeDelta: 0.008,
};

export const ExerciseTrackingScreen: React.FC<ExerciseTrackingScreenProps> = ({
  navigation,
}) => {
  const {
    selectedType,
    setSelectedType,
    status,
    elapsedSeconds,
    distanceM,
    currentSpeedMps,
    avgPaceSecPerKm,
    calories,
    routeCoords,
    isSyncing,
    finishedSummary,
    dismissSummary,
    startWorkout,
    pauseWorkout,
    resumeWorkout,
    finishWorkout,
  } = useExerciseTracking();

  const mapRef = useRef<MapView | null>(null);
  const holdAnim = useRef(new Animated.Value(0)).current;
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [holdingFinish, setHoldingFinish] = useState(false);

  // Keep map centered on latest GPS point
  useEffect(() => {
    if (routeCoords.length > 0 && mapRef.current) {
      const latest = routeCoords[routeCoords.length - 1];
      mapRef.current.animateToRegion(
        {
          latitude: latest.latitude,
          longitude: latest.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        },
        500
      );
    }
  }, [routeCoords]);

  const startHoldFinish = () => {
    setHoldingFinish(true);
    holdAnim.setValue(0);
    Animated.timing(holdAnim, {
      toValue: 1,
      duration: 2000, // 2-second safety hold (Day 8 requirement)
      useNativeDriver: false,
    }).start();

    holdTimerRef.current = setTimeout(() => {
      setHoldingFinish(false);
      holdAnim.setValue(0);
      finishWorkout();
    }, 2000);
  };

  const cancelHoldFinish = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setHoldingFinish(false);
    Animated.timing(holdAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
  };

  const activeMeta = EXERCISE_TYPE_META[selectedType];

  const holdWidthInterpolated = holdAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      {/* Live GPS Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={DEFAULT_REGION}
          showsUserLocation
          showsMyLocationButton
        >
          {routeCoords.length > 0 && (
            <Marker
              coordinate={routeCoords[0]}
              title="Xuất phát"
              pinColor="green"
            />
          )}
          {routeCoords.length > 1 && (
            <Polyline
              coordinates={routeCoords}
              strokeColor={activeMeta.color}
              strokeWidth={5}
            />
          )}
        </MapView>

        {/* Top Bar Overlay */}
        <View style={styles.topOverlay}>
          <View style={styles.statusChip}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    status === 'ACTIVE'
                      ? colors.primary
                      : status === 'PAUSED'
                      ? colors.warning
                      : colors.textMuted,
                },
              ]}
            />
            <Text style={[typography.captionBold, styles.statusText]}>
              {status === 'IDLE'
                ? 'Sẵn sàng'
                : status === 'ACTIVE'
                ? 'Đang ghi GPS'
                : 'Tạm dừng'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.historyBtn}
            onPress={() => navigation.navigate('ExerciseHistory')}
          >
            <Text style={[typography.captionBold, styles.historyBtnText]}>
              📜 Lịch sử
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Tracking Control Panel */}
      <View style={styles.panel}>
        {/* Exercise Type Selector (only when IDLE) */}
        {status === 'IDLE' && (
          <View style={styles.typeRow}>
            {(['WALKING', 'RUNNING', 'CYCLING'] as ExerciseType[]).map((t) => {
              const meta = EXERCISE_TYPE_META[t];
              const isSelected = selectedType === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typePill,
                    isSelected && {
                      borderColor: meta.color,
                      backgroundColor: meta.color + '25',
                    },
                  ]}
                  onPress={() => setSelectedType(t)}
                >
                  <Text style={styles.typeIcon}>{meta.icon}</Text>
                  <Text
                    style={[
                      typography.captionBold,
                      { color: isSelected ? meta.color : colors.textSecondary },
                    ]}
                  >
                    {meta.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Primary Timer */}
        <View style={styles.timerContainer}>
          <Text style={[typography.caption, styles.timerLabel]}>THỜI GIAN</Text>
          <Text style={styles.timerValue}>{formatDuration(elapsedSeconds)}</Text>
        </View>

        {/* Metrics Grid */}
        <View style={styles.metricsGrid}>
          <Card style={styles.metricCard}>
            <Text style={[typography.caption, styles.metricLabel]}>Quãng đường</Text>
            <Text style={[typography.h2, styles.metricValue]}>
              {formatDistanceKm(distanceM)} <Text style={styles.unit}>km</Text>
            </Text>
          </Card>

          <Card style={styles.metricCard}>
            <Text style={[typography.caption, styles.metricLabel]}>Pace TB</Text>
            <Text style={[typography.h2, styles.metricValue]}>
              {formatPace(avgPaceSecPerKm)} <Text style={styles.unit}>/km</Text>
            </Text>
          </Card>

          <Card style={styles.metricCard}>
            <Text style={[typography.caption, styles.metricLabel]}>Tốc độ</Text>
            <Text style={[typography.h2, styles.metricValue]}>
              {formatSpeedKmh(currentSpeedMps)} <Text style={styles.unit}>km/h</Text>
            </Text>
          </Card>

          <Card style={styles.metricCard}>
            <Text style={[typography.caption, styles.metricLabel]}>Calo</Text>
            <Text style={[typography.h2, styles.metricValue]}>
              {calories.toFixed(0)} <Text style={styles.unit}>kcal</Text>
            </Text>
          </Card>
        </View>

        {/* Action Controls */}
        <View style={styles.controls}>
          {status === 'IDLE' ? (
            <Button
              title={`Bắt đầu ${activeMeta.label}`}
              onPress={startWorkout}
              style={{ backgroundColor: activeMeta.color }}
            />
          ) : (
            <View style={styles.activeControls}>
              <Button
                title={status === 'ACTIVE' ? 'Tạm dừng' : 'Tiếp tục'}
                variant={status === 'ACTIVE' ? 'secondary' : 'primary'}
                onPress={status === 'ACTIVE' ? pauseWorkout : resumeWorkout}
                style={styles.controlHalf}
              />

              {/* Hold-for-2s Finish Button (Day 8) */}
              <TouchableOpacity
                activeOpacity={0.9}
                onPressIn={startHoldFinish}
                onPressOut={cancelHoldFinish}
                disabled={isSyncing}
                style={[styles.holdFinishBtn, styles.controlHalf]}
              >
                <Animated.View
                  style={[styles.holdProgressFill, { width: holdWidthInterpolated }]}
                />
                <Text style={[typography.button, styles.holdFinishText]}>
                  {isSyncing
                    ? 'Đang lưu...'
                    : holdingFinish
                    ? 'Giữ tiếp...'
                    : 'Giữ 2s Kết thúc'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Post-Workout Summary Modal */}
      <Modal
        visible={Boolean(finishedSummary)}
        transparent
        animationType="slide"
        onRequestClose={dismissSummary}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard}>
            <Text style={styles.modalIcon}>🎉</Text>
            <Text style={[typography.h2, styles.modalTitle]}>
              Hoàn thành buổi tập!
            </Text>
            {finishedSummary && (
              <>
                <Text style={[typography.captionBold, styles.syncBadge]}>
                  {finishedSummary.syncedToServer
                    ? '☁️ Đã đồng bộ lên server'
                    : '💾 Đã lưu offline (sẽ tự đồng bộ khi có mạng)'}
                </Text>

                <View style={styles.summaryRows}>
                  <View style={styles.summaryRow}>
                    <Text style={[typography.body, styles.summaryLabel]}>Loại hình</Text>
                    <Text style={[typography.bodyBold, styles.summaryVal]}>
                      {EXERCISE_TYPE_META[finishedSummary.summary.type].label}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={[typography.body, styles.summaryLabel]}>Quãng đường</Text>
                    <Text style={[typography.bodyBold, styles.summaryVal]}>
                      {formatDistanceKm(finishedSummary.summary.metrics.distanceM)} km
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={[typography.body, styles.summaryLabel]}>Thời gian</Text>
                    <Text style={[typography.bodyBold, styles.summaryVal]}>
                      {formatDuration(finishedSummary.summary.metrics.durationSeconds)}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={[typography.body, styles.summaryLabel]}>Pace trung bình</Text>
                    <Text style={[typography.bodyBold, styles.summaryVal]}>
                      {formatPace(finishedSummary.summary.metrics.avgPaceSecPerKm)} /km
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={[typography.body, styles.summaryLabel]}>Năng lượng</Text>
                    <Text style={[typography.bodyBold, styles.summaryVal]}>
                      {finishedSummary.summary.metrics.calories.toFixed(0)} kcal
                    </Text>
                  </View>
                </View>

                <Button
                  title="Xem lịch sử"
                  variant="secondary"
                  onPress={() => {
                    dismissSummary();
                    navigation.navigate('ExerciseHistory');
                  }}
                  style={styles.modalBtn}
                />
                <Button
                  title="Đóng"
                  variant="outline"
                  onPress={dismissSummary}
                  style={styles.modalBtn}
                />
              </>
            )}
          </Card>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  topOverlay: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface + 'EE',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  statusText: {
    color: colors.text,
  },
  historyBtn: {
    backgroundColor: colors.surface + 'EE',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyBtnText: {
    color: colors.primary,
  },
  panel: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.md,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  typeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  typePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
  },
  typeIcon: {
    fontSize: 16,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  timerLabel: {
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  timerValue: {
    fontSize: 38,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  metricCard: {
    width: '48.5%',
    padding: spacing.sm + 2,
    backgroundColor: colors.background,
    borderRadius: 12,
  },
  metricLabel: {
    color: colors.textSecondary,
    marginBottom: 2,
  },
  metricValue: {
    color: colors.text,
  },
  unit: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  controls: {
    marginTop: spacing.xs,
  },
  activeControls: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  controlHalf: {
    flex: 1,
  },
  holdFinishBtn: {
    height: 50,
    borderRadius: 12,
    backgroundColor: colors.error + '33',
    borderWidth: 1.5,
    borderColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  holdProgressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.error,
  },
  holdFinishText: {
    color: colors.white,
    zIndex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  modalIcon: {
    fontSize: 48,
    marginBottom: spacing.xs,
  },
  modalTitle: {
    color: colors.text,
    marginBottom: spacing.xs,
  },
  syncBadge: {
    color: colors.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  summaryRows: {
    width: '100%',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    color: colors.textSecondary,
  },
  summaryVal: {
    color: colors.text,
  },
  modalBtn: {
    width: '100%',
    marginTop: spacing.sm,
  },
});
