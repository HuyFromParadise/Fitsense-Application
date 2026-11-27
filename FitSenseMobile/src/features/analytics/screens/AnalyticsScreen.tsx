import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { Card, EmptyState, Loading } from '../../../components/common';
import { formatDistanceKm, formatDuration } from '../../exercise';
import { useAnalytics } from '../useAnalytics';

type ChartMetric = 'distance' | 'steps' | 'calories';

const SCREEN_WIDTH = Dimensions.get('window').width;

export function AnalyticsScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const insets = useSafeAreaInsets();
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

  const formatShortLabel = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}`;
  };

  const chartData = useMemo(() => {
    const rows = data?.dailyBreakdown ?? [];
    if (rows.length === 0) return [];

    // For monthly view, group/downsample labels so x-axis isn't crowded
    return rows.map((row, index) => {
      const value =
        chartMetric === 'steps'
          ? row.steps
          : chartMetric === 'calories'
          ? Math.round(row.calories)
          : Number((row.distanceM / 1000).toFixed(2));

      const showLabel =
        mode === 'weekly' || index === 0 || index % 5 === 0 || index === rows.length - 1;

      return {
        value,
        label: showLabel ? formatShortLabel(row.date) : '',
        frontColor:
          chartMetric === 'steps'
            ? colors.primary
            : chartMetric === 'calories'
            ? colors.warning
            : colors.primary,
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

    if (prevVal === 0 && currentVal === 0) {
      return { text: 'Chưa có dữ liệu kỳ trước để so sánh', positive: true };
    }
    if (prevVal === 0) {
      return {
        text: `Tăng trưởng mới về ${unitLabel} so với ${
          mode === 'weekly' ? 'tuần' : 'tháng'
        } trước 🚀`,
        positive: true,
      };
    }

    const pct = Math.round(((currentVal - prevVal) / prevVal) * 100);
    const dir = pct >= 0 ? 'nhiều hơn' : 'ít hơn';
    const icon = pct >= 0 ? '📈' : '📉';
    return {
      text: `${icon} Bạn đạt ${Math.abs(pct)}% ${dir} (${unitLabel}) so với ${
        mode === 'weekly' ? 'tuần' : 'tháng'
      } trước`,
      positive: pct >= 0,
    };
  }, [data, mode]);

  if (isLoading && !data) {
    return <Loading message="Đang tổng hợp dữ liệu phân tích..." />;
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { padding: spacing.md, paddingTop: insets.top + spacing.md, gap: spacing.md }]}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={async () => {
            await refetch();
          }}
          tintColor={colors.primary}
        />
      }
    >
      {/* Weekly / Monthly Mode Switcher */}
      <View style={[styles.modeRow, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}>
        <TouchableOpacity
          style={[styles.modeTab, mode === 'weekly' && { backgroundColor: colors.primary, borderRadius: radius.sm }]}
          onPress={() => setMode('weekly')}
        >
          <Text
            style={[
              typography.label,
              { color: mode === 'weekly' ? colors.onPrimary : colors.textMuted },
            ]}
          >
            Theo tuần
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeTab, mode === 'monthly' && { backgroundColor: colors.primary, borderRadius: radius.sm }]}
          onPress={() => setMode('monthly')}
        >
          <Text
            style={[
              typography.label,
              { color: mode === 'monthly' ? colors.onPrimary : colors.textMuted },
            ]}
          >
            Theo tháng
          </Text>
        </TouchableOpacity>
      </View>

      {/* Date Range Navigation */}
      <Card style={[styles.rangeCard, { paddingVertical: spacing.sm, paddingHorizontal: spacing.md }]}>
        <TouchableOpacity onPress={goPrev} style={{ padding: spacing.xs }}>
          <Text style={[typography.heading, { color: colors.primary }]}>◀</Text>
        </TouchableOpacity>
        <View style={styles.rangeCenter}>
          <Text style={[typography.label, { color: colors.text }]}>
            {data ? `${data.periodStart} → ${data.periodEnd}` : 'Đang tải...'}
          </Text>
          {isOfflineFallback && (
            <Text style={[typography.caption, { color: colors.warning, marginTop: 2 }]}>
              📡 Dữ liệu Offline trên thiết bị
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={goNext}
          disabled={!canGoNext}
          style={[{ padding: spacing.xs }, !canGoNext && { opacity: 0.3 }]}
        >
          <Text style={[typography.heading, { color: colors.primary }]}>▶</Text>
        </TouchableOpacity>
      </Card>

      {!data ? (
        <EmptyState
          title="Chưa có dữ liệu"
          message="Hãy tập luyện hoặc kết nối mạng để xem thống kê của bạn."
        />
      ) : (
        <>
          {/* Week/Month Comparison Card */}
          {comparison && (
            <Card
              style={[
                styles.comparisonCard,
                {
                  borderColor: comparison.positive
                    ? colors.primary
                    : colors.warning,
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <Text
                style={[
                  typography.label,
                  {
                    color: comparison.positive
                      ? colors.primary
                      : colors.warning,
                  },
                ]}
              >
                {comparison.text}
              </Text>
            </Card>
          )}

          {/* Summary KPI Grid */}
          <View style={[styles.kpiGrid, { gap: spacing.sm }]}>
            <Card style={styles.kpiCard}>
              <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 4 }]}>Tổng quãng đường</Text>
              <Text style={[typography.heading, { color: colors.primary }]}>
                {formatDistanceKm(data.totalDistanceM)} km
              </Text>
            </Card>

            <Card style={styles.kpiCard}>
              <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 4 }]}>Tổng số bước</Text>
              <Text style={[typography.heading, { color: colors.primary }]}>
                {data.totalSteps.toLocaleString('vi-VN')}
              </Text>
              <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
                TB: {Math.round(data.averageStepsPerDay)} / ngày
              </Text>
            </Card>

            <Card style={styles.kpiCard}>
              <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 4 }]}>Số buổi tập</Text>
              <Text style={[typography.heading, { color: colors.text }]}>
                {data.totalExerciseCount} buổi
              </Text>
              <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
                {formatDuration(data.totalActiveMinutes * 60)}
              </Text>
            </Card>

            <Card style={styles.kpiCard}>
              <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 4 }]}>Hoàn thành mục tiêu</Text>
              {(() => {
                const completionPct = Math.round(
                  data.goalCompletionRate <= 1
                    ? data.goalCompletionRate * 100
                    : data.goalCompletionRate
                );
                return (
                  <Text
                    style={[
                      typography.heading,
                      {
                        color:
                          completionPct >= 70
                            ? colors.success
                            : completionPct >= 40
                            ? colors.warning
                            : colors.textMuted,
                      },
                    ]}
                  >
                    {completionPct}%
                  </Text>
                );
              })()}
              <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
                Tỷ lệ đạt goal
              </Text>
            </Card>
          </View>

          {/* Activity Trend Chart */}
          <Card style={[styles.chartCard, { padding: spacing.md }]}>
            <View style={[styles.chartHeader, { marginBottom: spacing.md }]}>
              <Text style={[typography.heading, { color: colors.text }]}>
                Biểu đồ hoạt động ({mode === 'weekly' ? 'Tuần' : 'Tháng'})
              </Text>
              {/* Metric Toggle Chips */}
              <View style={styles.metricChips}>
                {(['distance', 'steps', 'calories'] as ChartMetric[]).map((m) => {
                  const active = chartMetric === m;
                  const label = m === 'distance' ? 'Km' : m === 'steps' ? 'Bước' : 'Calo';
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.metricChip,
                        {
                          backgroundColor: active ? colors.primary : colors.surfaceAlt,
                          borderRadius: radius.pill,
                        },
                      ]}
                      onPress={() => setChartMetric(m)}
                    >
                      <Text
                        style={[
                          typography.caption,
                          {
                            color: active ? colors.onPrimary : colors.textMuted,
                            fontWeight: '700',
                          },
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {chartData.length > 0 ? (
              <View style={styles.chartWrapper}>
                {mode === 'weekly' ? (
                  <BarChart
                    // gifted-charts only draws bars on mount, so remount per period/metric
                    key={`bar-${data.periodStart}-${chartMetric}`}
                    data={chartData}
                    width={SCREEN_WIDTH - 96}
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
                    // same mount-only rendering issue for line/area chart
                    key={`line-${data.periodStart}-${chartMetric}`}
                    data={chartData}
                    width={SCREEN_WIDTH - 96}
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
              <Text style={[typography.body, { color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.lg }]}>
                Không có dữ liệu biểu đồ cho khoảng thời gian này.
              </Text>
            )}
          </Card>

          {/* Calories & Active Minutes Highlight */}
          <Card style={{ padding: spacing.md }}>
            <View style={styles.highlightRow}>
              <View>
                <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 4 }]}>
                  Tổng năng lượng tiêu hao
                </Text>
                <Text style={[typography.heading, { color: colors.warning }]}>
                  {data.totalCalories.toFixed(0)} kcal
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 4 }]}>
                  Thời gian vận động
                </Text>
                <Text style={[typography.heading, { color: colors.text }]}>
                  {data.totalActiveMinutes} phút
                </Text>
              </View>
            </View>
          </Card>
        </>
      )}
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
  modeRow: {
    flexDirection: 'row',
    padding: 4,
    borderWidth: 1,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  rangeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rangeCenter: {
    alignItems: 'center',
  },
  comparisonCard: {
    borderWidth: 1,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  kpiCard: {
    width: '48.5%',
  },
  chartCard: {},
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricChips: {
    flexDirection: 'row',
    gap: 6,
  },
  metricChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chartWrapper: {
    alignItems: 'center',
    overflow: 'hidden',
    paddingVertical: 4,
  },
  highlightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
