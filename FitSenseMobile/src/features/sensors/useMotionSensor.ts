import { useCallback, useEffect, useRef, useState } from 'react';

import { addNativeListener, MotionSensor } from '../../services/native';
import type {
  MotionLabel,
  MotionSample,
  MotionSnapshot,
  SensorSet,
} from '../../types/native-interface';

const BUFFER_SIZE = 50;
const EMIT_INTERVAL_MS = 100;

/**
 * F6: đọc cảm biến khi màn hình mount, giữ buffer ~50 mẫu cho chart.
 * Native tự throttle emit và tự dừng khi app ra background.
 */
export function useMotionSensor(sensorSet: SensorSet = 'both') {
  const [snapshot, setSnapshot] = useState<MotionSnapshot | null>(null);
  const [samples, setSamples] = useState<MotionSample[]>([]);
  const [label, setLabel] = useState<MotionLabel>('UNKNOWN');
  const [confidence, setConfidence] = useState(0);
  const [status, setStatus] = useState<MotionSnapshot['status']>('AVAILABLE');
  const [isListening, setIsListening] = useState(false);
  const [gyroAvailable, setGyroAvailable] = useState(sensorSet !== 'accelerometer');
  const sensorSetRef = useRef(sensorSet);

  const start = useCallback(async () => {
    await MotionSensor.setEmitInterval(EMIT_INTERVAL_MS);
    try {
      await MotionSensor.start(sensorSetRef.current);
      setGyroAvailable(sensorSetRef.current !== 'accelerometer');
    } catch {
      // Máy không có gyroscope: vẫn đọc được accelerometer thì tiếp tục.
      if (sensorSetRef.current === 'accelerometer') throw new Error('UNAVAILABLE');
      await MotionSensor.start('accelerometer');
      setGyroAvailable(false);
    }
    setIsListening(true);
  }, []);

  useEffect(() => {
    let active = true;

    const unsubscribeSample = addNativeListener('MOTION_SAMPLE', sample => {
      if (!active) return;
      setSamples(previous => [...previous.slice(-(BUFFER_SIZE - 1)), sample]);
    });
    const unsubscribeLabel = addNativeListener('MOTION_LABEL_CHANGED', next => {
      if (!active) return;
      setLabel(next.label);
      setConfidence(next.confidence);
      setSnapshot(previous =>
        previous
          ? { ...previous, label: next.label, confidence: next.confidence, updatedAtMs: next.timestampMs }
          : previous,
      );
    });

    (async () => {
      const current = await MotionSensor.getSnapshot().catch(() => null);
      if (!active) return;
      if (current) {
        setSnapshot(current);
        setLabel(current.label);
        setConfidence(current.confidence);
        setStatus(current.status);
      }
      if (current?.status !== 'AVAILABLE') return;

      try {
        await start();
      } catch {
        if (!active) return;
        setIsListening(false);
        setStatus('UNAVAILABLE');
      }
    })();

    return () => {
      active = false;
      unsubscribeSample();
      unsubscribeLabel();
      MotionSensor.stop().catch(() => {});
    };
  }, [start]);

  return { snapshot, samples, label, confidence, status, isListening, gyroAvailable };
}
