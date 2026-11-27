import { Activity, AlertTriangle, Radio } from 'lucide-react-native';
import React, { memo, useMemo } from 'react';
import { Linking, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';

import { useTheme } from '../../../app/providers/ThemeProvider';
import {
  Card,
  EmptyState,
  ErrorState,
  SkeletonLoader,
} from '../../../components/common';
import { tabularNums } from '../../../theme';
import type { MotionLabel } from '../../../types/native-interface';
import { useMotionSensor } from '../useMotionSensor';

const LABEL_TEXT: Record<MotionLabel, string> = {
  STILL: 'Đứng yên',
  WALKING: 'Đi bộ',
  RUNNING: 'Chạy',
  UNKNOWN: 'Đang phân tích',
};

const CHART_HEIGHT = 96;

const accelFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const Sparkline = memo(function Sparkline({
  values,
  width,
  color,
}: {
  values: number[];
  width: number;
  color: string;
}) {
  const points = useMemo(() => {
    if (values.length < 2) {
      return '';
    }
    const min = Math.min(...values);
    const range = Math.max(Math.max(...values) - min, 0.1);
    return values
      .map((value, index) => {
        const x = (index / (values.length - 1)) * width;
        const y = CHART_HEIGHT - ((value - min) / range) * CHART_HEIGHT;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [values, width]);

  if (values.length < 2) {
    return null;
  }

  return (
    <Svg width={width} height={CHART_HEIGHT}>
      <Polyline points={points} fill="none" stroke={color} strokeWidth={2} />
    </Svg>
  );
});

const AxisMetric = memo(function AxisMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const { colors, typography } = useTheme();
  return (
    <View style={styles.metric}>
      <Text style={[typography.heading, tabularNums, { color: colors.text }]}>
        {value}
      </Text>
      <Text style={[typography.caption, { color: colors.textMuted }]}>
        {label}
      </Text>
    </View>
  );
});

/**
 * Isolated leaf component consuming 10Hz motion sensor events so parent
 * SensorMonitorScreen stays idle at 60fps.
 */
export const MotionSensorTelemetry = memo(function MotionSensorTelemetry() {
  const { colors, radius, spacing, typography } = useTheme();
  const { width } = useWindowDimensions();
  const { samples, label, confidence, status, isListening, gyroAvailable } =
    useMotionSensor('both');

  const magnitudes = useMemo(
    () => samples.map(sample => sample.magnitude),
    [samples],
  );

  if (status === 'UNAVAILABLE') {
    return (
      <Card>
        <EmptyState
          title="Không có cảm biến"
          message="Thiết bị không có accelerometer hoặc gyroscope nên màn hình này không đọc được dữ liệu. Các tính năng khác vẫn hoạt động bình thường."
        />
      </Card>
    );
  }

  if (status === 'PERMISSION_DENIED') {
    return (
      <Card>
        <ErrorState
          message="Cần quyền đọc cảm biến để theo dõi accelerometer và gyroscope."
          onRetry={() => {
            Linking.openSettings().catch(() => {});
          }}
        />
      </Card>
    );
  }

  const last = samples[samples.length - 1];
  const isInitialLoading = !isListening && samples.length === 0;

  if (isInitialLoading) {
    return (
      <View style={{ gap: spacing.lg }}>
        <Card style={{ gap: spacing.sm, alignItems: 'center' }}>
          <SkeletonLoader width={120} height={14} />
          <SkeletonLoader width={160} height={28} />
          <SkeletonLoader width={100} height={14} />
        </Card>
        <Card style={{ gap: spacing.sm }}>
          <SkeletonLoader width={130} height={16} />
          <View style={[styles.metricRow, { gap: spacing.sm }]}>
            <SkeletonLoader width="22%" height={40} />
            <SkeletonLoader width="22%" height={40} />
            <SkeletonLoader width="22%" height={40} />
            <SkeletonLoader width="22%" height={40} />
          </View>
        </Card>
        <Card style={{ gap: spacing.sm }}>
          <SkeletonLoader width={180} height={16} />
          <SkeletonLoader width="100%" height={CHART_HEIGHT} />
        </Card>
      </View>
    );
  }

  const labelColor =
    label === 'RUNNING'
      ? colors.success
      : label === 'WALKING'
        ? colors.primary
        : colors.textMuted;

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={styles.statusRow}>
        <View
          style={[
            styles.chip,
            {
              backgroundColor: colors.surfaceAlt,
              borderColor: colors.border,
              borderRadius: radius.pill,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs,
              gap: spacing.xs,
            },
          ]}>
          {isListening ? (
            <Radio size={14} color={colors.success} strokeWidth={2.2} />
          ) : (
            <Activity size={14} color={colors.textMuted} strokeWidth={2.2} />
          )}
          <Text
            style={[
              typography.caption,
              {
                color: isListening ? colors.success : colors.textMuted,
                fontWeight: '600',
              },
            ]}>
            {isListening ? 'Đang đọc cảm biến' : 'Chưa đọc'}
          </Text>
        </View>
      </View>

      <Card style={styles.labelCard}>
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          Trạng thái chuyển động
        </Text>
        <Text style={[typography.title, { color: labelColor }]}>
          {LABEL_TEXT[label]}
        </Text>
        <Text
          style={[
            typography.caption,
            tabularNums,
            { color: colors.textMuted },
          ]}>
          Độ tin cậy {Math.round(confidence * 100)}%
        </Text>
        {!gyroAvailable ? (
          <View style={[styles.warningRow, { gap: spacing.xs }]}>
            <AlertTriangle size={14} color={colors.warning} strokeWidth={2} />
            <Text style={[typography.caption, { color: colors.warning }]}>
              Thiết bị không có gyroscope — chỉ đang đọc accelerometer.
            </Text>
          </View>
        ) : null}
      </Card>

      <Card style={{ gap: spacing.sm }}>
        <Text style={[typography.label, { color: colors.text }]}>
          Gia tốc hiện tại
        </Text>
        <View style={styles.metricRow}>
          <AxisMetric
            label="X"
            value={last ? accelFormatter.format(last.x) : '—'}
          />
          <AxisMetric
            label="Y"
            value={last ? accelFormatter.format(last.y) : '—'}
          />
          <AxisMetric
            label="Z"
            value={last ? accelFormatter.format(last.z) : '—'}
          />
          <AxisMetric
            label="|a|"
            value={last ? accelFormatter.format(last.magnitude) : '—'}
          />
        </View>
        <Text
          style={[
            typography.caption,
            tabularNums,
            { color: colors.textMuted },
          ]}>
          Đơn vị m/s² · {samples.length} mẫu trong buffer
        </Text>
      </Card>

      <Card style={{ gap: spacing.sm }}>
        <Text style={[typography.label, { color: colors.text }]}>
          Độ lớn gia tốc (2 giây gần nhất)
        </Text>
        {magnitudes.length > 1 ? (
          <Sparkline
            values={magnitudes}
            width={Math.max(160, width - spacing.lg * 4)}
            color={colors.primary}
          />
        ) : (
          <EmptyState
            title="Chưa có dữ liệu đồ thị"
            message="Đang chờ mẫu cảm biến đầu tiên…"
          />
        )}
      </Card>
    </View>
  );
});

const styles = StyleSheet.create({
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  labelCard: {
    alignItems: 'center',
    gap: 4,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
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
