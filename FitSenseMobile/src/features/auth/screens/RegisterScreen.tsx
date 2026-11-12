import {
  createUserWithEmailAndPassword,
  getAuth,
  updateProfile,
} from '@react-native-firebase/auth';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Alert, ScrollView, Text } from 'react-native';

import { useTheme } from '../../../app/providers/ThemeProvider';
import type { AuthStackParamList } from '../../../app/navigation/types';
import { Button, Card, Input } from '../../../components/common';
import { authErrorMessage } from './authErrors';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const { colors, spacing, typography } = useTheme();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    const nextErrors: Record<string, string> = {};
    if (!displayName.trim()) nextErrors.displayName = 'Vui lòng nhập họ và tên';
    if (!email.trim()) nextErrors.email = 'Vui lòng nhập email';
    else if (!/\S+@\S+\.\S+/.test(email.trim())) nextErrors.email = 'Email không hợp lệ';
    if (!password) nextErrors.password = 'Vui lòng nhập mật khẩu';
    else if (password.length < 6) nextErrors.password = 'Mật khẩu phải từ 6 ký tự';
    if (confirmPassword !== password) {
      nextErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(
        getAuth(),
        email.trim(),
        password,
      );
      await updateProfile(credential.user, {
        displayName: displayName.trim(),
      });
    } catch (error: any) {
      Alert.alert('Đăng ký thất bại', authErrorMessage(error?.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: 'center',
        padding: spacing.lg,
        gap: spacing.lg,
      }}>
      <Text style={[typography.title, { color: colors.text }]}>Tạo tài khoản</Text>

      <Card style={{ gap: spacing.md }}>
        <Input
          label="Họ và tên"
          placeholder="Nguyễn Văn A"
          value={displayName}
          onChangeText={setDisplayName}
          error={errors.displayName}
        />
        <Input
          label="Email"
          placeholder="you@example.com"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          error={errors.email}
        />
        <Input
          label="Mật khẩu"
          placeholder="Tối thiểu 6 ký tự"
          secureTextEntry
          autoComplete="new-password"
          value={password}
          onChangeText={setPassword}
          error={errors.password}
        />
        <Input
          label="Xác nhận mật khẩu"
          placeholder="Nhập lại mật khẩu"
          secureTextEntry
          autoComplete="new-password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          error={errors.confirmPassword}
        />
        <Button title="Đăng ký" onPress={handleRegister} loading={loading} />
        <Button
          title="Đã có tài khoản? Đăng nhập"
          variant="ghost"
          onPress={() => navigation.goBack()}
        />
      </Card>
    </ScrollView>
  );
}
