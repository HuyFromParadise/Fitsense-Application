import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import { colors, spacing, typography } from '../../theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  isPassword?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  isPassword,
  style,
  ...rest
}) => {
  const [hidePassword, setHidePassword] = useState(isPassword);

  return (
    <View style={styles.container}>
      {label && <Text style={[typography.captionBold, styles.label]}>{label}</Text>}
      <View
        style={[
          styles.inputContainer,
          error ? styles.inputError : null,
        ]}
      >
        <TextInput
          placeholderTextColor={colors.textMuted}
          secureTextEntry={hidePassword}
          style={[styles.input, typography.body, style]}
          {...rest}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => setHidePassword(!hidePassword)}
            style={styles.eyeButton}
          >
            <Text style={styles.eyeText}>{hidePassword ? '👁️' : '🙈'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={[typography.caption, styles.errorText]}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 50,
  },
  inputError: {
    borderColor: colors.error,
  },
  input: {
    flex: 1,
    color: colors.text,
    paddingVertical: 0,
  },
  eyeButton: {
    padding: spacing.xs,
  },
  eyeText: {
    fontSize: 16,
  },
  errorText: {
    color: colors.error,
    marginTop: spacing.xs,
  },
});
