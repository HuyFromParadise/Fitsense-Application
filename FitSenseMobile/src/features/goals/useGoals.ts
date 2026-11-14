import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';

import { LocalDb } from '../../services/native';
import type { LocalExerciseRow } from '../../types/native-interface';
import { goalsApi } from './goalsApi';
import { sumWeeklyExercises, weekEndMs, weekStartMs, type WeeklyExerciseTotals } from './goalProgress';
import type { GoalUpsertRequest } from './types';

const PAGE_SIZE = 100;

/** Đọc `local_exercise` theo trang (chỉ đọc), dừng khi tới trước tuần hiện tại. */
async function loadWeeklyExercises(weekStart: number): Promise<LocalExerciseRow[]> {
  const rows: LocalExerciseRow[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await LocalDb.getLocalExercises(PAGE_SIZE, offset);
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    if (page[page.length - 1].startedAtMs < weekStart) break;
  }
  return rows;
}

export function useWeeklyExerciseTotals(enabled: boolean) {
  const weekStart = weekStartMs();
  const query = useQuery({
    queryKey: ['goals', 'weekly-exercises', weekStart],
    queryFn: () => loadWeeklyExercises(weekStart),
    enabled,
    staleTime: 60_000,
  });

  const totals: WeeklyExerciseTotals = query.data
    ? sumWeeklyExercises(query.data, weekStart, weekEndMs())
    : { count: 0, durationSeconds: 0 };

  return totals;
}

export function useGoals() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['goals'] });

  const list = useQuery({
    queryKey: ['goals', 'list'],
    queryFn: goalsApi.listGoals,
  });

  const create = useMutation({
    mutationFn: (request: GoalUpsertRequest) => goalsApi.createGoal(request),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, request }: { id: string; request: GoalUpsertRequest }) =>
      goalsApi.updateGoal(id, request),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => goalsApi.deleteGoal(id),
    onSuccess: invalidate,
  });

  return { list, create, update, remove };
}
