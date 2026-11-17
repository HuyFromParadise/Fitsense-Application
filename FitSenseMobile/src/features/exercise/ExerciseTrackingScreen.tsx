import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Alert,
  Platform,
} from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { useTheme } from '../../app/providers/ThemeProvider';
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

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#18181f' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#18181f' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a8a9e' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#c4c4d0' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#a0a0b0' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#131e17' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#272733' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1f1f2a' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9ca3af' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#323242' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#20202c' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0b0f14' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#3d4554' }],
  },
];

const DEFAULT_REGION = {
  latitude: 10.776889,
  longitude: 106.700806,
  latitudeDelta: 0.008,
  longitudeDelta: 0.008,
};

export const ExerciseTrackingScreen: React.FC<ExerciseTrackingScreenProps> = ({
  navigation,
}) => {
  const { colors, spacing, radius, typography, isDark } = useTheme();
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

  const handleFinishPress = () => {
    Alert.alert(
      'Kết thúc buổi tập',
      'Bạn có chắc chắn muốn dừng và lưu buổi tập này không?',
      [
        { text: 'Tiếp tục tập', style: 'cancel' },
        {
          text: 'Kết thúc ngay',
          style: 'destructive',
          onPress: finishWorkout,
        },
      ]
    );
  };

  const activeMeta = EXERCISE_TYPE_META[selectedType];

  const holdWidthInterpolated = holdAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Live GPS Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={DEFAULT_REGION}
          showsUserLocation
          showsMyLocationButton
          customMapStyle={isDark ? DARK_MAP_STYLE : undefined}
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
        <View style={[styles.topOverlay, { top: Platform.OS === 'android' ? 44 : spacing.md, left: spacing.md, right: spacing.md }]}>
          <View style={[styles.statusChip, { backgroundColor: colors.surface + 'EE', borderColor: colors.border }]}>
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
            <Text style={[typography.caption, { color: colors.text, fontWeight: '700' }]}>
              {status === 'IDLE'
                ? 'Sẵn sàng'
                : status === 'ACTIVE'
                ? 'Đang ghi GPS'
                : 'Tạm dừng'}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.historyBtn, { backgroundColor: colors.surface + 'EE', borderColor: colors.border }]}
            onPress={() => navigation.navigate('ExerciseHistory')}
          >
            <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>
              📜 Lịch sử
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Tracking Control Panel */}
      <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border, padding: spacing.md }]}>
        {/* Exercise Type Selector (only when IDLE) */}
        {status === 'IDLE' && (
          <View style={[styles.typeRow, { gap: spacing.sm, marginBottom: spacing.md }]}>
            {(['WALKING', 'RUNNING', 'CYCLING'] as ExerciseType[]).map((t) => {
              const meta = EXERCISE_TYPE_META[t];
              const isSelected = selectedType === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typePill,
                    {
                      borderColor: isSelected ? meta.color : colors.border,
                      backgroundColor: isSelected ? meta.color + '25' : colors.surfaceAlt,
                      borderRadius: radius.md,
                    },
                  ]}
                  onPress={() => setSelectedType(t)}
                >
                  <Text style={styles.typeIcon}>{meta.icon}</Text>
                  <Text
                    style={[
                      typography.caption,
                      { color: isSelected ? meta.color : colors.textMuted, fontWeight: '700' },
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
        <View style={[styles.timerContainer, { marginBottom: spacing.sm }]}>
          <Text style={[typography.caption, { color: colors.textMuted, letterSpacing: 1 }]}>THỜI GIAN</Text>
          <Text style={[styles.timerValue, { color: colors.text }]}>{formatDuration(elapsedSeconds)}</Text>
        </View>

        {/* Metrics Grid */}
        <View style={[styles.metricsGrid, { gap: spacing.sm, marginBottom: spacing.md }]}>
          <Card style={[styles.metricCard, { backgroundColor: colors.background, padding: spacing.sm + 2, borderRadius: radius.md }]}>
            <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 2 }]}>Quãng đường</Text>
            <Text style={[typography.heading, { color: colors.text }]}>
              {formatDistanceKm(distanceM)} <Text style={[styles.unit, { color: colors.textMuted }]}>km</Text>
            </Text>
          </Card>

          <Card style={[styles.metricCard, { backgroundColor: colors.background, padding: spacing.sm + 2, borderRadius: radius.md }]}>
            <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 2 }]}>Pace TB</Text>
            <Text style={[typography.heading, { color: colors.text }]}>
              {formatPace(avgPaceSecPerKm)} <Text style={[styles.unit, { color: colors.textMuted }]}>/km</Text>
            </Text>
          </Card>

          <Card style={[styles.metricCard, { backgroundColor: colors.background, padding: spacing.sm + 2, borderRadius: radius.md }]}>
            <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 2 }]}>Tốc độ</Text>
            <Text style={[typography.heading, { color: colors.text }]}>
              {formatSpeedKmh(currentSpeedMps)} <Text style={[styles.unit, { color: colors.textMuted }]}>km/h</Text>
            </Text>
          </Card>

          <Card style={[styles.metricCard, { backgroundColor: colors.background, padding: spacing.sm + 2, borderRadius: radius.md }]}>
            <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 2 }]}>Calo</Text>
            <Text style={[typography.heading, { color: colors.text }]}>
              {calories.toFixed(0)} <Text style={[styles.unit, { color: colors.textMuted }]}>kcal</Text>
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
            <View style={[styles.activeControls, { gap: spacing.sm }]}>
              <Button
                title={status === 'ACTIVE' ? 'Tạm dừng' : 'Tiếp tục'}
                variant={status === 'ACTIVE' ? 'secondary' : 'primary'}
                onPress={status === 'ACTIVE' ? pauseWorkout : resumeWorkout}
                style={styles.controlHalf}
              />

              {/* Hold-for-2s Finish Button with single-tap confirmation */}
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={handleFinishPress}
                onPressIn={startHoldFinish}
                onPressOut={cancelHoldFinish}
                disabled={isSyncing}
                style={[
                  styles.holdFinishBtn,
                  styles.controlHalf,
                  {
                    backgroundColor: colors.danger + '33',
                    borderColor: colors.danger,
                    borderRadius: radius.md,
                  },
                ]}
              >
                <Animated.View
                  style={[
                    styles.holdProgressFill,
                    { width: holdWidthInterpolated, backgroundColor: colors.danger },
                  ]}
                />
                <Text style={[typography.label, styles.holdFinishText]}>
                  {isSyncing
                    ? 'Đang lưu...'
                    : holdingFinish
                    ? 'Giữ 2s để kết thúc...'
                    : 'Giữ kết thúc ⏹'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Summary Modal on Finish */}
      <Modal
        visible={finishedSummary !== null}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <Card style={[styles.modalCard, { padding: spacing.lg }]}>
            {finishedSummary && (
              <>
                <Text style={styles.modalIcon}>🏆</Text>
                <Text style={[typography.title, { color: colors.text, marginBottom: spacing.xs }]}>
                  Hoàn thành buổi tập!
                </Text>
                <Text style={[typography.caption, { color: colors.primary, marginBottom: spacing.md, textAlign: 'center' }]}>
                  {finishedSummary.syncedToServer
                    ? '✅ Đã lưu và đồng bộ lên server thành công'
                    : '💾 Đã lưu cục bộ. Sẽ đồng bộ khi có kết nối mạng'}
                </Text>

                <View style={[styles.summaryRows, { gap: spacing.sm, marginVertical: spacing.md, borderColor: colors.border }]}>
                  <View style={styles.summaryRow}>
                    <Text style={[typography.body, { color: colors.textMuted }]}>Quãng đường:</Text>
                    <Text style={[typography.body, { color: colors.text, fontWeight: '700' }]}>
                      {formatDistanceKm(finishedSummary.summary.metrics.distanceM)} km
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={[typography.body, { color: colors.textMuted }]}>Thời gian:</Text>
                    <Text style={[typography.body, { color: colors.text, fontWeight: '700' }]}>
                      {formatDuration(finishedSummary.summary.metrics.durationSeconds)}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={[typography.body, { color: colors.textMuted }]}>Pace trung bình:</Text>
                    <Text style={[typography.body, { color: colors.text, fontWeight: '700' }]}>
                      {formatPace(finishedSummary.summary.metrics.avgPaceSecPerKm)} /km
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={[typography.body, { color: colors.textMuted }]}>Calo tiêu thụ:</Text>
                    <Text style={[typography.body, { color: colors.text, fontWeight: '700' }]}>
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
                  style={{ width: '100%', marginTop: spacing.sm }}
                />
                <Button
                  title="Đóng"
                  variant="ghost"
                  onPress={dismissSummary}
                  style={{ width: '100%', marginTop: spacing.sm }}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  historyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  panel: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
  },
  typeRow: {
    flexDirection: 'row',
  },
  typePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderWidth: 1.5,
  },
  typeIcon: {
    fontSize: 16,
  },
  timerContainer: {
    alignItems: 'center',
  },
  timerValue: {
    fontSize: 38,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metricCard: {
    width: '48.5%',
  },
  unit: {
    fontSize: 13,
    fontWeight: '400',
  },
  controls: {
    marginTop: 4,
  },
  activeControls: {
    flexDirection: 'row',
  },
  controlHalf: {
    flex: 1,
  },
  holdFinishBtn: {
    height: 48,
    borderWidth: 1.5,
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
  },
  holdFinishText: {
    color: '#FFFFFF',
    zIndex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    alignItems: 'center',
  },
  modalIcon: {
    fontSize: 48,
    marginBottom: 4,
  },
  summaryRows: {
    width: '100%',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
