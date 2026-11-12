import { getAuth, signInWithEmailAndPassword } from '@react-native-firebase/auth';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Alert, ScrollView, Text } from 'react-native';

import { useTheme } from '../../../app/providers/ThemeProvider';
import type { AuthStackParamList } from '../../../app/navigation/types';
import { Button, Card, Input } from '../../../components/common';
import { authErrorMessage } from './authErrors';
import { signInWithGoogle } from '../googleSignIn';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { colors, spacing, typography } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleLogin = async () => {
    const nextErrors: typeof errors = {};
    if (!email.trim()) nextErrors.email = 'Vui lòng nhập email';
    else if (!/\S+@\S+\.\S+/.test(email.trim())) nextErrors.email = 'Email không hợp lệ';
    if (!password) nextErrors.password = 'Vui lòng nhập mật khẩu';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      // onAuthStateChanged (AuthProvider) flips navigation once signed in.
      await signInWithEmailAndPassword(getAuth(), email.trim(), password);
    } catch (error: any) {
      Alert.alert('Đăng nhập thất bại', authErrorMessage(error?.code));
    } finally {
      setLoading(false);
    }
  };

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
    <ScrollView
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
          placeholder="••••••"
          secureTextEntry
          autoComplete="password"
          value={password}
          onChangeText={setPassword}
          error={errors.password}
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
  );
}
