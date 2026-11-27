import { zodResolver } from '@hookform/resolvers/zod';
import {
  createUserWithEmailAndPassword,
  getAuth,
  updateProfile,
} from '@react-native-firebase/auth';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { UserPlus } from 'lucide-react-native';
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

  const emailRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const passwordRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const confirmRef = useRef<React.ComponentRef<typeof TextInput>>(null);

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
            icon={<UserPlus size={28} color={colors.primary} strokeWidth={2} />}
            title="Tạo tài khoản"
            subtitle="Bắt đầu hành trình tập luyện và theo dõi sức khỏe cùng FitSense."
          />

          <Card style={{ gap: spacing.md }}>
            <Controller
              control={control}
              name="displayName"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Họ và tên"
                  placeholder="Nguyễn Văn A"
                  autoComplete="name"
                  textContentType="name"
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.displayName?.message}
                />
              )}
            />
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
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <PasswordInput
                  ref={passwordRef}
                  label="Mật khẩu"
                  placeholder="Tối thiểu 6 ký tự"
                  autoComplete="new-password"
                  textContentType="newPassword"
                  returnKeyType="next"
                  onSubmitEditing={() => confirmRef.current?.focus()}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.password?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <PasswordInput
                  ref={confirmRef}
                  label="Xác nhận mật khẩu"
                  placeholder="Nhập lại mật khẩu"
                  autoComplete="new-password"
                  textContentType="newPassword"
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    handleRegister();
                  }}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.confirmPassword?.message}
                />
              )}
            />
            <Button title="Đăng ký" onPress={handleRegister} loading={loading} />
          </Card>

          <View style={[styles.footerRow, { gap: spacing.xs }]}>
            <Text style={[typography.body, { color: colors.textMuted }]}>
              Đã có tài khoản?
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Quay lại đăng nhập"
              disabled={loading}
              onPress={() => navigation.goBack()}
              style={({ pressed }) => [
                styles.linkBtn,
                { opacity: pressed ? 0.65 : 1 },
              ]}>
              <Text style={[typography.label, { color: colors.primary }]}>
                Đăng nhập
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
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkBtn: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
});
