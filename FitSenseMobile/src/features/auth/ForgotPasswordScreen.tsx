import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { colors, spacing, typography } from '../../theme';
import { Button, Input, Card } from '../../components/common';

interface ForgotPasswordScreenProps {
  navigation: any;
}

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({
  navigation,
}) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) {
      setError('Vui lòng nhập email');
      return;
    }
    setLoading(true);
    try {
      await auth().sendPasswordResetEmail(email.trim());
      setSent(true);
    } catch (err: any) {
      let msg = 'Không thể gửi email đặt lại mật khẩu.';
      if (err.code === 'auth/user-not-found') {
        msg = 'Không tìm thấy tài khoản với email này.';
      }
      Alert.alert('Lỗi', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardView}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.card}>
          <Text style={[typography.h2, styles.cardTitle]}>Quên mật khẩu</Text>
          <Text style={[typography.body, styles.instructions]}>
            Nhập email đã đăng ký. Chúng tôi sẽ gửi hướng dẫn khôi phục mật khẩu.
          </Text>

          {sent ? (
            <View style={styles.successContainer}>
              <Text style={styles.successIcon}>✉️</Text>
              <Text style={[typography.bodyBold, styles.successText]}>
                Đã gửi email khôi phục! Vui lòng kiểm tra hộp thư của bạn.
              </Text>
              <Button
                title="Quay lại Đăng nhập"
                onPress={() => navigation.navigate('Login')}
                style={styles.backBtn}
              />
            </View>
          ) : (
            <>
              <Input
                label="Email"
                placeholder="example@fitsense.app"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setError(undefined);
                }}
                error={error}
              />

              <Button
                title="Gửi liên kết khôi phục"
                onPress={handleReset}
                loading={loading}
                style={styles.submitBtn}
              />
            </>
          )}
        </Card>

        <TouchableOpacity
          style={styles.backLink}
          onPress={() => navigation.goBack()}
        >
          <Text style={[typography.bodyBold, styles.backLinkText]}>
            ← Quay lại
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  card: {
    padding: spacing.lg,
  },
  cardTitle: {
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  instructions: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  submitBtn: {
    marginTop: spacing.md,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  successIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  successText: {
    color: colors.success,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  backBtn: {
    width: '100%',
  },
  backLink: {
    alignSelf: 'center',
    marginTop: spacing.xl,
  },
  backLinkText: {
    color: colors.primary,
  },
});
