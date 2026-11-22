import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { Button, Input, Card, Loading } from '../../../components/common';
import ThemeSwitch from '@/components/library/ThemeSwitch';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useThemeStore } from '../../../stores/useThemeStore';
import { useProfile } from '../useProfile';
import { NotificationSettingsScreen } from '../../notifications/screens/NotificationSettingsScreen';

export function ProfileScreen() {
  const { colors, spacing, radius, typography, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const signOut = useAuthStore(state => state.signOut);
  const setMode = useThemeStore(state => state.setMode);
  const { profile, loading: profileLoading, refresh, updateProfile, deleteAccount } = useProfile();

  const [showNotifications, setShowNotifications] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarError, setAvatarError] = useState(false);
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | 'prefer_not_to_say'>('male');
  const [fitnessLevel, setFitnessLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setBirthDate(profile.birthDate || '');
      setAvatarUrl(profile.avatarUrl || '');
      setAvatarError(false);
      setHeightCm(profile.heightCm ? String(profile.heightCm) : '');
      setWeightKg(profile.weightKg ? String(profile.weightKg) : '');
      if (profile.gender) setGender(profile.gender as any);
      if (profile.fitnessLevel) setFitnessLevel(profile.fitnessLevel as any);
    }
  }, [profile]);

  // Helper to normalize decimal input with comma or dot (e.g. "65,5" -> "65.5")
  const normalizeNumber = (str: string) => str.replace(',', '.').trim();

  // Compute BMI locally for instantaneous feedback
  const computeBmi = () => {
    const cleanH = normalizeNumber(heightCm);
    const cleanW = normalizeNumber(weightKg);
    const h = parseFloat(cleanH);
    const w = parseFloat(cleanW);
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
    const cleanH = normalizeNumber(heightCm);
    const cleanW = normalizeNumber(weightKg);
    const h = parseFloat(cleanH);
    const w = parseFloat(cleanW);

    if (cleanH && (isNaN(h) || h < 50 || h > 260)) {
      Alert.alert('Lỗi', 'Chiều cao phải từ 50cm đến 260cm');
      return;
    }
    if (cleanW && (isNaN(w) || w < 20 || w > 400)) {
      Alert.alert('Lỗi', 'Cân nặng phải từ 20kg đến 400kg');
      return;
    }

    const cleanBirthDate = birthDate.trim();
    if (cleanBirthDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanBirthDate) || isNaN(Date.parse(cleanBirthDate))) {
        Alert.alert('Lỗi', 'Ngày sinh phải đúng định dạng yyyy-MM-dd (ví dụ 2000-05-15)');
        return;
      }
      if (cleanBirthDate > new Date().toISOString().slice(0, 10)) {
        Alert.alert('Lỗi', 'Ngày sinh không được ở tương lai');
        return;
      }
    }

    const cleanAvatarUrl = avatarUrl.trim();
    if (cleanAvatarUrl && !/^https?:\/\/\S+$/i.test(cleanAvatarUrl)) {
      Alert.alert('Lỗi', 'URL ảnh đại diện phải bắt đầu bằng http:// hoặc https://');
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        displayName: displayName.trim(),
        birthDate: cleanBirthDate || undefined,
        heightCm: cleanH ? h : undefined,
        weightKg: cleanW ? w : undefined,
        gender,
        fitnessLevel,
        avatarUrl: cleanAvatarUrl || undefined,
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
            } catch {
              Alert.alert('Lỗi', 'Không thể xóa tài khoản. Vui lòng thử lại sau.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (showNotifications) {
    return <NotificationSettingsScreen onBack={() => setShowNotifications(false)} />;
  }

  if (profileLoading && !profile) {
    return <Loading message="Đang tải thông tin hồ sơ..." />;
  }

  const bmiInfo = getBmiCategory(currentBmi);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={[styles.content, { padding: spacing.md, paddingTop: insets.top + spacing.md }]}>
      {/* Avatar & Header */}
      <View style={[styles.header, { marginVertical: spacing.lg }]}>
        <View style={[styles.avatarBadge, { backgroundColor: colors.primary }]}>
          {avatarUrl.trim() && !avatarError ? (
            <Image
              source={{ uri: avatarUrl.trim() }}
              style={styles.avatarImage}
              onError={() => setAvatarError(true)}
            />
          ) : (
            <Text style={[styles.avatarText, { color: colors.onPrimary }]}>
              {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
            </Text>
          )}
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

        <Input
          label="Ngày sinh (yyyy-MM-dd)"
          value={birthDate}
          onChangeText={setBirthDate}
          placeholder="2000-05-15"
          autoCapitalize="none"
        />

        <Input
          label="URL ảnh đại diện (tùy chọn)"
          value={avatarUrl}
          onChangeText={(text) => {
            setAvatarUrl(text);
            setAvatarError(false);
          }}
          placeholder="https://example.com/avatar.jpg"
          autoCapitalize="none"
          keyboardType="url"
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

      {/* Theme Settings (Full-Screen Rain Animated Switch) */}
      <Card style={{ marginBottom: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1, marginRight: spacing.md }}>
          <Text style={[typography.label, { color: colors.text }]}>
            Giao diện {isDark ? 'Tối (Đen Cam)' : 'Sáng'}
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
            {isDark ? 'Chạm để đổi sang nền sáng (Hiệu ứng mưa rơi toàn màn hình)' : 'Chạm để đổi sang nền tối (Hiệu ứng mưa rơi toàn màn hình)'}
          </Text>
        </View>
        <ThemeSwitch
          theme={isDark ? 'dark' : 'light'}
          onThemeChange={(newTheme) => setMode(newTheme)}
        />
      </Card>

      {/* App Settings */}
      <Card style={{ marginBottom: spacing.md }}>
        <Button
          title="Cài đặt thông báo & Nhắc nhở"
          variant="secondary"
          onPress={() => setShowNotifications(true)}
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
    overflow: 'hidden',
  },
  avatarImage: {
    width: 72,
    height: 72,
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
