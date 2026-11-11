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

interface RegisterScreenProps {
  navigation: any;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!displayName.trim()) {
      errs.displayName = 'Vui lòng nhập họ và tên';
    }
    if (!email.trim()) {
      errs.email = 'Vui lòng nhập email';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errs.email = 'Email không hợp lệ';
    }
    if (!password) {
      errs.password = 'Vui lòng nhập mật khẩu';
    } else if (password.length < 6) {
      errs.password = 'Mật khẩu phải từ 6 ký tự';
    }
    if (confirmPassword !== password) {
      errs.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const userCredential = await auth().createUserWithEmailAndPassword(
        email.trim(),
        password
      );
      if (userCredential.user && displayName.trim()) {
        await userCredential.user.updateProfile({
          displayName: displayName.trim(),
        });
      }
    } catch (err: any) {
      let message = 'Đăng ký thất bại. Vui lòng thử lại.';
      if (err.code === 'auth/email-already-in-use') {
        message = 'Email này đã được sử dụng.';
      } else if (err.code === 'auth/invalid-email') {
        message = 'Địa chỉ email không hợp lệ.';
      } else if (err.code === 'auth/weak-password') {
        message = 'Mật khẩu quá yếu.';
      }
      Alert.alert('Lỗi đăng ký', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardView}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={styles.card}>
          <Text style={[typography.h2, styles.cardTitle]}>Tạo tài khoản mới</Text>

          <Input
            label="Họ và tên"
            placeholder="Nguyễn Văn A"
            value={displayName}
            onChangeText={(text) => {
              setDisplayName(text);
              if (errors.displayName) {
                setErrors((prev) => ({ ...prev, displayName: undefined }));
              }
            }}
            error={errors.displayName}
          />

          <Input
            label="Email"
            placeholder="example@fitsense.app"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errors.email) {
                setErrors((prev) => ({ ...prev, email: undefined }));
              }
            }}
            error={errors.email}
          />

          <Input
            label="Mật khẩu"
            placeholder="Tối thiểu 6 ký tự"
            isPassword
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (errors.password) {
                setErrors((prev) => ({ ...prev, password: undefined }));
              }
            }}
            error={errors.password}
          />

          <Input
            label="Xác nhận mật khẩu"
            placeholder="Nhập lại mật khẩu"
            isPassword
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              if (errors.confirmPassword) {
                setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
              }
            }}
            error={errors.confirmPassword}
          />

          <Button
            title="Đăng ký"
            onPress={handleRegister}
            loading={loading}
            style={styles.submitBtn}
          />
        </Card>

        <View style={styles.footer}>
          <Text style={[typography.body, styles.footerText]}>
            Đã có tài khoản?{' '}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={[typography.bodyBold, styles.loginLink]}>
              Đăng nhập
            </Text>
          </TouchableOpacity>
        </View>
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
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  submitBtn: {
    marginTop: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  footerText: {
    color: colors.textSecondary,
  },
  loginLink: {
    color: colors.primary,
  },
});
