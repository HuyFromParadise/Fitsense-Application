import { zodResolver } from '@hookform/resolvers/zod';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import { useTheme } from '../../../app/providers/ThemeProvider';
import { Button, Card, EmptyState, ErrorState, Input, Loading } from '../../../components/common';
import { useTodayActivity } from '../../../stores/useTodayActivity';
import { todayIsoDate } from '../../../utils/date';
import {
  formatGoalProgress,
  GOAL_TYPE_LABEL,
  goalProgress,
} from '../goalProgress';
import { useGoals, useWeeklyExerciseTotals } from '../useGoals';
import type { Goal, GoalType, GoalUpsertRequest } from '../types';

const GOAL_TYPES = [
  'DAILY_STEPS',
  'DAILY_DISTANCE',
  'DAILY_CALORIES',
  'WEEKLY_EXERCISE_DURATION',
  'WEEKLY_EXERCISE_COUNT',
] as const;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const BAR_RADIUS = 999;

const formSchema = z
  .object({
    type: z.enum(GOAL_TYPES),
    targetValue: z
      .string()
      .refine(value => Number.isFinite(Number(value)) && Number(value) > 0, 'Giá trị phải lớn hơn 0'),
    startsOn: z.string().regex(DATE_PATTERN, 'Định dạng yyyy-MM-dd'),
    endsOn: z.union([z.literal(''), z.string().regex(DATE_PATTERN, 'Định dạng yyyy-MM-dd')]),
  })
  .refine(value => !value.endsOn || value.endsOn >= value.startsOn, {
    message: 'Ngày kết thúc phải bằng hoặc sau ngày bắt đầu',
    path: ['endsOn'],
  });

type FormValues = z.infer<typeof formSchema>;

function isWeekly(type: GoalType) {
  return type === 'WEEKLY_EXERCISE_DURATION' || type === 'WEEKLY_EXERCISE_COUNT';
}

function GoalForm({
  goal,
  submitting,
  error,
  onSubmit,
  onCancel,
}: {
  goal: Goal | null;
  submitting: boolean;
  error?: string;
  onSubmit: (request: GoalUpsertRequest) => void;
  onCancel: () => void;
}) {
  const { colors, spacing, radius, typography } = useTheme();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: 'DAILY_STEPS',
      targetValue: '8000',
      startsOn: todayIsoDate(),
      endsOn: '',
    },
  });

  const type = watch('type');

  useEffect(() => {
    reset({
      type: goal?.type ?? 'DAILY_STEPS',
      targetValue: String(goal?.targetValue ?? 8000),
      startsOn: goal?.startsOn ?? todayIsoDate(),
      endsOn: goal?.endsOn ?? '',
    });
  }, [goal, reset]);

  return (
    <Card style={{ gap: spacing.sm }}>
      <Text style={[typography.label, { color: colors.text }]}>
        {goal ? 'Sửa mục tiêu' : 'Thêm mục tiêu'}
      </Text>

      <View style={styles.chips}>
        {GOAL_TYPES.map(option => (
          <Pressable
            key={option}
            onPress={() => setValue('type', option, { shouldValidate: true })}
            style={[
              styles.chip,
              {
                borderColor: type === option ? colors.primary : colors.border,
                borderRadius: radius.md,
                backgroundColor: type === option ? colors.surfaceAlt : colors.surface,
              },
            ]}>
            <Text style={[typography.caption, { color: colors.text }]}>
              {GOAL_TYPE_LABEL[option]}
            </Text>
          </Pressable>
        ))}
      </View>

      <Input
        label={type === 'DAILY_DISTANCE' ? 'Mục tiêu (mét)' : type === 'WEEKLY_EXERCISE_DURATION' ? 'Mục tiêu (phút)' : 'Mục tiêu'}
        keyboardType="numeric"
        error={errors.targetValue?.message}
        {...register('targetValue')}
      />
      <Input
        label="Bắt đầu (yyyy-MM-dd)"
        autoCapitalize="none"
        error={errors.startsOn?.message}
        {...register('startsOn')}
      />
      <Input
        label="Kết thúc (để trống nếu không có)"
        autoCapitalize="none"
        error={errors.endsOn?.message}
        {...register('endsOn')}
      />

      {error ? <Text style={[typography.caption, { color: colors.danger }]}>{error}</Text> : null}

      <View style={[styles.row, { gap: spacing.sm }]}>
        <Button
          title={goal ? 'Lưu' : 'Tạo'}
          loading={submitting}
          onPress={handleSubmit(values =>
            onSubmit({
              type: values.type,
              targetValue: Number(values.targetValue),
              startsOn: values.startsOn,
              endsOn: values.endsOn || null,
              enabled: goal?.enabled ?? true,
            }),
          )}
        />
        <Button title="Hủy" variant="ghost" onPress={onCancel} />
      </View>
    </Card>
  );
}

