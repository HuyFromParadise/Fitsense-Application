import { zodResolver } from '@hookform/resolvers/zod';
import {
  getAuth,
  sendPasswordResetEmail,
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

type Props = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;

const resetSchema = z.object({
  email: z.string().trim().min(1, 'Vui lòng nhập email').email('Email không hợp lệ'),
});

type ResetValues = z.infer<typeof resetSchema>;

export function ResetPasswordScreen({ navigation }: Props) {
  const { colors, spacing, typography } = useTheme();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: '' },
  });

  const handleReset = handleSubmit(async values => {
    setLoading(true);
    try {
      await sendPasswordResetEmail(getAuth(), values.email.trim());
      setSent(true);
    } catch (err: any) {
      Alert.alert('Gửi email thất bại', authErrorMessage(err?.code));
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
          <Text style={[typography.title, { color: colors.text }]}>Quên mật khẩu</Text>

          <Card style={{ gap: spacing.md }}>
            {sent ? (
              <>
                <Text style={[typography.body, { color: colors.success }]}>
                  Đã gửi email khôi phục. Vui lòng kiểm tra hộp thư của bạn.
                </Text>
                <Button title="Quay lại đăng nhập" onPress={() => navigation.goBack()} />
              </>
            ) : (
              <>
                <Text style={[typography.body, { color: colors.textMuted }]}>
                  Nhập email đã đăng ký, chúng tôi sẽ gửi liên kết đặt lại mật khẩu.
                </Text>
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
                <Button
                  title="Gửi liên kết khôi phục"
                  onPress={handleReset}
                  loading={loading}
                />
              </>
            )}
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
