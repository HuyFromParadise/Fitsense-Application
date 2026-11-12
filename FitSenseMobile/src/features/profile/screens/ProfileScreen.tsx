import React from 'react';
import { ScrollView, Text } from 'react-native';

import { useTheme } from '../../../app/providers/ThemeProvider';
import { Button, Card } from '../../../components/common';
import { useAuthStore } from '../../../stores/useAuthStore';

export function ProfileScreen() {
  const { colors, spacing, typography } = useTheme();
  const user = useAuthStore(state => state.user);
  const signOut = useAuthStore(state => state.signOut);

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      <Text style={[typography.heading, { color: colors.text }]}>Cá nhân</Text>
      <Card style={{ gap: spacing.sm }}>
        <Text style={[typography.body, { color: colors.text }]}>
          {user?.displayName ?? 'Chưa đăng nhập'}
        </Text>
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          {user?.email ?? '—'}
        </Text>
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          F1 (A) sẽ thêm chiều cao, cân nặng đọc từ Firestore.
        </Text>
      </Card>
      <Button title="Đăng xuất" variant="danger" onPress={signOut} />
    </ScrollView>
  );
}
