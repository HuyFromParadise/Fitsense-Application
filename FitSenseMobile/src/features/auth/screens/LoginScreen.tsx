import { zodResolver } from '@hookform/resolvers/zod';
import { getAuth, signInWithEmailAndPassword } from '@react-native-firebase/auth';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import type { AuthStackParamList } from '../../../app/navigation/types';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { Button, Card, Input } from '../../../components/common';
import { AuthBrandHeader } from '../components/AuthBrandHeader';
import { PasswordInput } from '../components/PasswordInput';
import { signInWithGoogle } from '../googleSignIn';
import { authErrorMessage } from './authErrors';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Vui lòng nhập email').email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginScreen({ navigation }: Props) {
  const { colors, spacing, typography } = useTheme();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const passwordRef = useRef<React.ComponentRef<typeof TextInput>>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const handleLogin = handleSubmit(async values => {
    setLoading(true);
    try {
      // onAuthStateChanged (AuthProvider) flips navigation once signed in.
      await signInWithEmailAndPassword(getAuth(), values.email.trim(), values.password);
    } catch (error: any) {
      Alert.alert('Đăng nhập thất bại', authErrorMessage(error?.code));
    } finally {
      setLoading(false);
    }
  });

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      if (error?.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
        Alert.alert(
          'Không hỗ trợ',
          'Thiết bị cần Google Play Services để đăng nhập bằng Google.',
        );
      } else {
        Alert.alert(
          'Đăng nhập Google thất bại',
          authErrorMessage(error?.code),
        );
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            padding: spacing.lg,
            gap: spacing.xl,
          }}>
          <AuthBrandHeader
            showLogo
            title="FitSense"
            tagline="Move Better. Live Healthier."
            subtitle="Đăng nhập để theo dõi bước chân, GPS và mục tiêu."
          />

          <Card style={{ gap: spacing.md }}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Email"
                  placeholder="you@example.com"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  keyboardType="email-address"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.email?.message}
                />
              )}
            />

            <View style={{ gap: spacing.xs }}>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <PasswordInput
                    ref={passwordRef}
                    label="Mật khẩu"
                    placeholder="••••••"
                    autoComplete="password"
                    textContentType="password"
                    returnKeyType="done"
                    onSubmitEditing={() => {
                      handleLogin();
                    }}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.password?.message}
                  />
                )}
              />

              <View style={styles.forgotRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Quên mật khẩu"
                  disabled={loading || googleLoading}
                  onPress={() => navigation.navigate('ResetPassword')}
                  style={({ pressed }) => [
                    styles.linkBtn,
                    { opacity: pressed ? 0.65 : 1 },
                  ]}>
                  <Text style={[typography.label, { color: colors.primary }]}>
                    Quên mật khẩu?
                  </Text>
                </Pressable>
              </View>
            </View>

            <Button
              title="Đăng nhập"
              onPress={handleLogin}
              loading={loading}
              disabled={googleLoading}
            />

            <View style={[styles.dividerRow, { gap: spacing.sm }]}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                hoặc
              </Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            <Button
              title="Đăng nhập với Google"
              variant="secondary"
              onPress={handleGoogleLogin}
              loading={googleLoading}
              disabled={loading}
            />
          </Card>

          <View style={[styles.footerRow, { gap: spacing.xs }]}>
            <Text style={[typography.body, { color: colors.textMuted }]}>
              Chưa có tài khoản?
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tạo tài khoản mới"
              disabled={loading || googleLoading}
              onPress={() => navigation.navigate('Register')}
              style={({ pressed }) => [
                styles.linkBtn,
                { opacity: pressed ? 0.65 : 1 },
              ]}>
              <Text style={[typography.label, { color: colors.primary }]}>
                Đăng ký ngay
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  forgotRow: {
    alignItems: 'flex-end',
  },
  linkBtn: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
