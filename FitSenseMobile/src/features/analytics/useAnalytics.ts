import { useEffect, useMemo, useState } from 'react';
import { NativeModules } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { exerciseNative } from '../exercise';
import { analyticsApi } from './analyticsApi';
import { DailyBreakdownItem, PeriodAnalytics } from './types';

export type AnalyticsPeriodMode = 'weekly' | 'monthly';

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getWeekBounds(offsetWeeks: number): { start: Date; end: Date; startStr: string } {
  const now = new Date();
  const day = now.getDay(); // 0 = Sun, 1 = Mon
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday + offsetWeeks * 7);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  return { start: monday, end: sunday, startStr: toIsoDate(monday) };
}

function getMonthBounds(offsetMonths: number): { start: Date; end: Date; monthStr: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
  const monthStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
  return { start, end, monthStr };
}

export const useAnalytics = () => {
  const [mode, setMode] = useState<AnalyticsPeriodMode>('weekly');
  const [offset, setOffset] = useState<number>(0);
  const [offlineData, setOfflineData] = useState<PeriodAnalytics | null>(null);

  const bounds = useMemo(() => {
    if (mode === 'weekly') {
      const w = getWeekBounds(offset);
      return {
        start: w.start,
        end: w.end,
        param: w.startStr,
      };
    }
    const m = getMonthBounds(offset);
    return {
      start: m.start,
      end: m.end,
      param: m.monthStr,
    };
  }, [mode, offset]);

  const query = useQuery({
    queryKey: ['analytics', mode, bounds.param],
    queryFn: () =>
      mode === 'weekly'
        ? analyticsApi.getWeekly(bounds.param)
        : analyticsApi.getMonthly(bounds.param),
    retry: 1,
  });

  // Offline Room/SQLite fallback computation when server is unreachable
  useEffect(() => {
    if (!query.isError) return;

    const buildOfflineAnalytics = async () => {
      try {
        const localExercises = await exerciseNative.getLocalExercises(200, 0);
        let todayActivity: any = null;
        if (NativeModules.LocalDbModule?.getTodayActivity) {
          todayActivity = await NativeModules.LocalDbModule.getTodayActivity();
        }

        const dailyMap = new Map<string, DailyBreakdownItem>();
        for (
          let d = new Date(bounds.start);
          d <= bounds.end;
          d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
        ) {
          const key = toIsoDate(d);
          dailyMap.set(key, {
            date: key,
            steps: 0,
            distanceM: 0,
            calories: 0,
            activeMinutes: 0,
            exerciseCount: 0,
          });
        }

        if (todayActivity && dailyMap.has(todayActivity.date)) {
          const item = dailyMap.get(todayActivity.date)!;
          item.steps = todayActivity.steps || 0;
          item.distanceM = todayActivity.distanceM || 0;
          item.calories = todayActivity.calories || 0;
          item.activeMinutes = todayActivity.activeMinutes || 0;
        }

        for (const ex of localExercises) {
          if (ex.status !== 'FINISHED') continue;
          const dateKey = toIsoDate(new Date(ex.startedAtMs));
          const item = dailyMap.get(dateKey);
          if (item) {
            item.distanceM += ex.distanceM;
            item.calories += ex.calories;
            item.activeMinutes += Math.floor(ex.durationSeconds / 60);
            item.exerciseCount += 1;
          }
        }

        const breakdown = Array.from(dailyMap.values());
        let totalSteps = 0;
        let totalDistanceM = 0;
        let totalCalories = 0;
        let totalActiveMinutes = 0;
        let totalExerciseCount = 0;
        let bestDay: string | null = null;
        let maxScore = -1;

        for (const row of breakdown) {
          totalSteps += row.steps;
          totalDistanceM += row.distanceM;
          totalCalories += row.calories;
          totalActiveMinutes += row.activeMinutes;
          totalExerciseCount += row.exerciseCount;

          const score = row.steps > 0 ? row.steps : row.distanceM;
          if (score > maxScore && score > 0) {
            maxScore = score;
            bestDay = row.date;
          }
        }

        const daysCount = Math.max(1, breakdown.length);
        setOfflineData({
          periodStart: toIsoDate(bounds.start),
          periodEnd: toIsoDate(bounds.end),
          totalSteps,
          averageStepsPerDay: Math.round((totalSteps / daysCount) * 10) / 10,
          totalDistanceM: Math.round(totalDistanceM * 100) / 100,
          totalCalories: Math.round(totalCalories * 10) / 10,
          totalActiveMinutes,
          totalExerciseCount,
          totalExerciseSeconds: totalActiveMinutes * 60,
          bestDay,
          goalCompletionRate: 0,
          previous: null,
          dailyBreakdown: breakdown,
        });
      } catch (err) {
        console.warn('Error computing offline analytics:', err);
      }
    };

    buildOfflineAnalytics();
  }, [query.isError, bounds]);

  return {
    mode,
    setMode: (m: AnalyticsPeriodMode) => {
      setMode(m);
      setOffset(0);
    },
    offset,
    goPrev: () => setOffset((o) => o - 1),
    goNext: () => setOffset((o) => Math.min(0, o + 1)),
    canGoNext: offset < 0,
    data: query.data ?? (query.isError ? offlineData : null),
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    isOfflineFallback: query.isError && Boolean(offlineData),
    refetch: query.refetch,
  };
};
