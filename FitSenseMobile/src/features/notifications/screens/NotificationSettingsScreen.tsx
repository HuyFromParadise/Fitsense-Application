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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { Card, Button, Loading } from '../../../components/common';
import { notificationApi, NotificationSettings } from '../notificationApi';
import { Notification } from '../../../services/native';

interface NotificationSettingsScreenProps {
  onBack?: () => void;
}

interface LocalReminderSettings {
  enabled: boolean;
  startHour: number;
  endHour: number;
}

export function NotificationSettingsScreen({ onBack }: NotificationSettingsScreenProps) {
  const { colors, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    weeklyReportEnabled: true,
    workoutRemindersEnabled: true,
    goalAchievementsEnabled: true,
  });

  // Local reminder settings (WorkManager-based)
  const [localSettings, setLocalSettings] = useState<LocalReminderSettings>({
    enabled: false,
    startHour: 8,
    endHour: 21,
  });
  const [localLoading, setLocalLoading] = useState(true);

  useEffect(() => {
    loadSettings();
    loadLocalSettings();
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

  const loadLocalSettings = async () => {
    try {
      setLocalLoading(true);
      const status = await Notification.ensureReady();
      if (status === 'GRANTED') {
        // If permission granted, assume reminders might be scheduled
        // We can't easily query WorkManager state, so default to false
        setLocalSettings(prev => ({ ...prev, enabled: false }));
      }
    } catch {
      // Ignore
    } finally {
      setLocalLoading(false);
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
      setSettings(settings);
    } finally {
      setSaving(false);
    }
  };

  const handleLocalToggle = async (enabled: boolean) => {
    setLocalSettings(prev => ({ ...prev, enabled }));
    try {
      if (enabled) {
        const status = await Notification.ensureReady();
        if (status !== 'GRANTED') {
          Alert.alert(
            'Quyền thông báo',
            'Ứng dụng cần quyền gửi thông báo để hoạt động nhắc nhở. Vui lòng bật trong Cài đặt thiết bị.',
          );
          setLocalSettings(prev => ({ ...prev, enabled: false }));
          return;
        }
        await Notification.scheduleDailyReminders(localSettings.startHour, localSettings.endHour);
      } else {
        await Notification.cancelDailyReminders();
      }
    } catch (err: any) {
      Alert.alert('Lỗi', 'Không thể cập nhật nhắc nhở cục bộ: ' + (err.message || 'Lỗi không xác định'));
      setLocalSettings(prev => ({ ...prev, enabled: !enabled }));
    }
  };

  const adjustStartHour = (delta: number) => {
    const newHour = Math.max(0, Math.min(23, localSettings.startHour + delta));
    if (newHour >= localSettings.endHour) {
      Alert.alert('Lỗi', 'Giờ bắt đầu phải nhỏ hơn giờ kết thúc');
      return;
    }
    setLocalSettings(prev => ({ ...prev, startHour: newHour }));
    if (localSettings.enabled) {
      Notification.scheduleDailyReminders(newHour, localSettings.endHour);
    }
  };

  const adjustEndHour = (delta: number) => {
    const newHour = Math.max(0, Math.min(23, localSettings.endHour + delta));
    if (newHour <= localSettings.startHour) {
      Alert.alert('Lỗi', 'Giờ kết thúc phải lớn hơn giờ bắt đầu');
      return;
    }
    setLocalSettings(prev => ({ ...prev, endHour: newHour }));
    if (localSettings.enabled) {
      Notification.scheduleDailyReminders(localSettings.startHour, newHour);
    }
  };

  const handleSendTestNotification = async () => {
    try {
      setTesting(true);
      await notificationApi.registerDevice();
      const res = await notificationApi.sendTestNotification();
      Alert.alert('Thành công', res.message || 'Đã gửi thông báo thử nghiệm đến thiết bị của bạn!');
    } catch (err: any) {
      Alert.alert('Lỗi', 'Không thể gửi thông báo thử nghiệm: ' + (err.message || 'Lỗi kết nối'));
    } finally {
      setTesting(false);
    }
  };

  const handleTestLocalNotification = async () => {
    try {
      const status = await Notification.ensureReady();
      if (status !== 'GRANTED') {
        Alert.alert('Quyền thông báo', 'Cần quyền POST_NOTIFICATIONS để hiển thị thông báo thử nghiệm.');
        return;
      }
      await Notification.show({
        id: 9999,
        title: 'Thông báo thử nghiệm (cục bộ)',
        body: 'Đây là thông báo nhắc nhở cục bộ từ WorkManager.',
        channelId: 'fitsense_activity',
      });
      Alert.alert('Thành công', 'Đã gửi thông báo cục bộ thử nghiệm!');
    } catch (err: any) {
      Alert.alert('Lỗi', 'Không thể gửi thông báo cục bộ: ' + (err.message || ''));
    }
  };

  if (loading || localLoading) {
    return <Loading message="Đang tải cài đặt thông báo..." />;
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { padding: spacing.md, paddingTop: insets.top + spacing.md }]}
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
        Tùy chỉnh thông báo đẩy (FCM) và nhắc nhở cục bộ (WorkManager) hoạt động thể chất.
      </Text>

      {/* === FCM Notifications (Server) === */}
      <Card style={[styles.card, { marginBottom: spacing.md }]}>
        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: spacing.sm, ...typography.heading }]}>
          Thông báo từ Server (FCM)
        </Text>

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
              Nhắc bạn vận động khi chưa đạt chỉ tiêu hoạt động trong ngày (qua FCM).
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

      {/* === Local Notifications (WorkManager) === */}
      <Card style={[styles.card, { marginBottom: spacing.md }]}>
        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: spacing.sm, ...typography.heading }]}>
          Nhắc nhở cục bộ (Không cần internet)
        </Text>
        <Text style={[styles.sectionDesc, { color: colors.textMuted, marginBottom: spacing.md, ...typography.caption }]}>
          Sử dụng WorkManager để nhắc nhở ngay trên thiết bị. Hoạt động cả khi offline và sau khi khởi động lại máy.
        </Text>

        <View style={styles.settingRow}>
          <View style={styles.settingTextContainer}>
            <Text style={[styles.settingTitle, { color: colors.text, ...typography.heading }]}>
              Bật nhắc nhở cục bộ
            </Text>
            <Text style={[styles.settingDesc, { color: colors.textMuted, ...typography.caption }]}>
              Nhắc đạt mục tiêu bước chân (8000 bước) và nhắc ít vận động (60-90 phút không có bước mới).
            </Text>
          </View>
          <Switch
            value={localSettings.enabled}
            onValueChange={handleLocalToggle}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#fff"
            disabled={saving}
          />
        </View>

        {localSettings.enabled && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.timeRow}>
              <View style={styles.timeItem}>
                <Text style={[styles.timeLabel, { color: colors.textMuted, ...typography.caption }]}>
                  Bắt đầu
                </Text>
                <View style={styles.timeControl}>
                  <TouchableOpacity
                    onPress={() => adjustStartHour(-1)}
                    style={styles.timeAdjustButton}
                    disabled={localSettings.startHour <= 0}
                  >
                    <Text style={[styles.timeAdjustText, { color: colors.text, ...typography.body }]}>−</Text>
                  </TouchableOpacity>
                  <Text style={[styles.timeText, { color: colors.text, ...typography.body }]}>
                    {String(localSettings.startHour).padStart(2, '0')}:00
                  </Text>
                  <TouchableOpacity
                    onPress={() => adjustStartHour(1)}
                    style={styles.timeAdjustButton}
                    disabled={localSettings.startHour >= localSettings.endHour - 1}
                  >
                    <Text style={[styles.timeAdjustText, { color: colors.text, ...typography.body }]}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.timeItem}>
                <Text style={[styles.timeLabel, { color: colors.textMuted, ...typography.caption }]}>
                  Kết thúc
                </Text>
                <View style={styles.timeControl}>
                  <TouchableOpacity
                    onPress={() => adjustEndHour(-1)}
                    style={styles.timeAdjustButton}
                    disabled={localSettings.endHour <= localSettings.startHour + 1}
                  >
                    <Text style={[styles.timeAdjustText, { color: colors.text, ...typography.body }]}>−</Text>
                  </TouchableOpacity>
                  <Text style={[styles.timeText, { color: colors.text, ...typography.body }]}>
                    {String(localSettings.endHour).padStart(2, '0')}:00
                  </Text>
                  <TouchableOpacity
                    onPress={() => adjustEndHour(1)}
                    style={styles.timeAdjustButton}
                    disabled={localSettings.endHour >= 23}
                  >
                    <Text style={[styles.timeAdjustText, { color: colors.text, ...typography.body }]}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <Text style={[styles.hint, { color: colors.textMuted, ...typography.caption }]}>
              Nhắc đạt bước: vào cuối khung giờ nếu chưa đủ 8000 bước. Nhắc ít vận động: sau 60-90 phút không có bước mới.
            </Text>
          </>
        )}
      </Card>

      {/* === Test Notifications === */}
      <Card style={[styles.card, { marginBottom: spacing.md }]}>
        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: spacing.sm, ...typography.heading }]}>
          Kiểm tra kết nối
        </Text>

        <Text style={[styles.settingDesc, { color: colors.textMuted, marginBottom: spacing.md, ...typography.caption }]}>
          Gửi thông báo thử nghiệm từ server (FCM) hoặc cục bộ (WorkManager).
        </Text>

        <View style={styles.buttonRow}>
          <Button
            title={testing ? 'Đang gửi...' : 'Thử FCM từ Server'}
            variant="secondary"
            loading={testing}
            onPress={handleSendTestNotification}
            style={styles.testButton}
          />
          <Button
            title="Thử cục bộ (WorkManager)"
            variant="ghost"
            loading={testing}
            onPress={handleTestLocalNotification}
            style={styles.testButton}
          />
        </View>
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
  sectionTitle: {
    marginBottom: 4,
  },
  sectionDesc: {
    lineHeight: 18,
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
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeItem: {
    flex: 1,
    marginHorizontal: 4,
  },
  timeLabel: {
    marginBottom: 4,
  },
  timeControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  timeAdjustButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeAdjustText: {
    fontSize: 20,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 18,
    fontWeight: '600',
    minWidth: 50,
    textAlign: 'center',
  },
  hint: {
    lineHeight: 18,
    marginTop: 4,
    color: '#888', // placeholder, overridden by component
  },
  buttonRow: {
    flexDirection: 'row',
  },
  testButton: {
    flex: 1,
    marginHorizontal: 4,
  },
});