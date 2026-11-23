import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  AppState,
  Easing,
  type AppStateStatus,
} from 'react-native';

export type TurtleMascotState = 'running' | 'idle' | 'celebration';

export interface DustParticleAnim {
  translateX: Animated.AnimatedInterpolation<number>;
  translateY: Animated.AnimatedInterpolation<number>;
  scale: Animated.AnimatedInterpolation<number>;
  opacity: Animated.AnimatedInterpolation<number>;
}

export interface RunningTurtleAnimationValues {
  state: TurtleMascotState;
  reducedMotion: boolean;
  bodyBounceY: Animated.AnimatedInterpolation<number>;
  bodyTilt: Animated.AnimatedInterpolation<string>;
  bodyScaleY: Animated.AnimatedInterpolation<number>;
  headBobY: Animated.AnimatedInterpolation<number>;
  headTilt: Animated.AnimatedInterpolation<string>;
  tailAngle: Animated.AnimatedInterpolation<string>;
  // Continuous 2-D stepping motion (swing X + lift Y + pivot angle) for each leg pair
  frontLeftLegAngle: Animated.AnimatedInterpolation<string>;
  frontLeftLegX: Animated.AnimatedInterpolation<number>;
  frontLeftLegY: Animated.AnimatedInterpolation<number>;
  frontRightLegAngle: Animated.AnimatedInterpolation<string>;
  frontRightLegX: Animated.AnimatedInterpolation<number>;
  frontRightLegY: Animated.AnimatedInterpolation<number>;
  backLeftLegAngle: Animated.AnimatedInterpolation<string>;
  backLeftLegX: Animated.AnimatedInterpolation<number>;
  backLeftLegY: Animated.AnimatedInterpolation<number>;
  backRightLegAngle: Animated.AnimatedInterpolation<string>;
  backRightLegX: Animated.AnimatedInterpolation<number>;
  backRightLegY: Animated.AnimatedInterpolation<number>;
  eyeScaleY: Animated.AnimatedInterpolation<number>;
  shadowScaleX: Animated.AnimatedInterpolation<number>;
  shadowOpacity: Animated.AnimatedInterpolation<number>;
  roadTranslateX: Animated.AnimatedInterpolation<number>;
  nearTreesTranslateX: Animated.AnimatedInterpolation<number>;
  farHillsTranslateX: Animated.AnimatedInterpolation<number>;
  celebrationFloatY: Animated.AnimatedInterpolation<number>;
  celebrationPulseScale: Animated.AnimatedInterpolation<number>;
  dustParticles: DustParticleAnim[];
}

const RUN_CYCLE_MS = 520;
const IDLE_CYCLE_MS = 1800;
const CELEBRATE_CYCLE_MS = 720;
const BLINK_CYCLE_MS = 3200;
const ROAD_CYCLE_MS = 520;
const NEAR_PARALLAX_MS = 4800;
const FAR_PARALLAX_MS = 9600;
const DUST_CYCLE_MS = 780;

export const ROAD_SEGMENT_WIDTH = 56;
export const NEAR_SCENERY_WIDTH = 320;
export const FAR_SCENERY_WIDTH = 320;
export const DUST_PARTICLE_COUNT = 5;

/**
 * NOTE: In React Native's native driver (`useNativeDriver: true`),
 * `Animated.loop(Animated.sequence([...]))` has a known bug on Android where
 * the sequence runs once and stops ("surfs") instead of resetting to the start.
 *
 * To guarantee truly infinite, continuous looping on the native UI thread,
 * every loop below uses a single linear `Animated.timing(value, { toValue: 1 })`
 * inside `Animated.loop(...)` (which resets 0 -> 1 -> 0 natively forever),
 * and shapes the back-and-forth wave via multi-stop `interpolate` ranges!
 */
