import {
  getAuth,
  sendPasswordResetEmail,
} from '@react-native-firebase/auth';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Alert, ScrollView, Text } from 'react-native';

import { useTheme } from '../../../app/providers/ThemeProvider';
import type { AuthStackParamList } from '../../../app/navigation/types';
import { Button, Card, Input } from '../../../components/common';
import { authErrorMessage } from './authErrors';

type Props = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;

export function ResetPasswordScreen({ navigation }: Props) {
  const { colors, spacing, typography } = useTheme();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) {
      setError('Vui lòng nhập email');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(getAuth(), email.trim());
      setSent(true);
    } catch (err: any) {
      Alert.alert('Gửi email thất bại', authErrorMessage(err?.code));
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
            <Input
              label="Email"
              placeholder="you@example.com"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={email}
              onChangeText={text => {
                setEmail(text);
                setError(undefined);
              }}
              error={error}
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
  );
}
