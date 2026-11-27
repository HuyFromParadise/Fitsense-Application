import { BellRing, ChevronLeft } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { Button, Card, Loading } from '../../../components/common';
import { Notification } from '../../../services/native';
import { notificationApi, NotificationSettings } from '../notificationApi';

type NotificationPermissionState = 'GRANTED' | 'DENIED' | 'PERMANENTLY_DENIED';

async function requestPostNotificationsPermission(): Promise<NotificationPermissionState> {
  const ready = await Notification.ensureReady();
  if (ready === 'GRANTED') {
    return 'GRANTED';
  }
  if (
    Platform.OS === 'android' &&
    Number(Platform.Version) >= 33 &&
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
  ) {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    if (result === PermissionsAndroid.RESULTS.GRANTED) {
      await Notification.ensureReady();
      return 'GRANTED';
    }
    if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      return 'PERMANENTLY_DENIED';
    }
    return 'DENIED';
  }
  return 'DENIED';
}

interface NotificationSettingsScreenProps {
  onBack?: () => void;
}

interface LocalReminderSettings {
  enabled: boolean;
  startHour: number;
  endHour: number;
}

export function NotificationSettingsScreen({ onBack }: NotificationSettingsScreenProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermissionState>('GRANTED');
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
  const [stepGoalHint, setStepGoalHint] = useState<number>(8000);
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
      setPermissionState(status === 'GRANTED' ? 'GRANTED' : 'DENIED');
      const config = await Notification.getDailyReminderConfig?.();
      if (config) {
        setLocalSettings({
          enabled: config.enabled,
          startHour: config.startHour,
          endHour: config.endHour,
        });
        setStepGoalHint(config.stepGoal || 8000);
      }
    } catch {
      // Ignore
    } finally {
      setLocalLoading(false);
    }
  };

  const handleRequestPermission = useCallback(async () => {
    const next = await requestPostNotificationsPermission();
    setPermissionState(next);
    return next;
  }, []);

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
        const status = await handleRequestPermission();
        if (status !== 'GRANTED') {
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
      const status = await handleRequestPermission();
      if (status !== 'GRANTED') {
        return;
      }
      await notificationApi.registerDevice();
      const res = await notificationApi.sendTestNotification();
      const count = res?.dispatchedCount ?? 0;
      Alert.alert(
        'Thành công',
        res?.message || `Đã gửi thông báo thử nghiệm tới ${count} thiết bị của bạn!`,
      );
    } catch (err: any) {
      Alert.alert('Lỗi', 'Không thể gửi thông báo thử nghiệm: ' + (err.message || 'Lỗi kết nối'));
    } finally {
      setTesting(false);
    }
  };

  const handleTestLocalNotification = async () => {
    try {
      const status = await handleRequestPermission();
      if (status !== 'GRANTED') {
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
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quay lại trang cá nhân"
          onPress={onBack}
          style={({ pressed }) => [
            styles.backButton,
            { marginBottom: spacing.sm, opacity: pressed ? 0.7 : 1, gap: spacing.xs },
          ]}
        >
          <ChevronLeft size={18} color={colors.primary} strokeWidth={2.2} />
          <Text style={[styles.backText, { color: colors.primary }]}>Quay lại trang cá nhân</Text>
        </Pressable>
      ) : null}

      <Text style={[styles.headerTitle, { color: colors.text, ...typography.title }]}>
        Cài đặt thông báo
      </Text>
      <Text style={[styles.headerSubtitle, { color: colors.textMuted, marginBottom: spacing.md, ...typography.body }]}>
        Tùy chỉnh thông báo đẩy (FCM) và nhắc nhở cục bộ (WorkManager) hoạt động thể chất.
      </Text>

      {permissionState !== 'GRANTED' ? (
        <Card style={[styles.card, { marginBottom: spacing.md, gap: spacing.sm }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: radius.md,
                backgroundColor: colors.primaryMuted,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <BellRing size={20} color={colors.primary} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.label, { color: colors.text }]}>
                Chưa cấp quyền thông báo
              </Text>
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                Bật quyền POST_NOTIFICATIONS để nhận nhắc nhở tập luyện và báo cáo tuần.
              </Text>
            </View>
          </View>
          <Button
            title={permissionState === 'PERMANENTLY_DENIED' ? 'Mở Cài đặt thiết bị' : 'Cấp quyền thông báo'}
            variant="primary"
            onPress={() => {
              if (permissionState === 'PERMANENTLY_DENIED') {
                Linking.openSettings().catch(() => {});
              } else {
                handleRequestPermission().catch(() => {});
              }
            }}
          />
        </Card>
      ) : null}

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
            thumbColor={colors.onPrimary}
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
            thumbColor={colors.onPrimary}
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
            thumbColor={colors.onPrimary}
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
              Nhắc đạt mục tiêu bước chân ({stepGoalHint.toLocaleString()} bước) và nhắc ít vận động (60-90 phút không có bước mới).
            </Text>
          </View>
          <Switch
            value={localSettings.enabled}
            onValueChange={handleLocalToggle}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.onPrimary}
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
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Giảm giờ bắt đầu"
                    onPress={() => adjustStartHour(-1)}
                    style={[
                      styles.timeAdjustButton,
                      { borderColor: colors.border, backgroundColor: colors.surfaceAlt },
                    ]}
                    disabled={localSettings.startHour <= 0}
                  >
                    <Text style={[styles.timeAdjustText, { color: colors.text, ...typography.body }]}>−</Text>
                  </Pressable>
                  <Text style={[styles.timeText, { color: colors.text, ...typography.body }]}>
                    {String(localSettings.startHour).padStart(2, '0')}:00
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Tăng giờ bắt đầu"
                    onPress={() => adjustStartHour(1)}
                    style={[
                      styles.timeAdjustButton,
                      { borderColor: colors.border, backgroundColor: colors.surfaceAlt },
                    ]}
                    disabled={localSettings.startHour >= localSettings.endHour - 1}
                  >
                    <Text style={[styles.timeAdjustText, { color: colors.text, ...typography.body }]}>+</Text>
                  </Pressable>
                </View>
              </View>
              <View style={styles.timeItem}>
                <Text style={[styles.timeLabel, { color: colors.textMuted, ...typography.caption }]}>
                  Kết thúc
                </Text>
                <View style={styles.timeControl}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Giảm giờ kết thúc"
                    onPress={() => adjustEndHour(-1)}
                    style={[
                      styles.timeAdjustButton,
                      { borderColor: colors.border, backgroundColor: colors.surfaceAlt },
                    ]}
                    disabled={localSettings.endHour <= localSettings.startHour + 1}
                  >
                    <Text style={[styles.timeAdjustText, { color: colors.text, ...typography.body }]}>−</Text>
                  </Pressable>
                  <Text style={[styles.timeText, { color: colors.text, ...typography.body }]}>
                    {String(localSettings.endHour).padStart(2, '0')}:00
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Tăng giờ kết thúc"
                    onPress={() => adjustEndHour(1)}
                    style={[
                      styles.timeAdjustButton,
                      { borderColor: colors.border, backgroundColor: colors.surfaceAlt },
                    ]}
                    disabled={localSettings.endHour >= 23}
                  >
                    <Text style={[styles.timeAdjustText, { color: colors.text, ...typography.body }]}>+</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            <Text style={[styles.hint, { color: colors.textMuted, ...typography.caption }]}>
              Nhắc đạt bước: vào cuối khung giờ nếu chưa đủ {stepGoalHint.toLocaleString()} bước. Nhắc ít vận động: sau 60-90 phút không có bước mới.
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
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  buttonRow: {
    flexDirection: 'row',
  },
  testButton: {
    flex: 1,
    marginHorizontal: 4,
  },
});