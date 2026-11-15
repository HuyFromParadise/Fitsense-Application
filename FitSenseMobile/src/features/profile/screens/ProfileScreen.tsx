import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { Button, Input, Card, Loading } from '../../../components/common';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useProfile } from '../useProfile';

export function ProfileScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const signOut = useAuthStore(state => state.signOut);
  const { profile, loading: profileLoading, refresh, updateProfile, deleteAccount } = useProfile();

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
    if (!bmi) return { label: 'Chưa có dữ liệu', color: colors.textMuted };
    if (bmi < 18.5) return { label: 'Thiếu cân', color: colors.warning };
    if (bmi < 24.9) return { label: 'Bình thường (Lý tưởng)', color: colors.success };
    if (bmi < 29.9) return { label: 'Thừa cân', color: colors.warning };
    return { label: 'Béo phì', color: colors.danger };
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
      await updateProfile({
        displayName: displayName.trim(),
        heightCm: heightCm ? h : undefined,
        weightKg: weightKg ? w : undefined,
        gender,
        fitnessLevel,
      });
      await refresh();
      Alert.alert('Thành công', 'Đã lưu thông tin hồ sơ của bạn.');
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể lưu hồ sơ.');
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
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteAccount();
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
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={[styles.content, { padding: spacing.md }]}>
      {/* Avatar & Header */}
      <View style={[styles.header, { marginVertical: spacing.lg }]}>
        <View style={[styles.avatarBadge, { backgroundColor: colors.primary }]}>
          <Text style={[styles.avatarText, { color: colors.onPrimary }]}>
            {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
          </Text>
        </View>
        <Text style={[typography.heading, { color: colors.text }]}>
          {displayName || 'Người dùng FitSense'}
        </Text>
        <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
          {profile?.email || '—'}
        </Text>
      </View>

      {/* Real-time BMI Card */}
      <Card style={[styles.bmiCard, { marginBottom: spacing.md }]}>
        <View style={styles.bmiRow}>
          <View>
            <Text style={[typography.caption, { color: colors.textMuted }]}>Chỉ số khối cơ thể (BMI)</Text>
            <Text style={[typography.title, { color: colors.text, marginVertical: spacing.xs }]}>
              {currentBmi !== null ? currentBmi : '--'}
            </Text>
          </View>
          <View style={styles.bmiCategoryContainer}>
            <Text style={[typography.label, { color: bmiInfo.color }]}>
              {bmiInfo.label}
            </Text>
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
              {currentBmi ? (currentBmi < 18.5 ? '< 18.5' : currentBmi <= 24.9 ? '18.5 - 24.9' : currentBmi <= 29.9 ? '25.0 - 29.9' : '>= 30.0') : 'Cần nhập chiều cao & cân nặng'}
            </Text>
          </View>
        </View>
      </Card>

      {/* Edit Form */}
      <Card style={[styles.formCard, { marginBottom: spacing.md, gap: spacing.sm }]}>
        <Text style={[typography.heading, { color: colors.text, marginBottom: spacing.xs }]}>
          Thông tin thể chất
        </Text>

        <Input
          label="Họ và tên"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Nhập họ và tên"
        />

        <View style={[styles.twoCol, { gap: spacing.md }]}>
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
        <Text style={[typography.label, { color: colors.textMuted, marginTop: spacing.xs }]}>Giới tính</Text>
        <View style={[styles.pillRow, { gap: spacing.sm }]}>
          {(['male', 'female', 'other'] as const).map((g) => (
            <TouchableOpacity
              key={g}
              style={[
                styles.pill,
                {
                  borderRadius: radius.md,
                  borderColor: gender === g ? colors.primary : colors.border,
                  backgroundColor: gender === g ? colors.surfaceAlt : colors.surface,
                },
              ]}
              onPress={() => setGender(g)}
            >
              <Text
                style={[
                  typography.caption,
                  { color: gender === g ? colors.primary : colors.text },
                ]}
              >
                {g === 'male' ? 'Nam' : g === 'female' ? 'Nữ' : 'Khác'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Fitness Level */}
        <Text style={[typography.label, { color: colors.textMuted, marginTop: spacing.xs }]}>Mức độ vận động</Text>
        <View style={[styles.pillRow, { gap: spacing.sm }]}>
          {(['beginner', 'intermediate', 'advanced'] as const).map((lvl) => (
            <TouchableOpacity
              key={lvl}
              style={[
                styles.pill,
                {
                  borderRadius: radius.md,
                  borderColor: fitnessLevel === lvl ? colors.primary : colors.border,
                  backgroundColor: fitnessLevel === lvl ? colors.surfaceAlt : colors.surface,
                },
              ]}
              onPress={() => setFitnessLevel(lvl)}
            >
              <Text
                style={[
                  typography.caption,
                  { color: fitnessLevel === lvl ? colors.primary : colors.text },
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
          style={{ marginTop: spacing.sm }}
        />
      </Card>

      {/* Account Actions */}
      <Card style={{ gap: spacing.sm }}>
        <Button
          title="Đăng xuất"
          variant="secondary"
          onPress={signOut}
        />

        <Button
          title="Xóa tài khoản vĩnh viễn"
          variant="danger"
          loading={deleting}
          onPress={handleDeleteAccount}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
  },
  avatarBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
  },
  bmiCard: {},
  bmiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bmiCategoryContainer: {
    alignItems: 'flex-end',
  },
  formCard: {},
  twoCol: {
    flexDirection: 'row',
  },
  col: {
    flex: 1,
  },
  pillRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  pill: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
});