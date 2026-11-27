import Geolocation from '@react-native-community/geolocation';
import {
  CheckCircle2,
  HardDrive,
  History,
  LocateFixed,
  Square,
  Trophy,
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../app/providers/ThemeProvider';
import { Button, Card } from '../../components/common';
import { tabularNums } from '../../theme';
import { LivePaceReadout } from './components/LivePaceReadout';
import {
  EXERCISE_TYPE_META,
  formatDistanceKm,
  formatDuration,
  formatPace,
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
  const insets = useSafeAreaInsets();
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
  const [holdWidth, setHoldWidth] = useState(0);

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
      }
    };
  }, []);

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
        500,
      );
    }
  }, [routeCoords]);

  const startHoldFinish = () => {
    setHoldingFinish(true);
    holdAnim.setValue(0);
    Animated.timing(holdAnim, {
      toValue: 1,
      duration: 2000, // 2-second safety hold (Day 8 requirement)
      useNativeDriver: true,
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
      useNativeDriver: true,
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

  const goToMyCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;
        mapRef.current?.animateToRegion(
          {
            latitude,
            longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          },
          1000,
        );
      },
      error => console.log(error.message),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 10000 },
    );
  };

  const activeMeta = EXERCISE_TYPE_META[selectedType];

  const holdTranslateX = holdAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-holdWidth / 2, 0],
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Live GPS Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={DEFAULT_REGION}
          customMapStyle={isDark ? DARK_MAP_STYLE : undefined}
          showsUserLocation
          showsMyLocationButton={false}
        >
          {routeCoords.length > 0 ? (
            <Marker
              coordinate={routeCoords[0]}
              title="Xuất phát"
              pinColor={colors.success}
            />
          ) : null}
          {routeCoords.length > 1 ? (
            <Polyline
              coordinates={routeCoords}
              strokeColor={activeMeta.color}
              strokeWidth={5}
            />
          ) : null}
        </MapView>

        {/* Nút định vị vị trí hiện tại của tôi (Floating Location Button) */}
        <Pressable
          style={({ pressed }) => [
            styles.myLocationBtn,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              opacity: pressed ? 0.85 : 1,
            },
            Platform.select({
              ios: {
                shadowColor: colors.text,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
              },
              android: { elevation: 6 },
            }),
          ]}
          onPress={goToMyCurrentLocation}
          accessibilityRole="button"
          accessibilityLabel="Định vị vị trí của tôi"
        >
          <LocateFixed size={22} color={colors.primary} strokeWidth={2} />
        </Pressable>

        {/* Top Bar Overlay */}
        <View
          style={[
            styles.topOverlay,
            {
              top: insets.top + spacing.md,
              left: spacing.md,
              right: spacing.md,
            },
          ]}
        >
          <View
            style={[
              styles.statusChip,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
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
            <Text
              style={[
                typography.caption,
                { color: colors.text, fontWeight: '700' },
              ]}
            >
              {status === 'IDLE'
                ? 'Sẵn sàng'
                : status === 'ACTIVE'
                ? 'Đang ghi GPS'
                : 'Tạm dừng'}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Xem lịch sử tập luyện"
            style={({ pressed }) => [
              styles.historyBtn,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: pressed ? 0.85 : 1,
                gap: spacing.xs,
              },
            ]}
            onPress={() => navigation.navigate('ExerciseHistory')}
          >
            <History size={16} color={colors.primary} strokeWidth={2} />
            <Text
              style={[
                typography.caption,
                { color: colors.primary, fontWeight: '700' },
              ]}
            >
              Lịch sử
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Bottom Tracking Control Panel */}
      <View
        style={[
          styles.panel,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.md,
            paddingBottom: Math.max(insets.bottom, spacing.md),
          },
        ]}
      >
        {/* Exercise Type Selector (only when IDLE) */}
        {status === 'IDLE' ? (
          <View
            style={[
              styles.typeRow,
              { gap: spacing.sm, marginBottom: spacing.md },
            ]}
          >
            {(['WALKING', 'RUNNING', 'CYCLING'] as ExerciseType[]).map(t => {
              const meta = EXERCISE_TYPE_META[t];
              const isSelected = selectedType === t;
              return (
                <Pressable
                  key={t}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  style={({ pressed }) => [
                    styles.typePill,
                    {
                      borderColor: isSelected ? meta.color : colors.border,
                      backgroundColor: isSelected
                        ? colors.primaryMuted
                        : colors.surfaceAlt,
                      borderRadius: radius.md,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                  onPress={() => setSelectedType(t)}
                >
                  <Text style={styles.typeIcon}>{meta.icon}</Text>
                  <Text
                    style={[
                      typography.caption,
                      {
                        color: isSelected ? meta.color : colors.textMuted,
                        fontWeight: '700',
                      },
                    ]}
                  >
                    {meta.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <LivePaceReadout
          elapsedSeconds={elapsedSeconds}
          distanceM={distanceM}
          avgPaceSecPerKm={avgPaceSecPerKm}
          currentSpeedMps={currentSpeedMps}
          calories={calories}
        />

        {/* Bottom Thumb-Zone Action Controls (>= 56dp height) */}
        <View style={styles.controls}>
          {status === 'IDLE' ? (
            <Button
              title={`Bắt đầu ${activeMeta.label}`}
              onPress={startWorkout}
              style={styles.thumbControlBtn}
            />
          ) : (
            <View style={[styles.activeControls, { gap: spacing.sm }]}>
              <Button
                title={status === 'ACTIVE' ? 'Tạm dừng' : 'Tiếp tục'}
                variant={status === 'ACTIVE' ? 'secondary' : 'primary'}
                onPress={status === 'ACTIVE' ? pauseWorkout : resumeWorkout}
                style={[styles.controlHalf, styles.thumbControlBtn]}
              />

              {/* Hold-for-2s Finish Button with single-tap confirmation */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Giữ 2 giây để kết thúc buổi tập"
                onPress={handleFinishPress}
                onPressIn={startHoldFinish}
                onPressOut={cancelHoldFinish}
                disabled={isSyncing}
                onLayout={e => setHoldWidth(e.nativeEvent.layout.width)}
                style={[
                  styles.holdFinishBtn,
                  styles.controlHalf,
                  {
                    backgroundColor: colors.danger,
                    borderColor: colors.danger,
                    borderRadius: radius.md,
                    opacity: isSyncing ? 0.5 : 1,
                  },
                ]}
              >
                <Animated.View
                  style={[
                    styles.holdProgressFill,
                    {
                      backgroundColor: colors.primaryPressed,
                      transform: [
                        { translateX: holdTranslateX },
                        { scaleX: holdAnim },
                      ],
                    },
                  ]}
                />
                <View style={[styles.holdFinishContent, { gap: spacing.xs }]}>
                  <Square size={14} color={colors.onDanger} fill={colors.onDanger} />
                  <Text style={[typography.label, { color: colors.onDanger }]}>
                    {isSyncing
                      ? 'Đang lưu...'
                      : holdingFinish
                      ? 'Giữ 2s để kết thúc...'
                      : 'Giữ kết thúc'}
                  </Text>
                </View>
              </Pressable>
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
            {finishedSummary ? (
              <>
                <View
                  style={[
                    styles.modalIconBadge,
                    {
                      backgroundColor: colors.primaryMuted,
                      borderRadius: radius.pill,
                      padding: spacing.md,
                      marginBottom: spacing.sm,
                    },
                  ]}
                >
                  <Trophy size={32} color={colors.primary} strokeWidth={2} />
                </View>
                <Text
                  style={[
                    typography.title,
                    { color: colors.text, marginBottom: spacing.xs },
                  ]}
                >
                  Hoàn thành buổi tập!
                </Text>
                <View
                  style={[
                    styles.syncBadgeRow,
                    { gap: spacing.xs, marginBottom: spacing.md },
                  ]}
                >
                  {finishedSummary.syncedToServer ? (
                    <CheckCircle2 size={14} color={colors.success} strokeWidth={2} />
                  ) : (
                    <HardDrive size={14} color={colors.warning} strokeWidth={2} />
                  )}
                  <Text
                    style={[
                      typography.caption,
                      {
                        color: finishedSummary.syncedToServer
                          ? colors.success
                          : colors.warning,
                        textAlign: 'center',
                      },
                    ]}
                  >
                    {finishedSummary.syncedToServer
                      ? 'Đã lưu và đồng bộ lên server thành công'
                      : 'Đã lưu cục bộ. Sẽ đồng bộ khi có kết nối mạng'}
                  </Text>
                </View>

                <View
                  style={[
                    styles.summaryRows,
                    {
                      gap: spacing.sm,
                      marginVertical: spacing.md,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.summaryRow}>
                    <Text
                      style={[typography.body, { color: colors.textMuted }]}
                    >
                      Quãng đường:
                    </Text>
                    <Text
                      style={[
                        typography.body,
                        tabularNums,
                        { color: colors.text, fontWeight: '700' },
                      ]}
                    >
                      {formatDistanceKm(
                        finishedSummary.summary.metrics.distanceM,
                      )}{' '}
                      km
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text
                      style={[typography.body, { color: colors.textMuted }]}
                    >
                      Thời gian:
                    </Text>
                    <Text
                      style={[
                        typography.body,
                        tabularNums,
                        { color: colors.text, fontWeight: '700' },
                      ]}
                    >
                      {formatDuration(
                        finishedSummary.summary.metrics.durationSeconds,
                      )}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text
                      style={[typography.body, { color: colors.textMuted }]}
                    >
                      Pace trung bình:
                    </Text>
                    <Text
                      style={[
                        typography.body,
                        tabularNums,
                        { color: colors.text, fontWeight: '700' },
                      ]}
                    >
                      {formatPace(
                        finishedSummary.summary.metrics.avgPaceSecPerKm,
                      )}{' '}
                      /km
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text
                      style={[typography.body, { color: colors.textMuted }]}
                    >
                      Calo tiêu thụ:
                    </Text>
                    <Text
                      style={[
                        typography.body,
                        tabularNums,
                        { color: colors.text, fontWeight: '700' },
                      ]}
                    >
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
            ) : null}
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
    paddingVertical: 8,
    minHeight: 40,
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 44,
    borderRadius: 20,
    borderWidth: 1,
  },
  panel: {
    borderTopWidth: 1,
  },
  typeRow: {
    flexDirection: 'row',
  },
  typePill: {
    flex: 1,
    minHeight: 44,
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
  controls: {
    marginTop: 4,
  },
  activeControls: {
    flexDirection: 'row',
  },
  controlHalf: {
    flex: 1,
  },
  thumbControlBtn: {
    minHeight: 56,
  },
  holdFinishBtn: {
    minHeight: 56,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  holdProgressFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  holdFinishContent: {
    flexDirection: 'row',
    alignItems: 'center',
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
  modalIconBadge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
  myLocationBtn: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});
