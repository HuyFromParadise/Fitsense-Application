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
import { colors, spacing, typography } from '../../theme';
import { Card, EmptyState, Loading } from '../../components/common';
import { formatDistanceKm, formatDuration } from '../exercise';
import { useAnalytics } from './useAnalytics';

type ChartMetric = 'distance' | 'steps' | 'calories';

const SCREEN_WIDTH = Dimensions.get('window').width;

export const AnalyticsScreen: React.FC = () => {
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
            ? colors.accent
            : colors.secondary,
      };
    });
  }, [data, chartMetric, mode]);

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
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => refetch()}
          tintColor={colors.primary}
        />
      }
    >
      {/* Weekly / Monthly Mode Switcher */}
      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeTab, mode === 'weekly' && styles.modeTabActive]}
          onPress={() => setMode('weekly')}
        >
          <Text
            style={[
              typography.bodyBold,
              { color: mode === 'weekly' ? colors.white : colors.textSecondary },
            ]}
          >
            Theo tuần
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeTab, mode === 'monthly' && styles.modeTabActive]}
          onPress={() => setMode('monthly')}
        >
          <Text
            style={[
              typography.bodyBold,
              { color: mode === 'monthly' ? colors.white : colors.textSecondary },
            ]}
          >
            Theo tháng
          </Text>
        </TouchableOpacity>
      </View>

      {/* Date Range Navigation */}
      <Card style={styles.rangeCard}>
        <TouchableOpacity onPress={goPrev} style={styles.navArrow}>
          <Text style={[typography.h3, { color: colors.primary }]}>◀</Text>
        </TouchableOpacity>
        <View style={styles.rangeCenter}>
          <Text style={[typography.bodyBold, styles.rangeText]}>
            {data ? `${data.periodStart} → ${data.periodEnd}` : 'Đang tải...'}
          </Text>
          {isOfflineFallback && (
            <Text style={[typography.caption, styles.offlineTag]}>
              📡 Dữ liệu Offline trên thiết bị
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={goNext}
          disabled={!canGoNext}
          style={[styles.navArrow, !canGoNext && { opacity: 0.3 }]}
        >
          <Text style={[typography.h3, { color: colors.primary }]}>▶</Text>
        </TouchableOpacity>
      </Card>

      {!data ? (
        <EmptyState
          icon="📊"
          title="Chưa có dữ liệu"
          description="Hãy tập luyện hoặc kết nối mạng để xem thống kê của bạn."
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
                },
              ]}
            >
              <Text
                style={[
                  typography.bodyBold,
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
          <View style={styles.kpiGrid}>
            <Card style={styles.kpiCard}>
              <Text style={[typography.caption, styles.kpiLabel]}>Tổng quãng đường</Text>
              <Text style={[typography.h2, { color: colors.secondary }]}>
                {formatDistanceKm(data.totalDistanceM)} km
              </Text>
            </Card>

            <Card style={styles.kpiCard}>
              <Text style={[typography.caption, styles.kpiLabel]}>Tổng số bước</Text>
              <Text style={[typography.h2, { color: colors.primary }]}>
                {data.totalSteps.toLocaleString('vi-VN')}
              </Text>
              <Text style={[typography.caption, styles.kpiSub]}>
                TB: {Math.round(data.averageStepsPerDay)} / ngày
              </Text>
            </Card>

            <Card style={styles.kpiCard}>
              <Text style={[typography.caption, styles.kpiLabel]}>Buổi tập GPS</Text>
              <Text style={[typography.h2, { color: colors.accent }]}>
                {data.totalExerciseCount} buổi
              </Text>
              <Text style={[typography.caption, styles.kpiSub]}>
                {formatDuration(data.totalExerciseSeconds)}
              </Text>
            </Card>

            <Card style={styles.kpiCard}>
              <Text style={[typography.caption, styles.kpiLabel]}>Hoàn thành Goal</Text>
              <Text style={[typography.h2, { color: colors.success }]}>
                {Math.round(data.goalCompletionRate * 100)}%
              </Text>
              <Text style={[typography.caption, styles.kpiSub]}>
                {data.bestDay ? `Đỉnh: ${formatShortLabel(data.bestDay)}` : 'Chưa có đỉnh'}
              </Text>
            </Card>
          </View>

          {/* Chart Card */}
          <Card style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Text style={[typography.h3, styles.chartTitle]}>Biểu đồ chi tiết</Text>
              <View style={styles.metricChips}>
                {[
                  { key: 'distance' as ChartMetric, label: 'Km' },
                  { key: 'steps' as ChartMetric, label: 'Bước' },
                  { key: 'calories' as ChartMetric, label: 'Calo' },
                ].map((m) => (
                  <TouchableOpacity
                    key={m.key}
                    style={[
                      styles.metricChip,
                      chartMetric === m.key && styles.metricChipActive,
                    ]}
                    onPress={() => setChartMetric(m.key)}
                  >
                    <Text
                      style={[
                        typography.captionBold,
                        {
                          color:
                            chartMetric === m.key
                              ? colors.white
                              : colors.textSecondary,
                        },
                      ]}
                    >
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {chartData.length > 0 ? (
              <View style={styles.chartWrapper}>
                {mode === 'weekly' ? (
                  <BarChart
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
                    xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
                    noOfSections={4}
                    isAnimated
                  />
                ) : (
                  <LineChart
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
                    xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
                    noOfSections={4}
                  />
                )}
              </View>
            ) : (
              <Text style={[typography.body, styles.noChartText]}>
                Không có dữ liệu biểu đồ cho khoảng thời gian này.
              </Text>
            )}
          </Card>

          {/* Calories & Active Minutes Highlight */}
          <Card style={styles.highlightCard}>
            <View style={styles.highlightRow}>
              <View>
                <Text style={[typography.caption, styles.kpiLabel]}>
                  Tổng năng lượng tiêu hao
                </Text>
                <Text style={[typography.h2, { color: colors.accent }]}>
                  {data.totalCalories.toFixed(0)} kcal
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[typography.caption, styles.kpiLabel]}>
                  Thời gian vận động
                </Text>
                <Text style={[typography.h2, { color: colors.text }]}>
                  {data.totalActiveMinutes} phút
                </Text>
              </View>
            </View>
          </Card>
        </>
      )}
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
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  modeRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    alignItems: 'center',
  },
  modeTabActive: {
    backgroundColor: colors.primary,
  },
  rangeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  navArrow: {
    padding: spacing.xs,
  },
  rangeCenter: {
    alignItems: 'center',
  },
  rangeText: {
    color: colors.text,
  },
  offlineTag: {
    color: colors.warning,
    marginTop: 2,
  },
  comparisonCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  kpiCard: {
    width: '48.5%',
    padding: spacing.md,
  },
  kpiLabel: {
    color: colors.textSecondary,
    marginBottom: 4,
  },
  kpiSub: {
    color: colors.textMuted,
    marginTop: 2,
  },
  chartCard: {
    padding: spacing.md,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  chartTitle: {
    color: colors.text,
  },
  metricChips: {
    flexDirection: 'row',
    gap: 6,
  },
  metricChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.surfaceLight,
  },
  metricChipActive: {
    backgroundColor: colors.primary,
  },
  chartWrapper: {
    alignItems: 'center',
    overflow: 'hidden',
    paddingVertical: spacing.xs,
  },
  noChartText: {
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  highlightCard: {
    padding: spacing.md,
  },
  highlightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
