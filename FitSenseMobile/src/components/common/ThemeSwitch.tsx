import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme } from '../../app/providers/ThemeProvider';

export function ThemeSwitch() {
  const { isDark, toggleTheme, colors } = useTheme();
  const slideAnim = useRef(new Animated.Value(isDark ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isDark ? 1 : 0,
      useNativeDriver: true,
      speed: 20,
      bounciness: 6,
    }).start();
  }, [isDark, slideAnim]);

  // Thumb position translates between 2px (light) and 34px (dark)
  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 34],
  });

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel="Chuyển chế độ Sáng / Tối"
      accessibilityState={{ checked: isDark }}
      onPress={toggleTheme}
      style={[
        styles.track,
        {
          backgroundColor: isDark ? colors.surfaceAlt : colors.border,
          borderColor: isDark ? colors.primary : colors.border,
        },
      ]}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.trackIcon}>☀️</Text>
        <Text style={styles.trackIcon}>🌙</Text>
      </View>
      <Animated.View
        style={[
          styles.thumb,
          {
            backgroundColor: colors.primary,
            transform: [{ translateX }],
          },
        ]}
      >
        <Text style={styles.thumbIcon}>{isDark ? '🌙' : '☀️'}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 68,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 2,
    justifyContent: 'center',
  },
  iconContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  trackIcon: {
    fontSize: 13,
    opacity: 0.5,
  },
  thumb: {
    position: 'absolute',
    left: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 2.5,
  },
  thumbIcon: {
    fontSize: 14,
  },
});
