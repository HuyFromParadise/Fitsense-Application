import { zodResolver } from '@hookform/resolvers/zod';
import { getAuth, signInWithEmailAndPassword } from '@react-native-firebase/auth';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { useTheme } from '../../../app/providers/ThemeProvider';
import type { AuthStackParamList } from '../../../app/navigation/types';
import { Button, Card, Input } from '../../../components/common';
import { authErrorMessage } from './authErrors';
import { signInWithGoogle } from '../googleSignIn';

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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            padding: spacing.lg,
            gap: spacing.lg,
          }}>
          <Text style={[typography.title, { color: colors.text }]}>FitSense</Text>
          <Text style={[typography.body, { color: colors.textMuted }]}>
            Đăng nhập để bắt đầu theo dõi hoạt động.
          </Text>

          <Card style={{ gap: spacing.md }}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Email"
                  placeholder="you@example.com"
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  value={value}
                  onChangeText={onChange}
                  error={errors.email?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Mật khẩu"
                  placeholder="••••••"
                  secureTextEntry
                  autoComplete="password"
                  value={value}
                  onChangeText={onChange}
                  error={errors.password?.message}
                />
              )}
            />
            <Button title="Đăng nhập" onPress={handleLogin} loading={loading} />
            <Button
              title="Đăng nhập với Google"
              variant="secondary"
              onPress={handleGoogleLogin}
              loading={googleLoading}
              disabled={loading}
            />
            <Button
              title="Quên mật khẩu"
              variant="ghost"
              disabled={loading || googleLoading}
              onPress={() => navigation.navigate('ResetPassword')}
            />
            <Button
              title="Tạo tài khoản"
              variant="secondary"
              disabled={loading || googleLoading}
              onPress={() => navigation.navigate('Register')}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
