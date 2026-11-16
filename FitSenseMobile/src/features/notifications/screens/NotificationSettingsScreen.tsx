import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { Card, Button, Loading } from '../../../components/common';
import { notificationApi, NotificationSettings } from '../notificationApi';

interface NotificationSettingsScreenProps {
  onBack?: () => void;
}

export function NotificationSettingsScreen({ onBack }: NotificationSettingsScreenProps) {
  const { colors, spacing, radius, typography } = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    weeklyReportEnabled: true,
    workoutRemindersEnabled: true,
    goalAchievementsEnabled: true,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await notificationApi.getSettings();
      setSettings(data);
    } catch {
      // Use defaults if backend offline
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key: keyof NotificationSettings, value: boolean) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    try {
      setSaving(true);
      await notificationApi.updateSettings(updated);
    } catch (err: any) {
      Alert.alert('Lỗi', 'Không thể lưu cài đặt thông báo: ' + (err.message || 'Lỗi mạng'));
      // Rollback on error
      setSettings(settings);
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestNotification = async () => {
    try {
      setTesting(true);
      // Register device first to ensure backend has device mapping
      await notificationApi.registerDevice();
      const res = await notificationApi.sendTestNotification();
      Alert.alert('Thành công', res.message || 'Đã gửi thông báo thử nghiệm đến thiết bị của bạn!');
    } catch (err: any) {
      Alert.alert('Lỗi', 'Không thể gửi thông báo thử nghiệm: ' + (err.message || 'Lỗi kết nối'));
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <Loading message="Đang tải cài đặt thông báo..." />;
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { padding: spacing.md }]}
    >
      {onBack && (
        <TouchableOpacity
          onPress={onBack}
          style={[styles.backButton, { marginBottom: spacing.sm }]}
        >
          <Text style={[styles.backText, { color: colors.primary }]}>← Quay lại trang cá nhân</Text>
        </TouchableOpacity>
      )}

      <Text style={[styles.headerTitle, { color: colors.text, ...typography.title }]}>
        Cài đặt thông báo
      </Text>
      <Text style={[styles.headerSubtitle, { color: colors.textMuted, marginBottom: spacing.md, ...typography.body }]}>
        Tùy chỉnh thông báo đẩy và lời nhắc hoạt động thể chất của bạn.
      </Text>

      <Card style={[styles.card, { marginBottom: spacing.md }]}>
        <View style={styles.settingRow}>
          <View style={styles.settingTextContainer}>
            <Text style={[styles.settingTitle, { color: colors.text, ...typography.heading }]}>
              Báo cáo tiến độ tuần
            </Text>
            <Text style={[styles.settingDesc, { color: colors.textMuted, ...typography.caption }]}>
              Nhận thông báo tổng kết số bước chân và quãng đường vào lúc 08:00 sáng Chủ Nhật.
            </Text>
          </View>
          <Switch
            value={settings.weeklyReportEnabled}
            onValueChange={v => handleToggle('weeklyReportEnabled', v)}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#fff"
            disabled={saving}
          />
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.settingRow}>
          <View style={styles.settingTextContainer}>
            <Text style={[styles.settingTitle, { color: colors.text, ...typography.heading }]}>
              Chúc mừng đạt mục tiêu
            </Text>
            <Text style={[styles.settingDesc, { color: colors.textMuted, ...typography.caption }]}>
              Nhận thông báo động viên ngay khi bạn hoàn thành mục tiêu tập luyện trong ngày.
            </Text>
          </View>
          <Switch
            value={settings.goalAchievementsEnabled}
            onValueChange={v => handleToggle('goalAchievementsEnabled', v)}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#fff"
            disabled={saving}
          />
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.settingRow}>
          <View style={styles.settingTextContainer}>
            <Text style={[styles.settingTitle, { color: colors.text, ...typography.heading }]}>
              Nhắc nhở tập luyện
            </Text>
            <Text style={[styles.settingDesc, { color: colors.textMuted, ...typography.caption }]}>
              Nhắc bạn vận động khi chưa đạt chỉ tiêu hoạt động trong ngày.
            </Text>
          </View>
          <Switch
            value={settings.workoutRemindersEnabled}
            onValueChange={v => handleToggle('workoutRemindersEnabled', v)}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#fff"
            disabled={saving}
          />
        </View>
      </Card>

      <Card style={[styles.card, { marginBottom: spacing.md }]}>
        <Text style={[styles.settingTitle, { color: colors.text, marginBottom: spacing.xs, ...typography.heading }]}>
          Kiểm tra kết nối thông báo
        </Text>
        <Text style={[styles.settingDesc, { color: colors.textMuted, marginBottom: spacing.md, ...typography.caption }]}>
          Gửi một thông báo đẩy thử nghiệm từ server về thiết bị để kiểm tra FCM token và quyền thông báo.
        </Text>
        <Button
          title={testing ? 'Đang gửi...' : 'Gửi thông báo thử nghiệm'}
          variant="secondary"
          loading={testing}
          onPress={handleSendTestNotification}
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
  backButton: {
    paddingVertical: 4,
  },
  backText: {
    fontSize: 15,
    fontWeight: '600',
  },
  headerTitle: {
    marginBottom: 4,
  },
  headerSubtitle: {
    lineHeight: 20,
  },
  card: {
    padding: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  settingTextContainer: {
    flex: 1,
    paddingRight: 16,
  },
  settingTitle: {
    marginBottom: 2,
  },
  settingDesc: {
    lineHeight: 18,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
});
