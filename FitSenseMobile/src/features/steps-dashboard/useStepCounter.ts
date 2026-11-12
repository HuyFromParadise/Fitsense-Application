import { useCallback, useEffect, useState } from 'react';

import { addNativeListener, StepCounter } from '../../services/native';
import type {
  PermissionStatus,
  StepCounterSnapshot,
  StepCounterStatus,
} from '../../types/native-interface';

export function useStepCounter() {
  const [snapshot, setSnapshot] = useState<StepCounterSnapshot | null>(null);
  const [status, setStatus] = useState<StepCounterStatus>('AVAILABLE');
  const [permission, setPermission] = useState<PermissionStatus>('NOT_DETERMINED');
  const [isListening, setIsListening] = useState(false);

  const start = useCallback(async () => {
    try {
      const current = await StepCounter.getTodaySteps();
      setSnapshot(current);
      await StepCounter.start();
      setIsListening(true);
    } catch {
      setIsListening(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const unsubscribe = addNativeListener('STEP_UPDATE', next => {
      if (active) setSnapshot(next);
    });

    (async () => {
      const nextStatus = await StepCounter.getStatus();
      if (!active) return;
      setStatus(nextStatus);
      if (nextStatus === 'PERMISSION_DENIED') {
        setPermission('DENIED');
      } else if (nextStatus === 'AVAILABLE') {
        setPermission('GRANTED');
      }

      if (nextStatus === 'AVAILABLE') {
        try {
          const current = await StepCounter.getTodaySteps();
          if (!active) return;
          setSnapshot(current);
          await StepCounter.start();
          if (active) setIsListening(true);
        } catch {
          if (active) setIsListening(false);
        }
      }
    })();

    return () => {
      active = false;
      unsubscribe();
      StepCounter.stop().catch(() => {});
    };
  }, []);

  const requestPermission = useCallback(async () => {
    const result = await StepCounter.requestPermission();
    setPermission(result);
    if (result === 'GRANTED') {
      const nextStatus = await StepCounter.getStatus();
      setStatus(nextStatus);
      if (nextStatus === 'AVAILABLE') await start();
    }
    return result;
  }, [start]);

  return { snapshot, status, permission, requestPermission, isListening };
}
