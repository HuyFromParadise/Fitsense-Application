import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
  Modal,
  Dimensions,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Svg, {
  Path,
  Circle,
  Line,
  G,
  Defs,
  LinearGradient,
  Stop,
  Ellipse,
} from 'react-native-svg';

export type ThemeName = 'light' | 'dark';

export interface ThemeSwitchProps {
  /** Current theme displayed by the component */
  theme?: ThemeName;
  /** Callback fired when the switch animation completes full-screen coverage */
  onThemeChange?: (theme: ThemeName) => void;
  /** Legacy prop for compatibility; effect is fixed to 'rain' */
  defaultEffect?: string;
  /** Optional size of the toggle button (default: 52) */
  size?: number;
  /** Optional custom container style */
  style?: StyleProp<ViewStyle>;
}

interface RainDrop {
  z: number; // depth: 0 (far/slow) to 1 (near/fast)
  spawn: number;
  fallDuration: number;
  landX: number;
  landY: number;
  len: number;
  width: number;
  alpha: number;
  puddleRadius: number;
  splashes: { vx: number; vy: number; r: number }[];
}

// Ease out cubic helper
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export default function ThemeSwitch({
  theme = 'dark',
  onThemeChange,
  size = 52,
  style,
}: ThemeSwitchProps) {
  const [currentTheme, setCurrentTheme] = useState<ThemeName>(theme);
  const [isSwitching, setIsSwitching] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  // Button spring & icon morph animations
  const buttonScale = useRef(new Animated.Value(1)).current;
  const iconTransition = useRef(new Animated.Value(theme === 'dark' ? 1 : 0)).current;

  // Track next theme
  const nextThemeRef = useRef<ThemeName>(theme === 'dark' ? 'light' : 'dark');
  const animStartTimeRef = useRef(0);
  const animFrameIdRef = useRef<number | null>(null);
  const watchdogTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Rain plan for the entire screen
  const rainPlanRef = useRef<RainDrop[]>([]);

  // Synchronize incoming external theme
  useEffect(() => {
    if (!isSwitching) {
      setCurrentTheme(theme);
      Animated.timing(iconTransition, {
        toValue: theme === 'dark' ? 1 : 0,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [theme, isSwitching, iconTransition]);

  // Cleanup timers & RAF on unmount
  useEffect(() => {
    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
      }
    };
  }, []);

  // Generate a multi-depth cinematic rain shower across the entire screen
  const generateFullScreenRain = useCallback((w: number, h: number): RainDrop[] => {
    const drops: RainDrop[] = [];
    // 46 drops with depth variation provides full coverage without JS thread overhead
    const count = 46;

    for (let i = 0; i < count; i++) {
      const z = Math.random(); // 0 = background, 1 = foreground

      // Slower, graceful falling speed: 580ms (near) to 880ms (far)
      const fallDuration = 880 - z * 300;

      // Drops keep entering gracefully over first 750ms
      const spawn = (i / count) * 750 + Math.random() * 80;

      const landX = Math.random() * w;
      // Landing positions distributed across full screen height
      const landY = 60 + Math.random() * (h - 90);

      // Drops with depth: near drops are longer, thicker, brighter
      const len = 14 + z * 16;
      const width = 1.0 + z * 1.2;
      const alpha = 0.35 + z * 0.55;
      const puddleRadius = 55 + z * 45;

      const splashes = [];
      const splashCount = Math.floor(2 + z * 3);
      for (let s = 0; s < splashCount; s++) {
        const angle = -Math.PI * (0.18 + Math.random() * 0.64);
        const speed = (35 + Math.random() * 65) * (0.6 + z * 0.5);
        splashes.push({
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          r: 1.0 + z * 1.3,
        });
      }

      drops.push({
        z,
        spawn,
        fallDuration,
        landX,
        landY,
        len,
        width,
        alpha,
        puddleRadius,
        splashes,
      });
    }

    return drops;
  }, []);

  const handleToggle = () => {
    if (isSwitching) return;

    const next = currentTheme === 'dark' ? 'light' : 'dark';
    nextThemeRef.current = next;

    const { width: scrW, height: scrH } = Dimensions.get('screen');
    rainPlanRef.current = generateFullScreenRain(scrW, scrH);
    setIsSwitching(true);
    setElapsedMs(0);

    // Button spring micro-interaction
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.88,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.spring(buttonScale, {
        toValue: 1,
        friction: 6,
        tension: 45,
        useNativeDriver: true,
      }),
    ]).start();

    // Morph icons smoothly
    Animated.timing(iconTransition, {
      toValue: next === 'dark' ? 1 : 0,
      duration: 650,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // Total cinematic rain duration: 1650ms
    const totalDuration = 1650;
    animStartTimeRef.current = Date.now();
    let committed = false;

    // Watchdog to guarantee state reset
    if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
    watchdogTimerRef.current = setTimeout(() => {
      setIsSwitching(false);
      setElapsedMs(0);
      animFrameIdRef.current = null;
    }, totalDuration + 200);

    const tick = () => {
      const elapsed = Date.now() - animStartTimeRef.current;
      setElapsedMs(elapsed);

      // Commit theme when puddles merge across the entire display (~1150ms)
      if (elapsed >= 1150 && !committed) {
        committed = true;
        setCurrentTheme(next);
        onThemeChange?.(next);
      }

      if (elapsed < totalDuration) {
        animFrameIdRef.current = requestAnimationFrame(tick);
      } else {
        setIsSwitching(false);
        setElapsedMs(0);
        animFrameIdRef.current = null;
        if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
      }
    };

    animFrameIdRef.current = requestAnimationFrame(tick);
  };

  // Color values
  const isDark = currentTheme === 'dark';
  const nextIsDark = nextThemeRef.current === 'dark';
  const nextBgColor = nextIsDark ? '#0E0E12' : '#FFFFFF';
  const streakColor = nextIsDark ? '#374151' : '#94A3B8';

  const btnBg = isDark ? '#18181D' : '#F1F5F9';
  const btnBorder = isDark ? '#2E2E38' : '#E2E8F0';
  const iconColor = isDark ? '#FF6B00' : '#1E293B';

  // Icon transitions
  const moonOpacity = iconTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const moonRotate = iconTransition.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-90deg'],
  });
  const moonScale = iconTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.6],
  });

  const sunOpacity = iconTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const sunRotate = iconTransition.interpolate({
    inputRange: [0, 1],
    outputRange: ['90deg', '0deg'],
  });
  const sunScale = iconTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });

  const { width: scrW, height: scrH } = Dimensions.get('screen');

  // Full-screen flood progression (merges from 950ms to 1400ms)
  const floodStartMs = 950;
  const floodEndMs = 1380;
  const floodProgress =
    elapsedMs > floodStartMs
      ? Math.min(1, (elapsedMs - floodStartMs) / (floodEndMs - floodStartMs))
      : 0;
  const easedFlood = easeOutCubic(floodProgress);
  const maxFloodRadius = Math.ceil(Math.hypot(scrW, scrH) / 2) + 60;

  // Active rain elements computed efficiently
  const rainElements = useMemo(() => {
    if (!isSwitching || elapsedMs === 0) return null;

    const puddles: React.ReactNode[] = [];
    const streaks: React.ReactNode[] = [];
    const splashes: React.ReactNode[] = [];

    const drops = rainPlanRef.current;
    const len = drops.length;

    for (let i = 0; i < len; i++) {
      const drop = drops[i];
      const landTime = drop.spawn + drop.fallDuration;

      // 1. Falling rain streaks (graceful terminal velocity with 9° wind angle)
      if (elapsedMs >= drop.spawn && elapsedMs <= landTime) {
        const t = (elapsedMs - drop.spawn) / drop.fallDuration;
        // Linear smooth fall
        const curY = t * drop.landY;
        const curX = drop.landX - (1 - t) * 24; // 9° wind slant

        streaks.push(
          <Line
            key={`strk-${i}`}
            x1={curX - 3.8}
            y1={curY - drop.len}
            x2={curX}
            y2={curY}
            stroke="url(#cinematicRainStreak)"
            strokeWidth={drop.width}
            strokeLinecap="round"
            opacity={drop.alpha}
          />
        );
      }

      // 2. Liquid puddles spreading on impact
      if (elapsedMs > landTime) {
        const puddleAge = elapsedMs - landTime;
        // Puddles expand smoothly as liquid wetting surface
        const spreadTau = 280; // ms
        const spreadFactor = 1 - Math.exp(-puddleAge / spreadTau);

        // Gentle merge boost as flood approaches
        const mergeBoost =
          elapsedMs > 900 ? Math.min(2.5, ((elapsedMs - 900) / 400) * 2.5) : 0;
        const rad =
          (10 + drop.puddleRadius * spreadFactor) * (1 + mergeBoost);

        puddles.push(
          <Circle
            key={`pud-${i}`}
            cx={drop.landX}
            cy={drop.landY}
            r={rad}
            fill={nextBgColor}
            opacity={Math.min(1, 0.45 + spreadFactor * 0.55)}
          />
        );
      }

      // 3. Ripples and crown splashes at impact points
      if (elapsedMs > landTime && elapsedMs - landTime < 450) {
        const impactAge = elapsedMs - landTime;
        const p = impactAge / 450;
        const easedP = easeOutCubic(p);

        splashes.push(
          <G key={`spl-${i}`}>
            {/* Ripple ring expanding and fading */}
            <Ellipse
              cx={drop.landX}
              cy={drop.landY}
              rx={(drop.puddleRadius * 0.45) * easedP}
              ry={(drop.puddleRadius * 0.28) * easedP}
              stroke={nextBgColor}
              strokeWidth={1.2}
              fill="none"
              opacity={(1 - p) * 0.75}
            />
            {/* Crown splash droplets under gravity */}
            {drop.splashes.map((sp, sIdx) => {
              const tSec = impactAge / 1000;
              const spX = drop.landX + sp.vx * tSec;
              const spY =
                drop.landY + sp.vy * tSec + 0.5 * 240 * tSec * tSec; // soft gravity
              return (
                <Circle
                  key={`sp-${i}-${sIdx}`}
                  cx={spX}
                  cy={spY}
                  r={sp.r}
                  fill={nextBgColor}
                  opacity={1 - p}
                />
              );
            })}
          </G>
        );
      }
    }

    return { puddles, streaks, splashes };
  }, [isSwitching, elapsedMs, nextBgColor]);

  return (
    <View style={style}>
      {/* ── TOGGLE BUTTON ── */}
      <Animated.View
        style={{
          transform: [{ scale: buttonScale }],
        }}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleToggle}
          style={[
            styles.toggleBtn,
            {
              width: size,
              height: size,
              borderRadius: Math.round(size * 0.26),
              backgroundColor: btnBg,
              borderColor: btnBorder,
            },
          ]}
        >
          {/* Moon Icon (Light Mode -> tap for Dark) */}
          <Animated.View
            style={[
              styles.iconSlot,
              {
                opacity: moonOpacity,
                transform: [{ rotate: moonRotate }, { scale: moonScale }],
              },
            ]}
          >
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <Path
                d="M20.985 12.486C20.8913 14.2221 20.2967 15.894 19.2731 17.2994C18.2495 18.7048 16.8407 19.7837 15.217 20.4055C13.5934 21.0274 11.8243 21.1656 10.1238 20.8035C8.42322 20.4414 6.86395 19.5945 5.63446 18.3652C4.40497 17.1358 3.55789 15.5766 3.19562 13.8761C2.83334 12.1756 2.97139 10.4065 3.59308 8.78282C4.21476 7.15909 5.29346 5.75019 6.69877 4.72644C8.10409 3.70268 9.77586 3.1079 11.512 3.014C11.917 2.992 12.129 3.474 11.914 3.817C11.1949 4.96755 10.887 6.32787 11.0405 7.67595C11.194 9.02403 11.7999 10.2803 12.7593 11.2397C13.7187 12.1991 14.975 12.805 16.323 12.9585C17.6711 13.112 19.0314 12.8041 20.182 12.085C20.526 11.87 21.007 12.081 20.985 12.486Z"
                stroke={iconColor}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </Animated.View>

          {/* Sun Icon (Dark Mode -> tap for Light) */}
          <Animated.View
            style={[
              styles.iconSlot,
              {
                opacity: sunOpacity,
                transform: [{ rotate: sunRotate }, { scale: sunScale }],
              },
            ]}
          >
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <Circle cx="12" cy="12" r="4" stroke={iconColor} strokeWidth="2" />
              <Path
                d="M12 2V4M12 20V22M4.93 4.93L6.34 6.34M17.66 17.66L19.07 19.07M2 12H4M20 12H22M6.34 17.66L4.93 19.07M19.07 4.93L17.66 6.34"
                stroke={iconColor}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>

      {/* ── FULL-SCREEN CINEMATIC RAIN TRANSITION MODAL ── */}
      <Modal
        visible={isSwitching}
        transparent
        statusBarTranslucent
        animationType="none"
        onRequestClose={() => {}}
      >
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width={scrW} height={scrH} style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id="cinematicRainStreak" x1="0" y1="0" x2="0.16" y2="1">
                <Stop offset="0" stopColor={streakColor} stopOpacity="0" />
                <Stop offset="1" stopColor={streakColor} stopOpacity="0.85" />
              </LinearGradient>
            </Defs>

            {/* 1. Spreading Puddles */}
            {rainElements?.puddles}

            {/* 2. Full-Screen Merge Flood: Unifies all puddles into a seamless sheet */}
            {floodProgress > 0 && (
              <Circle
                cx={scrW / 2}
                cy={scrH / 2}
                r={easedFlood * maxFloodRadius}
                fill={nextBgColor}
              />
            )}

            {/* 3. Falling Rain Streaks */}
            {rainElements?.streaks}

            {/* 4. Ripples & Crown Splash Droplets */}
            {rainElements?.splashes}
          </Svg>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  toggleBtn: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  iconSlot: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
