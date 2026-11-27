import { zodResolver } from '@hookform/resolvers/zod';
import {
  createUserWithEmailAndPassword,
  getAuth,
  updateProfile,
} from '@react-native-firebase/auth';
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

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

const registerSchema = z
  .object({
    displayName: z.string().trim().min(1, 'Vui lòng nhập họ và tên'),
    email: z.string().trim().min(1, 'Vui lòng nhập email').email('Email không hợp lệ'),
    password: z.string().min(6, 'Mật khẩu phải từ 6 ký tự'),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
  })
  .refine(values => values.password === values.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

type RegisterValues = z.infer<typeof registerSchema>;

export function RegisterScreen({ navigation }: Props) {
  const { colors, spacing, typography } = useTheme();
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const handleRegister = handleSubmit(async values => {
    setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(
        getAuth(),
        values.email.trim(),
        values.password,
      );
      await updateProfile(credential.user, {
        displayName: values.displayName.trim(),
      });
    } catch (error: any) {
      Alert.alert('Đăng ký thất bại', authErrorMessage(error?.code));
    } finally {
      setLoading(false);
    }
  });

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
          <Text style={[typography.title, { color: colors.text }]}>Tạo tài khoản</Text>

          <Card style={{ gap: spacing.md }}>
            <Controller
              control={control}
              name="displayName"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Họ và tên"
                  placeholder="Nguyễn Văn A"
                  value={value}
                  onChangeText={onChange}
                  error={errors.displayName?.message}
                />
              )}
            />
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
                  placeholder="Tối thiểu 6 ký tự"
                  secureTextEntry
                  autoComplete="new-password"
                  value={value}
                  onChangeText={onChange}
                  error={errors.password?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Xác nhận mật khẩu"
                  placeholder="Nhập lại mật khẩu"
                  secureTextEntry
                  autoComplete="new-password"
                  value={value}
                  onChangeText={onChange}
                  error={errors.confirmPassword?.message}
                />
              )}
            />
            <Button title="Đăng ký" onPress={handleRegister} loading={loading} />
            <Button
              title="Đã có tài khoản? Đăng nhập"
              variant="ghost"
              onPress={() => navigation.goBack()}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
