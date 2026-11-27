import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  AppState,
  Easing,
  type AppStateStatus,
} from 'react-native';

export interface DustParticleAnim {
  translateX: Animated.AnimatedInterpolation<number>;
  translateY: Animated.AnimatedInterpolation<number>;
  scale: Animated.AnimatedInterpolation<number>;
  opacity: Animated.AnimatedInterpolation<number>;
}

export const ROAD_SEGMENT_WIDTH = 56;
export const NEAR_SCENERY_WIDTH = 320;
export const FAR_SCENERY_WIDTH = 320;
export const DUST_PARTICLE_COUNT = 5;

export interface RunnerAnimationValues {
  reducedMotion: boolean;
  bodyBounceY: Animated.AnimatedInterpolation<number>;
  farArmAngle: Animated.AnimatedInterpolation<string>;
  farForearmAngle: Animated.AnimatedInterpolation<string>;
  nearArmAngle: Animated.AnimatedInterpolation<string>;
  nearForearmAngle: Animated.AnimatedInterpolation<string>;
  backThighAngle: Animated.AnimatedInterpolation<string>;
  backCalfAngle: Animated.AnimatedInterpolation<string>;
  frontThighAngle: Animated.AnimatedInterpolation<string>;
  frontCalfAngle: Animated.AnimatedInterpolation<string>;
  headAngle: Animated.AnimatedInterpolation<string>;
  shadowScaleX: Animated.AnimatedInterpolation<number>;
  shadowOpacity: Animated.AnimatedInterpolation<number>;
  roadTranslateX: Animated.AnimatedInterpolation<number>;
  nearTreesTranslateX: Animated.AnimatedInterpolation<number>;
  farHillsTranslateX: Animated.AnimatedInterpolation<number>;
  dustParticles: DustParticleAnim[];
}

// Matches Runner.svg stride cadence (~540ms per full stride cycle)
const RUNNER_STRIDE_MS = 540;
const ROAD_CYCLE_MS = 540;
const NEAR_PARALLAX_MS = 4800;
const FAR_PARALLAX_MS = 9600;
const DUST_CYCLE_MS = 780;

/**
 * Native-driver (`useNativeDriver: true`) animation hook replicating the exact
 * SMIL `<animateTransform>` joint curves from `assets/images/Runner.svg`
 * combined with synchronized road, parallax scenery, and dust-trail clocks.
 */
export function useRunnerAnimation(isActive = true): RunnerAnimationValues {
  const [appState, setAppState] = useState<AppStateStatus>(
    (AppState.currentState as AppStateStatus) || 'active',
  );
  const [reducedMotion, setReducedMotion] = useState(false);

  const strideClock = useRef(new Animated.Value(0)).current;
  const roadClock = useRef(new Animated.Value(0)).current;
  const nearParallaxClock = useRef(new Animated.Value(0)).current;
  const farParallaxClock = useRef(new Animated.Value(0)).current;
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
      .catch(() => {});

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
      roadClock.stopAnimation();
      nearParallaxClock.stopAnimation();
      farParallaxClock.stopAnimation();
      dustClocks.forEach(p => p.stopAnimation());
      return;
    }

    strideClock.setValue(0);
    roadClock.setValue(0);
    nearParallaxClock.setValue(0);
    farParallaxClock.setValue(0);

    const strideLoop = Animated.loop(
      Animated.timing(strideClock, {
        toValue: 1,
        duration: RUNNER_STRIDE_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

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

    const activeLoops = [strideLoop, roadLoop, nearLoop, farLoop];
    const dustTimers: ReturnType<typeof setTimeout>[] = [];

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

    strideLoop.start();
    roadLoop.start();
    nearLoop.start();
    farLoop.start();

    return () => {
      dustTimers.forEach(clearTimeout);
      activeLoops.forEach(loop => loop.stop());
    };
  }, [
    isActive,
    appState,
    reducedMotion,
    strideClock,
    roadClock,
    nearParallaxClock,
    farParallaxClock,
    dustClocks,
  ]);

  return useMemo(() => {
    const bodyBounceY = strideClock.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: [0, -9, 0, -9, 0],
    });

    // Exact Runner.svg joint angles (i0, i12, i8, i11, i13)
    const farArmAngle = strideClock.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: ['0deg', '-180deg', '0deg'],
    });
    const farForearmAngle = strideClock.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: ['0deg', '-10deg', '0deg'],
    });

    const nearArmAngle = strideClock.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: ['0deg', '180deg', '0deg'],
    });
    const nearForearmAngle = strideClock.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: ['0deg', '10deg', '0deg'],
    });

    const backThighAngle = strideClock.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: ['0deg', '115deg', '0deg'],
    });
    const backCalfAngle = strideClock.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: ['0deg', '-130deg', '0deg'],
    });

    const frontThighAngle = strideClock.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: ['0deg', '-115deg', '0deg'],
    });
    const frontCalfAngle = strideClock.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: ['0deg', '130deg', '0deg'],
    });

    const headAngle = strideClock.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: ['0deg', '20deg', '0deg'],
    });

    const shadowScaleX = strideClock.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: [1, 0.82, 1, 0.82, 1],
    });

    const shadowOpacity = strideClock.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: [0.42, 0.24, 0.42, 0.24, 0.42],
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
      reducedMotion,
      bodyBounceY,
      farArmAngle,
      farForearmAngle,
      nearArmAngle,
      nearForearmAngle,
      backThighAngle,
      backCalfAngle,
      frontThighAngle,
      frontCalfAngle,
      headAngle,
      shadowScaleX,
      shadowOpacity,
      roadTranslateX,
      nearTreesTranslateX,
      farHillsTranslateX,
      dustParticles,
    };
  }, [
    reducedMotion,
    strideClock,
    roadClock,
    nearParallaxClock,
    farParallaxClock,
    dustClocks,
  ]);
}
