import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { colors, spacing, typography } from '../../theme';
import { Button, Input, Card, Loading } from '../../components/common';
import { useAuthStore } from '../../stores/useAuthStore';
import { userApi } from '../../services/api/client';
import { useProfile } from './useProfile';

export const ProfileScreen: React.FC = () => {
  const { signOut } = useAuthStore();
  const { profile, loading: profileLoading, refresh } = useProfile();

  const [displayName, setDisplayName] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | 'prefer_not_to_say'>('male');
  const [fitnessLevel, setFitnessLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setHeightCm(profile.heightCm ? String(profile.heightCm) : '');
      setWeightKg(profile.weightKg ? String(profile.weightKg) : '');
      if (profile.gender) setGender(profile.gender as any);
      if (profile.fitnessLevel) setFitnessLevel(profile.fitnessLevel as any);
    }
  }, [profile]);

  // Compute BMI locally for instantaneous feedback
  const computeBmi = () => {
    const h = parseFloat(heightCm);
    const w = parseFloat(weightKg);
    if (!h || !w || h <= 0) return null;
    const hM = h / 100.0;
    const val = w / (hM * hM);
    return Math.round(val * 10) / 10;
  };

  const currentBmi = computeBmi();

  const getBmiCategory = (bmi: number | null) => {
    if (!bmi) return { label: 'Chưa có dữ liệu', color: colors.textSecondary };
    if (bmi < 18.5) return { label: 'Thiếu cân', color: colors.secondary };
    if (bmi < 24.9) return { label: 'Bình thường (Lý tưởng)', color: colors.primary };
    if (bmi < 29.9) return { label: 'Thừa cân', color: colors.warning };
    return { label: 'Béo phì', color: colors.error };
  };

  const handleSave = async () => {
    const h = parseFloat(heightCm);
    const w = parseFloat(weightKg);

    if (heightCm && (isNaN(h) || h < 50 || h > 260)) {
      Alert.alert('Lỗi', 'Chiều cao phải từ 50cm đến 260cm');
      return;
    }
    if (weightKg && (isNaN(w) || w < 20 || w > 400)) {
      Alert.alert('Lỗi', 'Cân nặng phải từ 20kg đến 400kg');
      return;
    }

    setSaving(true);
    try {
      await userApi.updateProfile({
        displayName: displayName.trim(),
        heightCm: heightCm ? h : undefined,
        weightKg: weightKg ? w : undefined,
        gender,
        fitnessLevel,
      });
      await refresh();
      Alert.alert('Thành công', 'Đã lưu thông tin hồ sơ của bạn.');
    } catch (err: any) {
      Alert.alert('Lỗi', err.response?.data?.error?.message || 'Không thể lưu hồ sơ.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Xác nhận xóa tài khoản',
      'Hành động này sẽ xóa vĩnh viễn dữ liệu tài khoản của bạn bao gồm lịch sử bài tập và mục tiêu. Bạn có chắc chắn muốn tiếp tục?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa vĩnh viễn',
          style: 'danger',
          onPress: async () => {
            setDeleting(true);
            try {
              await userApi.deleteAccount();
              await signOut();
            } catch (err: any) {
              Alert.alert('Lỗi', 'Không thể xóa tài khoản. Vui lòng thử lại sau.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (profileLoading && !profile) {
    return <Loading message="Đang tải thông tin hồ sơ..." />;
  }

  const bmiInfo = getBmiCategory(currentBmi);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar & Header */}
      <View style={styles.header}>
        <View style={styles.avatarBadge}>
          <Text style={styles.avatarText}>
            {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
          </Text>
        </View>
        <Text style={[typography.h2, styles.nameText]}>
          {displayName || 'Người dùng FitSense'}
        </Text>
        <Text style={[typography.body, styles.emailText]}>
          {profile?.email || ''}
        </Text>
      </View>

      {/* BMI Card */}
      <Card style={styles.bmiCard}>
        <View style={styles.bmiRow}>
          <View>
            <Text style={[typography.captionBold, styles.bmiTitle]}>CHỈ SỐ BMI HIỆN TẠI</Text>
            <Text style={[typography.h1, { color: bmiInfo.color }]}>
              {currentBmi ? currentBmi : '--.-'}
            </Text>
          </View>
          <View style={styles.bmiCategoryContainer}>
            <Text style={[typography.bodyBold, { color: bmiInfo.color }]}>
              {bmiInfo.label}
            </Text>
            <Text style={[typography.caption, styles.bmiHint]}>
              {currentBmi ? 'Dựa trên chiều cao & cân nặng' : 'Nhập chiều cao và cân nặng để tính'}
            </Text>
          </View>
        </View>
      </Card>

      {/* Form Card */}
      <Card style={styles.formCard}>
        <Text style={[typography.h3, styles.sectionTitle]}>Thông tin cá nhân</Text>

        <Input
          label="Họ và tên"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Nhập họ và tên"
        />

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Input
              label="Chiều cao (cm)"
              value={heightCm}
              onChangeText={setHeightCm}
              keyboardType="numeric"
              placeholder="175"
            />
          </View>
          <View style={styles.col}>
            <Input
              label="Cân nặng (kg)"
              value={weightKg}
              onChangeText={setWeightKg}
              keyboardType="numeric"
              placeholder="70"
            />
          </View>
        </View>

        {/* Gender Selection */}
        <Text style={[typography.captionBold, styles.label]}>Giới tính</Text>
        <View style={styles.pillRow}>
          {(['male', 'female', 'other'] as const).map((g) => (
            <TouchableOpacity
              key={g}
              style={[
                styles.pill,
                gender === g && styles.pillActive,
              ]}
              onPress={() => setGender(g)}
            >
              <Text
                style={[
                  typography.captionBold,
                  styles.pillText,
                  gender === g && styles.pillTextActive,
                ]}
              >
                {g === 'male' ? 'Nam' : g === 'female' ? 'Nữ' : 'Khác'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Fitness Level */}
        <Text style={[typography.captionBold, styles.label]}>Mức độ vận động</Text>
        <View style={styles.pillRow}>
          {(['beginner', 'intermediate', 'advanced'] as const).map((lvl) => (
            <TouchableOpacity
              key={lvl}
              style={[
                styles.pill,
                fitnessLevel === lvl && styles.pillActive,
              ]}
              onPress={() => setFitnessLevel(lvl)}
            >
              <Text
                style={[
                  typography.captionBold,
                  styles.pillText,
                  fitnessLevel === lvl && styles.pillTextActive,
                ]}
              >
                {lvl === 'beginner' ? 'Mới bắt đầu' : lvl === 'intermediate' ? 'Trung bình' : 'Nâng cao'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Button
          title="Lưu thay đổi"
          onPress={handleSave}
          loading={saving}
          style={styles.saveBtn}
        />
      </Card>

      {/* Account Actions */}
      <Card style={styles.actionCard}>
        <Button
          title="Đăng xuất"
          variant="outline"
          onPress={signOut}
          style={styles.logoutBtn}
        />

        <Button
          title="Xóa tài khoản vĩnh viễn"
          variant="danger"
          loading={deleting}
          onPress={handleDeleteAccount}
          style={styles.deleteBtn}
        />
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  avatarBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.white,
  },
  nameText: {
    color: colors.text,
  },
  emailText: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  bmiCard: {
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  bmiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bmiTitle: {
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  bmiCategoryContainer: {
    alignItems: 'flex-end',
  },
  bmiHint: {
    color: colors.textMuted,
    marginTop: 2,
  },
  formCard: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    marginBottom: spacing.md,
  },
  twoCol: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  col: {
    flex: 1,
  },
  label: {
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  pillRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  pill: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
  },
  pillActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '25',
  },
  pillText: {
    color: colors.textSecondary,
  },
  pillTextActive: {
    color: colors.primary,
  },
  saveBtn: {
    marginTop: spacing.sm,
  },
  actionCard: {
    gap: spacing.sm,
  },
  logoutBtn: {
    marginBottom: spacing.xs,
  },
  deleteBtn: {},
});
