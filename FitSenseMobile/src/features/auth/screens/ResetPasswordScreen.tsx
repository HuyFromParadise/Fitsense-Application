import { zodResolver } from '@hookform/resolvers/zod';
import {
  getAuth,
  sendPasswordResetEmail,
} from '@react-native-firebase/auth';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CheckCircle2, KeyRound } from 'lucide-react-native';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import type { AuthStackParamList } from '../../../app/navigation/types';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { Button, Card, Input } from '../../../components/common';
import { AuthBrandHeader } from '../components/AuthBrandHeader';
import { authErrorMessage } from './authErrors';

type Props = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;

const resetSchema = z.object({
  email: z.string().trim().min(1, 'Vui lòng nhập email').email('Email không hợp lệ'),
});

type ResetValues = z.infer<typeof resetSchema>;

export function ResetPasswordScreen({ navigation }: Props) {
  const { colors, radius, spacing, typography } = useTheme();
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
            icon={<KeyRound size={28} color={colors.primary} strokeWidth={2} />}
            title="Quên mật khẩu"
            subtitle="Nhập email đã đăng ký, chúng tôi sẽ gửi liên kết đặt lại mật khẩu."
          />

          <Card style={{ gap: spacing.md }}>
            {sent ? (
              <View style={[styles.sentContainer, { gap: spacing.md }]}>
                <View
                  style={[
                    styles.successBadge,
                    {
                      backgroundColor: colors.surfaceAlt,
                      borderRadius: radius.pill,
                      padding: spacing.md,
                    },
                  ]}>
                  <CheckCircle2 size={32} color={colors.success} strokeWidth={2} />
                </View>
                <Text
                  style={[
                    typography.heading,
                    styles.centered,
                    { color: colors.text },
                  ]}>
                  Đã gửi email khôi phục
                </Text>
                <Text
                  style={[
                    typography.body,
                    styles.centered,
                    { color: colors.textMuted },
                  ]}>
                  Vui lòng kiểm tra hộp thư (kể cả thư mục Spam) để đặt lại mật khẩu.
                </Text>
                <Button
                  title="Quay lại đăng nhập"
                  onPress={() => navigation.goBack()}
                  style={styles.fullWidth}
                />
              </View>
            ) : (
              <>
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
                      returnKeyType="done"
                      onSubmitEditing={() => {
                        handleReset();
                      }}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.email?.message}
                    />
                  )}
                />
                <Button
                  title="Gửi liên kết khôi phục"
                  onPress={handleReset}
                  loading={loading}
                />
                <Button
                  title="Quay lại đăng nhập"
                  variant="ghost"
                  disabled={loading}
                  onPress={() => navigation.goBack()}
                />
              </>
            )}
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  sentContainer: {
    alignItems: 'center',
  },
  successBadge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    textAlign: 'center',
  },
  fullWidth: {
    width: '100%',
  },
});
