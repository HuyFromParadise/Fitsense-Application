import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useProfile } from '../profile';
import { exerciseApi } from './exerciseApi';
import { exerciseNative } from './exerciseNative';
import { calculateCalories } from './exerciseUtils';
import {
  ExerciseActiveSession,
  ExerciseStatus,
  ExerciseSummary,
  ExerciseType,
  GpsPoint,
  NativeExercisePoint,
} from './types';

export interface RouteCoord {
  latitude: number;
  longitude: number;
}

export const useExerciseTracking = () => {
  const queryClient = useQueryClient();
  const { profile } = useProfile();
  const weightKg = profile?.weightKg ?? 70;

  const [selectedType, setSelectedType] = useState<ExerciseType>('RUNNING');
  const [status, setStatus] = useState<ExerciseStatus>('IDLE');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [pausedTotalMs, setPausedTotalMs] = useState<number>(0);
  const [pauseStartMs, setPauseStartMs] = useState<number | null>(null);

  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [distanceM, setDistanceM] = useState<number>(0);
  const [currentSpeedMps, setCurrentSpeedMps] = useState<number>(0);
  const [routeCoords, setRouteCoords] = useState<RouteCoord[]>([]);
  const [rawPoints, setRawPoints] = useState<NativeExercisePoint[]>([]);

  const [isSyncing, setIsSyncing] = useState(false);
  const [finishedSummary, setFinishedSummary] = useState<{
    summary: ExerciseSummary;
    syncedToServer: boolean;
  } | null>(null);

  const recoveryCheckedRef = useRef(false);

  const mapToApiPoints = (points: NativeExercisePoint[]): GpsPoint[] =>
    points.map((p) => ({
      seq: p.seq,
      latitude: p.latitude,
      longitude: p.longitude,
      altitudeM: p.altitudeM,
      speedMps: p.speedMps,
      accuracyM: p.accuracyM,
      recordedAt: new Date(p.recordedAtMs).toISOString(),
    }));

  const uploadSessionToServer = useCallback(
    async (
      id: string,
      type: ExerciseType,
      startedMs: number,
      endedMs: number,
      pausedMs: number,
      distM: number,
      durSec: number,
      kcal: number,
      points: NativeExercisePoint[]
    ): Promise<boolean> => {
      try {
        const avgSpeed = durSec > 0 ? distM / durSec : 0;
        const avgPace = distM > 0 ? durSec / (distM / 1000) : null;

        await exerciseApi.createExercise({
          id,
          type,
          status: 'FINISHED',
          startedAt: new Date(startedMs).toISOString(),
          endedAt: new Date(endedMs).toISOString(),
          pausedSeconds: Math.floor(pausedMs / 1000),
          gpsPoints: mapToApiPoints(points),
          metrics: {
            distanceM: Math.round(distM * 100) / 100,
            durationSeconds: durSec,
            avgPaceSecPerKm: avgPace,
            avgSpeedMps: avgSpeed,
            calories: kcal,
          },
        });
        await exerciseNative.markSessionSynced(id);
        queryClient.invalidateQueries({ queryKey: ['exercises'] });
        queryClient.invalidateQueries({ queryKey: ['analytics'] });
        return true;
      } catch (err) {
        console.warn('Offline or upload failed; session remains PENDING in local SQLite:', err);
        return false;
      }
    },
    [queryClient]
  );

  const restoreSessionUI = useCallback(
    async (active: ExerciseActiveSession) => {
      const existingPoints = await exerciseNative.getLocalExercisePoints(active.sessionId);
      setSessionId(active.sessionId);
      setSelectedType(active.type);
      setStatus(active.status);
      setStartedAtMs(active.startedAtMs);
      setPausedTotalMs(active.pausedTotalMs);
      setDistanceM(active.distanceM);
      setRawPoints(existingPoints);
      setRouteCoords(
        existingPoints.map((p) => ({ latitude: p.latitude, longitude: p.longitude }))
      );
      if (active.status === 'PAUSED') {
        setPauseStartMs(Date.now());
      } else {
        setPauseStartMs(null);
      }
      const activeSec = Math.max(
        0,
        Math.floor((Date.now() - active.startedAtMs - active.pausedTotalMs) / 1000)
      );
      setElapsedSeconds(activeSec);
    },
    []
  );

  // Check for killed session recovery on mount (Day 8 edge case)
  useEffect(() => {
    if (recoveryCheckedRef.current) return;
    recoveryCheckedRef.current = true;

    exerciseNative.getActiveSession().then(async (active) => {
      if (!active) return;

      await restoreSessionUI(active);

      Alert.alert(
        'Khôi phục buổi tập',
        `Phát hiện một buổi ${active.type} đang chạy dở (${(
          active.distanceM / 1000
        ).toFixed(2)} km). Bạn muốn tiếp tục hay kết thúc?`,
        [
          {
            text: 'Kết thúc ngay',
            style: 'destructive',
            onPress: async () => {
              const endedMs = Date.now();
              const finished = await exerciseNative.finish();
              const pts = await exerciseNative.getLocalExercisePoints(finished.sessionId);
              const durSec = Math.max(
                0,
                Math.floor((endedMs - finished.startedAtMs - finished.pausedTotalMs) / 1000)
              );
              const kcal = calculateCalories(finished.type, durSec, weightKg);
              const synced = await uploadSessionToServer(
                finished.sessionId,
                finished.type,
                finished.startedAtMs,
                endedMs,
                finished.pausedTotalMs,
                finished.distanceM,
                durSec,
                kcal,
                pts
              );
              setStatus('IDLE');
              setSessionId(null);
              setFinishedSummary({
                syncedToServer: synced,
                summary: {
                  id: finished.sessionId,
                  type: finished.type,
                  status: 'FINISHED',
                  startedAt: new Date(finished.startedAtMs).toISOString(),
                  endedAt: new Date(endedMs).toISOString(),
                  pausedSeconds: Math.floor(finished.pausedTotalMs / 1000),
                  metrics: {
                    distanceM: finished.distanceM,
                    durationSeconds: durSec,
                    avgPaceSecPerKm:
                      finished.distanceM > 0 ? durSec / (finished.distanceM / 1000) : null,
                    avgSpeedMps: durSec > 0 ? finished.distanceM / durSec : 0,
                    calories: kcal,
                  },
                },
              });
            },
          },
          {
            text: 'Tiếp tục',
            onPress: async () => {
              if (active.status === 'PAUSED') {
                await exerciseNative.resume();
                setStatus('ACTIVE');
                setPauseStartMs(null);
              }
            },
          },
        ]
      );
    });
  }, [restoreSessionUI, uploadSessionToServer, weightKg]);

  // Subscribe to native location updates
  useEffect(() => {
    const unsubscribe = exerciseNative.subscribe((event) => {
      if (event.state === 'POINT_RECORDED') {
        setDistanceM(event.distanceM);
        if (event.point.speedMps !== null) {
          setCurrentSpeedMps(event.point.speedMps);
        }
        setRawPoints((prev) => [...prev, event.point]);
        setRouteCoords((prev) => [
          ...prev,
          { latitude: event.point.latitude, longitude: event.point.longitude },
        ]);
      } else if (
        event.state === 'STARTED' ||
        event.state === 'PAUSED' ||
        event.state === 'RESUMED'
      ) {
        setStatus(event.session.status);
        setPausedTotalMs(event.session.pausedTotalMs);
        setDistanceM(event.session.distanceM);
      }
    });
    return unsubscribe;
  }, []);

  // Timer tick (excludes paused duration)
  useEffect(() => {
    if (status !== 'ACTIVE' || !startedAtMs) return;

    const timer = setInterval(() => {
      const activeMs = Math.max(0, Date.now() - startedAtMs - pausedTotalMs);
      setElapsedSeconds(Math.floor(activeMs / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [status, startedAtMs, pausedTotalMs]);

  const startWorkout = async () => {
    const granted = await exerciseNative.requestLocationPermission();
    if (!granted) {
      Alert.alert(
        'Thiếu quyền vị trí',
        'Không thể bắt đầu buổi tập GPS khi chưa được cấp quyền truy cập vị trí.'
      );
      return;
    }

    try {
      const session = await exerciseNative.start(selectedType);
      setSessionId(session.sessionId);
      setStartedAtMs(session.startedAtMs);
      setPausedTotalMs(0);
      setPauseStartMs(null);
      setElapsedSeconds(0);
      setDistanceM(0);
      setCurrentSpeedMps(0);
      setRouteCoords([]);
      setRawPoints([]);
      setFinishedSummary(null);
      setStatus('ACTIVE');
    } catch (err: any) {
      Alert.alert('Lỗi khởi tạo GPS', err.message || 'Không thể bắt đầu buổi tập.');
    }
  };

  const pauseWorkout = async () => {
    try {
      await exerciseNative.pause();
      setPauseStartMs(Date.now());
      setStatus('PAUSED');
    } catch (err: any) {
      Alert.alert('Lỗi', err.message);
    }
  };

  const resumeWorkout = async () => {
    try {
      await exerciseNative.resume();
      if (pauseStartMs) {
        setPausedTotalMs((prev) => prev + Math.max(0, Date.now() - pauseStartMs));
      }
      setPauseStartMs(null);
      setStatus('ACTIVE');
    } catch (err: any) {
      Alert.alert('Lỗi', err.message);
    }
  };

  const finishWorkout = async () => {
    if (!sessionId || !startedAtMs) return;

    setIsSyncing(true);
    try {
      const endedMs = Date.now();
      const extraPause = pauseStartMs ? Math.max(0, endedMs - pauseStartMs) : 0;
      const finalPausedMs = pausedTotalMs + extraPause;

      const finished = await exerciseNative.finish();
      const persistedPoints = await exerciseNative.getLocalExercisePoints(sessionId);
      const pointsToSave = persistedPoints.length > 0 ? persistedPoints : rawPoints;
      const finalDist = Math.max(distanceM, finished.distanceM);

      const finalDurationSec = Math.max(
        1,
        Math.floor((endedMs - startedAtMs - finalPausedMs) / 1000)
      );
      const calories = calculateCalories(selectedType, finalDurationSec, weightKg);
      const avgSpeed = finalDist / finalDurationSec;
      const avgPace = finalDist > 0 ? finalDurationSec / (finalDist / 1000) : null;

      const synced = await uploadSessionToServer(
        sessionId,
        selectedType,
        startedAtMs,
        endedMs,
        finalPausedMs,
        finalDist,
        finalDurationSec,
        calories,
        pointsToSave
      );

      setFinishedSummary({
        syncedToServer: synced,
        summary: {
          id: sessionId,
          type: selectedType,
          status: 'FINISHED',
          startedAt: new Date(startedAtMs).toISOString(),
          endedAt: new Date(endedMs).toISOString(),
          pausedSeconds: Math.floor(finalPausedMs / 1000),
          metrics: {
            distanceM: Math.round(finalDist * 100) / 100,
            durationSeconds: finalDurationSec,
            avgPaceSecPerKm: avgPace,
            avgSpeedMps: avgSpeed,
            calories,
          },
        },
      });

      setStatus('IDLE');
      setSessionId(null);
      setStartedAtMs(null);
      setPauseStartMs(null);
    } catch (err: any) {
      Alert.alert('Lỗi kết thúc buổi tập', err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const calories = calculateCalories(selectedType, elapsedSeconds, weightKg);
  const avgPaceSecPerKm =
    distanceM > 10 ? elapsedSeconds / (distanceM / 1000) : null;

  return {
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
    dismissSummary: () => setFinishedSummary(null),
    startWorkout,
    pauseWorkout,
    resumeWorkout,
    finishWorkout,
  };
};
