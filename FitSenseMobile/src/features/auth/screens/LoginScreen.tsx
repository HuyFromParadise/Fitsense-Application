import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { useTheme } from '../../../app/providers/ThemeProvider';
import { Button, Card, Input } from '../../../components/common';
import { useAuthStore } from '../../../stores/useAuthStore';
import type { AuthStackParamList } from '../../../app/navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { colors, spacing, typography } = useTheme();
  const setSession = useAuthStore(state => state.setSession);
  const [email, setEmail] = useState('');

  // Khung: F1 (A) thay bằng Firebase signIn. Ngày 1 dùng token dev của backend.
  const handleDevLogin = () => {
    setSession('dev-token', {
      uid: 'dev-user',
      email: email || 'dev@fitsense.local',
      displayName: 'Dev User',
    });
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}>
      <Text style={[typography.title, { color: colors.text }]}>FitSense</Text>
      <Text style={[typography.body, { color: colors.textMuted }]}>
        Đăng nhập để bắt đầu theo dõi hoạt động.
      </Text>

      <Card style={{ gap: spacing.md }}>
        <Input
          label="Email"
          placeholder="you@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <Input label="Mật khẩu" placeholder="••••••" secureTextEntry />
        <Button title="Đăng nhập (dev)" onPress={handleDevLogin} />
        <Button
          title="Quên mật khẩu"
          variant="ghost"
          onPress={() => navigation.navigate('ResetPassword')}
        />
        <Button
          title="Tạo tài khoản"
          variant="secondary"
          onPress={() => navigation.navigate('Register')}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
  },
});