export function useRunningTurtleAnimation(
  state: TurtleMascotState = 'running',
  isActive = true,
): RunningTurtleAnimationValues {
  const [appState, setAppState] = useState<AppStateStatus>(
    (AppState.currentState as AppStateStatus) || 'active',
  );
  const [reducedMotion, setReducedMotion] = useState(false);

  // Single-timing 0..1 sawtooth master clocks (guaranteed infinite native loop)
  const strideClock = useRef(new Animated.Value(0)).current;
  const tailClock = useRef(new Animated.Value(0)).current;
  const blinkClock = useRef(new Animated.Value(0)).current;
  const roadClock = useRef(new Animated.Value(0)).current;
  const nearParallaxClock = useRef(new Animated.Value(0)).current;
  const farParallaxClock = useRef(new Animated.Value(0)).current;
  const overlayClock = useRef(new Animated.Value(0)).current;

  const dustClocks = useRef<Animated.Value[]>(
    Array.from({ length: DUST_PARTICLE_COUNT }, () => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(enabled => {
        if (mounted) {
          setReducedMotion(Boolean(enabled));
        }
      })
      .catch(() => { });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      enabled => {
        if (mounted) {
          setReducedMotion(Boolean(enabled));
        }
      },
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      setAppState(nextState);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const shouldAnimate = isActive && appState === 'active' && !reducedMotion;

    if (!shouldAnimate) {
      strideClock.stopAnimation();
      tailClock.stopAnimation();
      blinkClock.stopAnimation();
      roadClock.stopAnimation();
      nearParallaxClock.stopAnimation();
      farParallaxClock.stopAnimation();
      overlayClock.stopAnimation();
      dustClocks.forEach(p => p.stopAnimation());
      return;
    }

    strideClock.setValue(0);
    tailClock.setValue(0);
    blinkClock.setValue(0);
    roadClock.setValue(0);
    nearParallaxClock.setValue(0);
    farParallaxClock.setValue(0);
    overlayClock.setValue(0);

    const activeLoops: Animated.CompositeAnimation[] = [];
    const dustTimers: ReturnType<typeof setTimeout>[] = [];

    // 1. Eye blink loop (single linear 0->1 clock)
    const blinkLoop = Animated.loop(
      Animated.timing(blinkClock, {
        toValue: 1,
        duration: BLINK_CYCLE_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    activeLoops.push(blinkLoop);

    // 2. Tail wag loop (single linear 0->1 clock)
    const tailDuration =
      state === 'celebration' ? 420 : state === 'running' ? 520 : 1400;
    const tailLoop = Animated.loop(
      Animated.timing(tailClock, {
        toValue: 1,
        duration: tailDuration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    activeLoops.push(tailLoop);

    // 3. Primary stride / body clock (single linear 0->1 clock so it NEVER stops after 1 step)
    const primaryDuration =
      state === 'running'
        ? RUN_CYCLE_MS
        : state === 'celebration'
          ? CELEBRATE_CYCLE_MS
          : IDLE_CYCLE_MS;

    const strideLoop = Animated.loop(
      Animated.timing(strideClock, {
        toValue: 1,
        duration: primaryDuration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    activeLoops.push(strideLoop);

    if (state === 'running') {
      const roadLoop = Animated.loop(
        Animated.timing(roadClock, {
          toValue: 1,
          duration: ROAD_CYCLE_MS,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );

      const nearLoop = Animated.loop(
        Animated.timing(nearParallaxClock, {
          toValue: 1,
          duration: NEAR_PARALLAX_MS,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );

      const farLoop = Animated.loop(
        Animated.timing(farParallaxClock, {
          toValue: 1,
          duration: FAR_PARALLAX_MS,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );

      activeLoops.push(roadLoop, nearLoop, farLoop);

      // Single-timing loop per dust particle so particles spawn forever
      dustClocks.forEach((clock, index) => {
        clock.setValue(0);
        const loop = Animated.loop(
          Animated.timing(clock, {
            toValue: 1,
            duration: DUST_CYCLE_MS,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        );
        activeLoops.push(loop);
        const timer = setTimeout(
          () => {
            loop.start();
          },
          (index * DUST_CYCLE_MS) / DUST_PARTICLE_COUNT,
        );
        dustTimers.push(timer);
      });
    } else {
      const overlayLoop = Animated.loop(
        Animated.timing(overlayClock, {
          toValue: 1,
          duration: 1600,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );
      activeLoops.push(overlayLoop);
    }

    activeLoops.forEach(loop => loop.start());

    return () => {
      dustTimers.forEach(clearTimeout);
      activeLoops.forEach(loop => loop.stop());
    };
  }, [
    state,
    isActive,
    appState,
    reducedMotion,
    strideClock,
    tailClock,
    blinkClock,
    roadClock,
    nearParallaxClock,
    farParallaxClock,
    overlayClock,
    dustClocks,
  ]);

  return useMemo(() => {
    // Double-bounce per full stride cycle (2 steps per 0..1 cycle: peak at 0.25 and 0.75)
    const bodyBounceY = strideClock.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange:
        state === 'running'
          ? [0, -8, 0, -8, 0]
          : state === 'celebration'
            ? [0, -16, 0, -16, 0]
            : [0, -3, -5, -3, 0],
    });

    const bodyTilt = strideClock.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange:
        state === 'running'
          ? ['-2deg', '2.5deg', '-2deg', '2.5deg', '-2deg']
          : state === 'celebration'
            ? ['-5deg', '0deg', '5deg', '0deg', '-5deg']
            : ['0deg', '0.6deg', '0deg', '-0.6deg', '0deg'],
    });

    const bodyScaleY = strideClock.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange:
        state === 'idle'
          ? [1, 1.015, 1.03, 1.015, 1]
          : [1, 1.03, 0.98, 1.03, 1],
    });

    const headBobY = strideClock.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange:
        state === 'running'
          ? [1, -4, 1, -4, 1]
          : state === 'celebration'
            ? [0, -6, 0, -6, 0]
            : [0, -1.5, -3, -1.5, 0],
    });

    const headTilt = strideClock.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange:
        state === 'celebration'
          ? ['-6deg', '0deg', '6deg', '0deg', '-6deg']
          : state === 'running'
            ? ['-3deg', '3deg', '-3deg', '3deg', '-3deg']
            : ['0deg', '1deg', '0deg', '-1deg', '0deg'],
    });

    const tailAngle = tailClock.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: ['0deg', '18deg', '0deg', '-16deg', '0deg'],
    });

    /**
     * Authentic quadruped walking/running gait cycle:
     * Diagonal Pair A (Near Front Leg + Back Leg) vs Diagonal Pair B (Far Front Leg)
     * - Pair A swings forward (0 -> 0.5) while lifting off the ground (Y = -9px at 0.25),
     *   then plants and pushes backward on the road (0.5 -> 1.0, Y = 0px).
     * - Pair B is 180° out of phase: pushes backward on the road (0 -> 0.5, Y = 0px),
     *   then lifts off the ground (Y = -9px at 0.75) and swings forward (0.5 -> 1.0).
     */
    const isStepping = state === 'running' || state === 'celebration';

    // Pair A: Near Front Leg (frontRight) & Back Leg (backRight)
    const frontRightLegAngle = strideClock.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: isStepping
        ? ['26deg', '0deg', '-28deg', '0deg', '26deg']
        : ['0deg', '0deg', '0deg', '0deg', '0deg'],
    });
    const frontRightLegX = strideClock.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: isStepping ? [-9, 0, 10, 0, -9] : [0, 0, 0, 0, 0],
    });
    const frontRightLegY = strideClock.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: isStepping ? [0, -10, 0, 1, 0] : [0, 0, 0, 0, 0],
    });

    const backRightLegAngle = strideClock.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: isStepping
        ? ['-26deg', '0deg', '26deg', '0deg', '-26deg']
        : ['0deg', '0deg', '0deg', '0deg', '0deg'],
    });
    const backRightLegX = strideClock.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: isStepping ? [9, 0, -10, 0, 9] : [0, 0, 0, 0, 0],
    });
    const backRightLegY = strideClock.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: isStepping ? [0, 1, 0, -10, 0] : [0, 0, 0, 0, 0],
    });

    // Pair B (180° opposite phase): Far Front Leg (frontLeft) & Far Back Leg (backLeft)
    const frontLeftLegAngle = strideClock.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: isStepping
        ? ['-28deg', '0deg', '26deg', '0deg', '-28deg']
        : ['0deg', '0deg', '0deg', '0deg', '0deg'],
    });
    const frontLeftLegX = strideClock.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: isStepping ? [10, 0, -9, 0, 10] : [0, 0, 0, 0, 0],
    });
    const frontLeftLegY = strideClock.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: isStepping ? [0, 1, 0, -10, 0] : [0, 0, 0, 0, 0],
    });

    const backLeftLegAngle = strideClock.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: isStepping
        ? ['26deg', '0deg', '-26deg', '0deg', '26deg']
        : ['0deg', '0deg', '0deg', '0deg', '0deg'],
    });
    const backLeftLegX = strideClock.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: isStepping ? [-9, 0, 9, 0, -9] : [0, 0, 0, 0, 0],
    });
    const backLeftLegY = strideClock.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: isStepping ? [0, -9, 0, 1, 0] : [0, 0, 0, 0, 0],
    });

    // Quick blink at the very end of the 3.2s blinkClock cycle
    const eyeScaleY = blinkClock.interpolate({
      inputRange: [0, 0.92, 0.96, 1],
      outputRange: [1, 1, 0.12, 1],
    });

    const shadowScaleX = strideClock.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange:
        state === 'running'
          ? [1, 0.85, 1, 0.85, 1]
          : state === 'celebration'
            ? [1, 0.7, 1, 0.7, 1]
            : [1, 0.97, 0.95, 0.97, 1],
    });

    const shadowOpacity = strideClock.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange:
        state === 'running'
          ? [0.42, 0.26, 0.42, 0.26, 0.42]
          : state === 'celebration'
            ? [0.42, 0.16, 0.42, 0.16, 0.42]
            : [0.42, 0.38, 0.35, 0.38, 0.42],
    });

    const roadTranslateX = roadClock.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -ROAD_SEGMENT_WIDTH],
    });

    const nearTreesTranslateX = nearParallaxClock.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -NEAR_SCENERY_WIDTH],
    });

    const farHillsTranslateX = farParallaxClock.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -FAR_SCENERY_WIDTH],
    });

    const celebrationFloatY = overlayClock.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, -8, 0],
    });

    const celebrationPulseScale = overlayClock.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.96, 1.05, 0.96],
    });

    const dustParticles: DustParticleAnim[] = dustClocks.map((clock, index) => {
      const verticalSpread = index % 2 === 0 ? -16 - index * 3 : -8 - index * 4;
      const horizontalReach = -48 - index * 12;

      return {
        translateX: clock.interpolate({
          inputRange: [0, 1],
          outputRange: [0, horizontalReach],
        }),
        translateY: clock.interpolate({
          inputRange: [0, 1],
          outputRange: [0, verticalSpread],
        }),
        scale: clock.interpolate({
          inputRange: [0, 0.4, 1],
          outputRange: [0.35, 1.05, 1.65],
        }),
        opacity: clock.interpolate({
          inputRange: [0, 0.18, 0.7, 1],
          outputRange: [0, 0.55, 0.28, 0],
        }),
      };
    });

    return {
      state,
      reducedMotion,
      bodyBounceY,
      bodyTilt,
      bodyScaleY,
      headBobY,
      headTilt,
      tailAngle,
      frontLeftLegAngle,
      frontLeftLegX,
      frontLeftLegY,
      frontRightLegAngle,
      frontRightLegX,
      frontRightLegY,
      backLeftLegAngle,
      backLeftLegX,
      backLeftLegY,
      backRightLegAngle,
      backRightLegX,
      backRightLegY,
      eyeScaleY,
      shadowScaleX,
      shadowOpacity,
      roadTranslateX,
      nearTreesTranslateX,
      farHillsTranslateX,
      celebrationFloatY,
      celebrationPulseScale,
      dustParticles,
    };
  }, [
    state,
    reducedMotion,
    strideClock,
    tailClock,
    blinkClock,
    roadClock,
    nearParallaxClock,
    farParallaxClock,
    overlayClock,
    dustClocks,
  ]);
}