export function GoalsScreen() {
  const { colors, spacing, typography } = useTheme();
  const daily = useTodayActivity();
  const refreshDaily = useTodayActivity(state => state.refresh);
  const { list, create, update, remove } = useGoals();
  const goals = list.data ?? [];
  const weekly = useWeeklyExerciseTotals(goals.some(goal => isWeekly(goal.type)));
  const [editing, setEditing] = useState<Goal | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    refreshDaily().catch(() => {});
  }, [refreshDaily]);

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const confirmDelete = (goal: Goal) => {
    Alert.alert('Xóa mục tiêu', `Xóa "${GOAL_TYPE_LABEL[goal.type]}"?`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: () => remove.mutate(goal.id) },
    ]);
  };

  return (
    <ScrollView
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
      style={{ backgroundColor: colors.background }}>
      <View style={styles.header}>
        <Text style={[typography.heading, { color: colors.text }]}>Mục tiêu</Text>
        {!showForm ? (
          <Button
            title="Thêm"
            variant="secondary"
            onPress={() => {
              setEditing(null);
              setShowForm(true);
            }}
          />
        ) : null}
      </View>

      {showForm ? (
        <GoalForm
          goal={editing}
          submitting={create.isPending || update.isPending}
          error={(create.error ?? update.error)?.message}
          onCancel={closeForm}
          onSubmit={request => {
            if (editing) {
              update.mutate({ id: editing.id, request }, { onSuccess: closeForm });
            } else {
              create.mutate(request, { onSuccess: closeForm });
            }
          }}
        />
      ) : null}

      {list.isLoading ? <Loading message="Đang tải mục tiêu…" /> : null}

      {list.isError ? (
        <ErrorState message={list.error.message} onRetry={() => list.refetch()} />
      ) : null}

      {!list.isLoading && !list.isError && goals.length === 0 ? (
        <Card>
          <EmptyState
            title="Chưa có mục tiêu"
            message="Thêm mục tiêu bước chân, quãng đường hoặc số buổi tập để theo dõi tiến độ."
          />
        </Card>
      ) : null}

      {goals.map(goal => {
        const progress = goalProgress(goal, daily, weekly);
        return (
          <Card key={goal.id} style={{ gap: spacing.sm }}>
            <Text style={[typography.label, { color: colors.text }]}>
              {GOAL_TYPE_LABEL[goal.type]}
            </Text>
            <View
              style={[styles.track, { backgroundColor: colors.surfaceAlt, borderRadius: BAR_RADIUS }]}>
              <View
                style={[
                  styles.fill,
                  {
                    backgroundColor: progress >= 1 ? colors.success : colors.primary,
                    borderRadius: BAR_RADIUS,
                    width: `${Math.round(progress * 100)}%`,
                  },
                ]}
              />
            </View>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              {formatGoalProgress(goal, daily, weekly)}
            </Text>
            {goal.endsOn ? (
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                Đến {goal.endsOn}
              </Text>
            ) : null}
            <View style={[styles.row, { gap: spacing.sm }]}>
              <Button
                title="Sửa"
                variant="secondary"
                onPress={() => {
                  setEditing(goal);
                  setShowForm(true);
                }}
              />
              <Button title="Xóa" variant="danger" onPress={() => confirmDelete(goal)} />
            </View>
          </Card>
        );
      })}

      {remove.isError ? (
        <Text style={[typography.caption, { color: colors.danger }]}>{remove.error.message}</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  row: {
    flexDirection: 'row',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  track: {
    height: 8,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
