import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';

import { useTheme } from '../../../app/providers/ThemeProvider';
import { Button, Card } from '../../../components/common';
import type { MotionLabel } from '../../../types/native-interface';
import { useStepCounter } from '../../steps-dashboard/useStepCounter';
import { useMotionSensor } from '../useMotionSensor';

const LABEL_TEXT: Record<MotionLabel, string> = {
  STILL: 'Đứng yên',
  WALKING: 'Đi bộ',
  RUNNING: 'Chạy',
  UNKNOWN: 'Đang phân tích',
};

const CHART_HEIGHT = 96;

/** Sparkline tự vẽ bằng react-native-svg: gifted-charts cần linear-gradient chưa cài. */
function Sparkline({ values, width, color }: { values: number[]; width: number; color: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const range = Math.max(Math.max(...values) - min, 0.1);
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = CHART_HEIGHT - ((value - min) / range) * CHART_HEIGHT;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <Svg width={width} height={CHART_HEIGHT}>
      <Polyline points={points} fill="none" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  const { colors, typography } = useTheme();
  return (
    <View style={styles.metric}>
      <Text style={[typography.heading, { color: colors.text }]}>{value}</Text>
      <Text style={[typography.caption, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

export function SensorMonitorScreen() {
  const { colors, spacing, typography } = useTheme();
  const { width } = useWindowDimensions();
  const { samples, label, confidence, status, isListening, gyroAvailable } = useMotionSensor('both');
  const { snapshot: stepSnapshot } = useStepCounter();

  const last = samples[samples.length - 1];
  const labelColor =
    label === 'RUNNING' ? colors.success : label === 'WALKING' ? colors.primary : colors.textMuted;

  return (
    <ScrollView
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
      style={{ backgroundColor: colors.background }}>
      <View style={styles.header}>
        <Text style={[typography.heading, { color: colors.text }]}>Sensor Monitor</Text>
        <View style={[styles.chip, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <Text style={[typography.caption, { color: isListening ? colors.success : colors.textMuted }]}>
            {isListening ? 'Đang đọc cảm biến' : 'Chưa đọc'}
          </Text>
        </View>
      </View>

      {status === 'UNAVAILABLE' ? (
        <Card style={{ gap: spacing.sm }}>
          <Text style={[typography.label, { color: colors.text }]}>Không có cảm biến</Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            Thiết bị không có accelerometer hoặc gyroscope nên màn hình này không đọc được dữ liệu.
            Các tính năng khác vẫn hoạt động bình thường.
          </Text>
        </Card>
      ) : status === 'PERMISSION_DENIED' ? (
        <Card style={{ gap: spacing.sm }}>
          <Text style={[typography.label, { color: colors.text }]}>Cần quyền đọc cảm biến</Text>
          <Button
            title="Mở cài đặt"
            variant="secondary"
            onPress={() => {
              Linking.openSettings().catch(() => {});
            }}
          />
        </Card>
      ) : (
        <>
          <Card style={styles.labelCard}>
            <Text style={[typography.caption, { color: colors.textMuted }]}>Trạng thái chuyển động</Text>
            <Text style={[typography.title, { color: labelColor }]}>{LABEL_TEXT[label]}</Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              Độ tin cậy {Math.round(confidence * 100)}%
            </Text>
            {!gyroAvailable ? (
              <Text style={[typography.caption, { color: colors.warning }]}>
                Thiết bị không có gyroscope — chỉ đang đọc accelerometer.
              </Text>
            ) : null}
          </Card>

          <Card style={{ gap: spacing.sm }}>
            <Text style={[typography.label, { color: colors.text }]}>Gia tốc hiện tại</Text>
            <View style={styles.metricRow}>
              <Metric label="X" value={last ? last.x.toFixed(2) : '—'} />
              <Metric label="Y" value={last ? last.y.toFixed(2) : '—'} />
              <Metric label="Z" value={last ? last.z.toFixed(2) : '—'} />
              <Metric label="|a|" value={last ? last.magnitude.toFixed(2) : '—'} />
            </View>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              Đơn vị m/s² · {samples.length} mẫu trong buffer
            </Text>
          </Card>

          <Card style={{ gap: spacing.sm }}>
            <Text style={[typography.label, { color: colors.text }]}>Độ lớn gia tốc (2 giây gần nhất)</Text>
            {samples.length > 1 ? (
              <Sparkline
                values={samples.map(sample => sample.magnitude)}
                width={Math.max(160, width - spacing.lg * 4)}
                color={colors.primary}
              />
            ) : (
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                Đang chờ mẫu cảm biến đầu tiên…
              </Text>
            )}
          </Card>

          <Card style={{ gap: spacing.sm }}>
            <Text style={[typography.label, { color: colors.text }]}>Bước chân hôm nay</Text>
            <Text style={[typography.title, { color: colors.text }]}>
              {(stepSnapshot?.stepsToday ?? 0).toLocaleString()} bước
            </Text>
          </Card>

          <Text style={[typography.caption, { color: colors.textMuted }]}>
            Phân loại chuyển động là ước tính từ ngưỡng độ lệch chuẩn, chỉ dùng để kiểm tra cảm biến.
          </Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  labelCard: {
    alignItems: 'center',
    gap: 4,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metric: {
    alignItems: 'center',
    flex: 1,
  },
});
