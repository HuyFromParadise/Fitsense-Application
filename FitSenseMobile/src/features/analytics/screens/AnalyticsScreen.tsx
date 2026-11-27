import {
  Activity,
  Award,
  ChevronLeft,
  ChevronRight,
  Flame,
  Footprints,
  Route,
  Sparkles,
  Target,
  Timer,
  TrendingDown,
  TrendingUp,
  WifiOff,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../../app/providers/ThemeProvider';
import {
  Card,
  EmptyState,
  MetricTile,
  SkeletonLoader,
} from '../../../components/common';
import { tabularNums } from '../../../theme';
import { formatDistanceKm, formatDuration } from '../../exercise';
import { useAnalytics } from '../useAnalytics';

type ChartMetric = 'distance' | 'steps' | 'calories';

const numberFormatter = new Intl.NumberFormat('vi-VN');

function formatShortLabel(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}`;
}

export function AnalyticsScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const {
    mode,
    setMode,
    goPrev,
    goNext,
    canGoNext,
    data,
    isLoading,
    isRefetching,
    isOfflineFallback,
    refetch,
  } = useAnalytics();

  const [chartMetric, setChartMetric] = useState<ChartMetric>('distance');

  const chartData = useMemo(() => {
    const rows = data?.dailyBreakdown ?? [];
    if (rows.length === 0) return [];

    return rows.map((row, index) => {
      const value =
        chartMetric === 'steps'
          ? row.steps
          : chartMetric === 'calories'
            ? Math.round(row.calories)
            : Number((row.distanceM / 1000).toFixed(2));

      const showLabel =
        mode === 'weekly' ||
        index === 0 ||
        index % 5 === 0 ||
        index === rows.length - 1;

      return {
        value,
        label: showLabel ? formatShortLabel(row.date) : '',
        frontColor:
          chartMetric === 'calories' ? colors.warning : colors.primary,
      };
    });
  }, [data, chartMetric, mode, colors]);

  const comparison = useMemo(() => {
    if (!data || !data.previous) return null;
    const prev = data.previous;

    const currentVal =
      data.totalSteps > 0 ? data.totalSteps : data.totalDistanceM;
    const prevVal =
      prev.totalSteps > 0 ? prev.totalSteps : prev.totalDistanceM;
    const unitLabel = data.totalSteps > 0 ? 'bước chân' : 'quãng đường';
    const periodLabel = mode === 'weekly' ? 'tuần' : 'tháng';

    if (prevVal === 0 && currentVal === 0) {
      return {
        text: `Hãy bắt đầu vận động để tạo cột mốc đầu tiên cho ${periodLabel} này nhé!`,
        positive: true,
        kind: 'neutral' as const,
      };
    }
    if (prevVal === 0) {
      return {
        text: `Khởi đầu tuyệt vời! Bạn đang có tiến bộ mới về ${unitLabel} so với ${periodLabel} trước.`,
        positive: true,
        kind: 'sparkle' as const,
      };
    }

    const pct = Math.round(((currentVal - prevVal) / prevVal) * 100);
    if (pct >= 0) {
      return {
        text: `Tuyệt vời! Bạn đạt nhiều hơn ${pct}% ${unitLabel} so với ${periodLabel} trước.`,
        positive: true,
        kind: 'up' as const,
      };
    }
    return {
      text: `Giảm ${Math.abs(pct)}% ${unitLabel} so với ${periodLabel} trước — cố gắng thêm một chút nhé!`,
      positive: false,
      kind: 'down' as const,
    };
  }, [data, mode]);

  const completionPct = useMemo(() => {
    if (!data) return 0;
    return Math.round(
      data.goalCompletionRate <= 1
        ? data.goalCompletionRate * 100
        : data.goalCompletionRate,
    );
  }, [data]);

  const chartWidth = Math.max(200, width - spacing.lg * 4 - 24);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        padding: spacing.lg,
        paddingTop: insets.top + spacing.lg,
        paddingBottom: Math.max(insets.bottom, spacing.xl),
        gap: spacing.lg,
      }}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={async () => {
            await refetch();
          }}
          tintColor={colors.primary}
        />
      }>
      {/* Screen Header */}
      <View>
        <Text style={[typography.title, { color: colors.text }]}>Thống kê</Text>
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          Theo dõi xu hướng vận động và tiến bộ của bạn
        </Text>
      </View>

      {/* Weekly / Monthly Mode Switcher */}
      <View
        style={[
          styles.modeRow,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.md,
          },
        ]}>
        {(
          [
            { key: 'weekly', label: 'Theo tuần' },
            { key: 'monthly', label: 'Theo tháng' },
          ] as const
        ).map(item => {
          const active = mode === item.key;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setMode(item.key)}
              style={({ pressed }) => [
                styles.modeTab,
                {
                  backgroundColor: active ? colors.primary : 'transparent',
                  borderRadius: radius.sm,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}>
              <Text
                style={[
                  typography.label,
                  { color: active ? colors.onPrimary : colors.textMuted },
                ]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Date Range Navigation */}
      <Card style={[styles.rangeCard, { paddingVertical: spacing.sm, paddingHorizontal: spacing.md }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kỳ trước"
          onPress={goPrev}
          style={({ pressed }) => [
            styles.navBtn,
            {
              backgroundColor: colors.surfaceAlt,
              borderRadius: radius.md,
              opacity: pressed ? 0.75 : 1,
            },
          ]}>
          <ChevronLeft size={20} color={colors.primary} strokeWidth={2.2} />
        </Pressable>

        <View style={styles.rangeCenter}>
          <Text style={[typography.label, tabularNums, { color: colors.text }]}>
            {data
              ? `${formatShortLabel(data.periodStart)} – ${formatShortLabel(data.periodEnd)}`
              : 'Đang tải...'}
          </Text>
          {isOfflineFallback ? (
            <View style={[styles.offlineRow, { gap: spacing.xs }]}>
              <WifiOff size={12} color={colors.warning} strokeWidth={2} />
              <Text style={[typography.caption, { color: colors.warning }]}>
                Dữ liệu Offline trên thiết bị
              </Text>
            </View>
          ) : null}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kỳ sau"
          onPress={goNext}
          disabled={!canGoNext}
          style={({ pressed }) => [
            styles.navBtn,
            {
              backgroundColor: colors.surfaceAlt,
              borderRadius: radius.md,
              opacity: !canGoNext ? 0.3 : pressed ? 0.75 : 1,
            },
          ]}>
          <ChevronRight size={20} color={colors.primary} strokeWidth={2.2} />
        </Pressable>
      </Card>

      {isLoading && !data ? (
        <View style={{ gap: spacing.md }}>
          <SkeletonLoader width="100%" height={64} />
          <View style={[styles.kpiGrid, { gap: spacing.sm }]}>
            <SkeletonLoader width="48.5%" height={84} />
            <SkeletonLoader width="48.5%" height={84} />
            <SkeletonLoader width="48.5%" height={84} />
            <SkeletonLoader width="48.5%" height={84} />
          </View>
          <SkeletonLoader width="100%" height={240} />
        </View>
      ) : !data ? (
        <Card>
          <EmptyState
            title="Chưa có dữ liệu"
            message="Hãy bắt đầu đi bộ hoặc tập luyện để xem thống kê hoạt động của bạn."
          />
        </Card>
      ) : (
        <>
          {/* Friendly Comparison Insight */}
          {comparison ? (
            <Card style={[styles.comparisonCard, { gap: spacing.sm }]}>
              <View
                style={[
                  styles.iconBadge,
                  {
                    backgroundColor: comparison.positive
                      ? colors.primaryMuted
                      : colors.surfaceAlt,
                    borderRadius: radius.md,
                  },
                ]}>
                {comparison.kind === 'up' ? (
                  <TrendingUp size={18} color={colors.primary} strokeWidth={2.2} />
                ) : comparison.kind === 'down' ? (
                  <TrendingDown size={18} color={colors.warning} strokeWidth={2.2} />
                ) : (
                  <Sparkles size={18} color={colors.primary} strokeWidth={2.2} />
                )}
              </View>
              <Text
                style={[
                  typography.body,
                  styles.flex,
                  { color: colors.text },
                ]}>
                {comparison.text}
              </Text>
            </Card>
          ) : null}

          {/* Summary KPI Grid */}
          <View style={[styles.kpiGrid, { gap: spacing.sm }]}>
            <MetricTile
              icon={<Route size={14} color={colors.primary} strokeWidth={2} />}
              label="Quãng đường"
              value={formatDistanceKm(data.totalDistanceM)}
              unit="km"
              style={styles.kpiCard}
            />
            <MetricTile
              icon={<Footprints size={14} color={colors.primary} strokeWidth={2} />}
              label="Tổng bước"
              value={numberFormatter.format(data.totalSteps)}
              unit={`TB ${numberFormatter.format(Math.round(data.averageStepsPerDay))}/ngày`}
              style={styles.kpiCard}
            />
            <MetricTile
              icon={<Activity size={14} color={colors.primary} strokeWidth={2} />}
              label="Buổi tập"
              value={data.totalExerciseCount}
              unit={formatDuration(data.totalActiveMinutes * 60)}
              style={styles.kpiCard}
            />
            <MetricTile
              icon={<Target size={14} color={colors.primary} strokeWidth={2} />}
              label="Đạt mục tiêu"
              value={`${completionPct}%`}
              style={styles.kpiCard}
            />
          </View>

          {/* Activity Trend Chart */}
          <Card style={{ gap: spacing.md }}>
            <View style={[styles.chartHeader, { gap: spacing.sm }]}>
              <View style={styles.flex}>
                <Text style={[typography.heading, { color: colors.text }]}>
                  Xu hướng {mode === 'weekly' ? 'tuần' : 'tháng'}
                </Text>
                {data.bestDay ? (
                  <View style={[styles.bestDayRow, { gap: spacing.xs }]}>
                    <Award size={12} color={colors.primary} strokeWidth={2} />
                    <Text
                      style={[
                        typography.caption,
                        tabularNums,
                        { color: colors.textMuted },
                      ]}>
                      Ngày nổi bật: {formatShortLabel(data.bestDay)}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Metric Toggle Chips */}
              <View style={[styles.metricChips, { gap: spacing.xs }]}>
                {(['distance', 'steps', 'calories'] as ChartMetric[]).map(m => {
                  const active = chartMetric === m;
                  const label =
                    m === 'distance' ? 'Km' : m === 'steps' ? 'Bước' : 'Calo';
                  return (
                    <Pressable
                      key={m}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                      style={({ pressed }) => [
                        styles.metricChip,
                        {
                          backgroundColor: active
                            ? colors.primary
                            : colors.surfaceAlt,
                          borderRadius: radius.pill,
                          opacity: pressed ? 0.85 : 1,
                        },
                      ]}
                      onPress={() => setChartMetric(m)}>
                      <Text
                        style={[
                          typography.caption,
                          {
                            color: active ? colors.onPrimary : colors.textMuted,
                            fontWeight: '700',
                          },
                        ]}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {chartData.length > 0 ? (
              <View style={styles.chartWrapper}>
                {mode === 'weekly' ? (
                  <BarChart
                    key={`bar-${data.periodStart}-${chartMetric}`}
                    data={chartData}
                    width={chartWidth}
                    height={190}
                    barWidth={22}
                    spacing={14}
                    roundedTop
                    hideRules
                    xAxisThickness={1}
                    yAxisThickness={0}
                    xAxisColor={colors.border}
                    yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
                    xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 10 }}
                    noOfSections={4}
                    isAnimated
                  />
                ) : (
                  <LineChart
                    key={`line-${data.periodStart}-${chartMetric}`}
                    data={chartData}
                    width={chartWidth}
                    height={190}
                    spacing={18}
                    color={colors.primary}
                    thickness={2.5}
                    dataPointsColor={colors.primary}
                    areaChart
                    startFillColor={colors.primary}
                    startOpacity={0.25}
                    endOpacity={0.01}
                    hideRules
                    xAxisThickness={1}
                    yAxisThickness={0}
                    xAxisColor={colors.border}
                    yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
                    xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 10 }}
                    noOfSections={4}
                    isAnimated
                    animationDuration={800}
                    animateOnDataChange
                  />
                )}
              </View>
            ) : (
              <EmptyState
                title="Chưa có dữ liệu biểu đồ"
                message="Không có dữ liệu hoạt động trong khoảng thời gian này."
              />
            )}
          </Card>

          {/* Calories & Active Minutes Highlight */}
          <View style={[styles.highlightRow, { gap: spacing.sm }]}>
            <MetricTile
              icon={<Flame size={14} color={colors.warning} strokeWidth={2} />}
              label="Năng lượng tiêu hao"
              value={numberFormatter.format(Math.round(data.totalCalories))}
              unit="kcal"
              style={styles.flex}
            />
            <MetricTile
              icon={<Timer size={14} color={colors.primary} strokeWidth={2} />}
              label="Vận động tích cực"
              value={numberFormatter.format(data.totalActiveMinutes)}
              unit="phút"
              style={styles.flex}
            />
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  modeRow: {
    flexDirection: 'row',
    padding: 4,
    borderWidth: 1,
  },
  modeTab: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rangeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeCenter: {
    alignItems: 'center',
  },
  offlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  comparisonCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBadge: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  kpiCard: {
    width: '48.5%',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bestDayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  metricChips: {
    flexDirection: 'row',
  },
  metricChip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  chartWrapper: {
    alignItems: 'center',
    overflow: 'hidden',
    paddingVertical: 4,
  },
  highlightRow: {
    flexDirection: 'row',
  },
});
