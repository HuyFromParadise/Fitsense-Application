import { Eye, EyeOff } from 'lucide-react-native';
import React, { forwardRef, memo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { useTheme } from '../../../app/providers/ThemeProvider';

export interface PasswordInputProps extends Omit<TextInputProps, 'secureTextEntry'> {
  label?: string;
  error?: string | null;
}

/**
 * Accessible password input with show/hide visibility toggle (>= 44dp target),
 * 48dp touch height, and focus/error border states matching common/Input.
 */
export const PasswordInput = memo(
  forwardRef<React.ComponentRef<typeof TextInput>, PasswordInputProps>(function PasswordInput(
    { label, error, style, onFocus, onBlur, ...rest },
    ref,
  ) {
    const { colors, radius, spacing, typography } = useTheme();
    const [visible, setVisible] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const borderColor = error
      ? colors.danger
      : isFocused
        ? colors.primary
        : colors.border;

    return (
      <View style={{ gap: spacing.xs }}>
        {label ? (
          <Text style={[typography.label, { color: colors.text }]}>{label}</Text>
        ) : null}
        <View
          style={[
            styles.inputWrapper,
            {
              backgroundColor: colors.surface,
              borderColor,
              borderRadius: radius.md,
            },
          ]}>
          <TextInput
            ref={ref}
            placeholderTextColor={colors.textMuted}
            secureTextEntry={!visible}
            onFocus={e => {
              setIsFocused(true);
              onFocus?.(e);
            }}
            onBlur={e => {
              setIsFocused(false);
              onBlur?.(e);
            }}
            style={[
              styles.input,
              typography.body,
              {
                color: colors.text,
                paddingLeft: spacing.md,
                paddingVertical: spacing.sm,
              },
              style,
            ]}
            {...rest}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            onPress={() => setVisible(v => !v)}
            style={({ pressed }) => [
              styles.toggleBtn,
              { opacity: pressed ? 0.65 : 1 },
            ]}>
            {visible ? (
              <EyeOff size={20} color={colors.textMuted} strokeWidth={2} />
            ) : (
              <Eye size={20} color={colors.textMuted} strokeWidth={2} />
            )}
          </Pressable>
        </View>
        {error ? (
          <Text style={[typography.caption, { color: colors.danger }]}>
            {error}
          </Text>
        ) : null}
      </View>
    );
  }),
);

const styles = StyleSheet.create({
  inputWrapper: {
    minHeight: 48,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minHeight: 48,
  },
  toggleBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
