import { zodResolver } from '@hookform/resolvers/zod';
import { FlashList } from '@shopify/flash-list';
import React, { memo, useCallback, useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Alert,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

import { useTheme } from '../../../app/providers/ThemeProvider';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  SkeletonLoader,
} from '../../../components/common';
import { useTodayActivity } from '../../../stores/useTodayActivity';
import { tabularNums } from '../../../theme';
import { todayIsoDate } from '../../../utils/date';
import {
  formatGoalProgress,
  GOAL_TYPE_LABEL,
  goalProgress,
} from '../goalProgress';
import type { Goal, GoalType, GoalUpsertRequest } from '../types';
import { useGoals, useWeeklyExerciseTotals } from '../useGoals';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const GOAL_TYPES = [
  'DAILY_STEPS',
  'DAILY_DISTANCE',
  'DAILY_CALORIES',
  'WEEKLY_EXERCISE_DURATION',
  'WEEKLY_EXERCISE_COUNT',
] as const;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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

const GoalForm = memo(function GoalForm({
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
    control,
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
        {GOAL_TYPES.map(option => {
          const isSelected = type === option;
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => setValue('type', option, { shouldValidate: true })}
              style={({ pressed }) => [
                styles.chip,
                {
                  borderColor: isSelected ? colors.primary : colors.border,
                  borderRadius: radius.md,
                  backgroundColor: isSelected ? colors.primaryMuted : colors.surface,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}>
              <Text
                style={[
                  typography.caption,
                  {
                    color: isSelected ? colors.primary : colors.textMuted,
                    fontWeight: isSelected ? '700' : '400',
                  },
                ]}>
                {GOAL_TYPE_LABEL[option]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Controller
        control={control}
        name="targetValue"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label={
              type === 'DAILY_DISTANCE'
                ? 'Mục tiêu (mét)'
                : type === 'WEEKLY_EXERCISE_DURATION'
                  ? 'Mục tiêu (phút)'
                  : 'Mục tiêu'
            }
            keyboardType="numeric"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.targetValue?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="startsOn"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Bắt đầu (yyyy-MM-dd)"
            autoCapitalize="none"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.startsOn?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="endsOn"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Kết thúc (để trống nếu không có)"
            autoCapitalize="none"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.endsOn?.message}
          />
        )}
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
});

const GoalRowItem = memo(function GoalRowItem({
  goal,
  progress,
  progressLabel,
  onEdit,
  onDelete,
}: {
  goal: Goal;
  progress: number;
  progressLabel: string;
  onEdit: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
}) {
  const { colors, radius, spacing, typography } = useTheme();

  return (
    <Card style={{ gap: spacing.sm, marginBottom: spacing.md }}>
      <Text style={[typography.label, { color: colors.text }]}>
        {GOAL_TYPE_LABEL[goal.type]}
      </Text>
      <View
        style={[
          styles.track,
          { backgroundColor: colors.surfaceAlt, borderRadius: radius.pill },
        ]}>
        <View
          style={[
            styles.fill,
            {
              backgroundColor: progress >= 1 ? colors.success : colors.primary,
              borderRadius: radius.pill,
              width: `${Math.min(100, Math.round(progress * 100))}%`,
            },
          ]}
        />
      </View>
      <Text style={[typography.caption, tabularNums, { color: colors.textMuted }]}>
        {progressLabel}
      </Text>
      {goal.endsOn ? (
        <Text style={[typography.caption, tabularNums, { color: colors.textMuted }]}>
          Đến {goal.endsOn}
        </Text>
      ) : null}
      <View style={[styles.row, { gap: spacing.sm }]}>
        <Button
          title="Sửa"
          variant="secondary"
          onPress={() => onEdit(goal)}
        />
        <Button title="Xóa" variant="danger" onPress={() => onDelete(goal)} />
      </View>
    </Card>
  );
});

export function GoalsScreen() {
  const { colors, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const daily = useTodayActivity();
  const refreshDaily = useTodayActivity(state => state.refresh);
  const { list, create, update, remove } = useGoals();
  const goals = list.data ?? [];
  const weekly = useWeeklyExerciseTotals(goals.some(goal => isWeekly(goal.type)));
  const [editing, setEditing] = useState<Goal | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [showForm, goals.length]);

  useEffect(() => {
    refreshDaily().catch(() => {});
  }, [refreshDaily]);

  const closeForm = useCallback(() => {
    setShowForm(false);
    setEditing(null);
  }, []);

  const handleEdit = useCallback((goal: Goal) => {
    setEditing(goal);
    setShowForm(true);
  }, []);

  const confirmDelete = useCallback(
    (goal: Goal) => {
      Alert.alert('Xóa mục tiêu', `Xóa "${GOAL_TYPE_LABEL[goal.type]}"?`, [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa', style: 'destructive', onPress: () => remove.mutate(goal.id) },
      ]);
    },
    [remove],
  );

  const keyExtractor = useCallback((item: Goal) => String(item.id), []);

  const renderItem = useCallback(
    ({ item }: { item: Goal }) => (
      <GoalRowItem
        goal={item}
        progress={goalProgress(item, daily, weekly)}
        progressLabel={formatGoalProgress(item, daily, weekly)}
        onEdit={handleEdit}
        onDelete={confirmDelete}
      />
    ),
    [daily, weekly, handleEdit, confirmDelete],
  );

  const listHeader = (
    <View style={{ gap: spacing.lg, marginBottom: spacing.lg }}>
      <View style={styles.header}>
        <Text style={[typography.heading, { color: colors.text }]}>Mục tiêu</Text>
        {!showForm ? (
          <Button
            title="Thêm"
            variant="primary"
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

      {list.isLoading ? (
        <View style={{ gap: spacing.md }}>
          <Card style={{ gap: spacing.sm }}>
            <SkeletonLoader width="45%" height={16} />
            <SkeletonLoader width="100%" height={10} />
            <SkeletonLoader width="60%" height={14} />
          </Card>
          <Card style={{ gap: spacing.sm }}>
            <SkeletonLoader width="50%" height={16} />
            <SkeletonLoader width="100%" height={10} />
            <SkeletonLoader width="55%" height={14} />
          </Card>
        </View>
      ) : null}

      {list.isError ? (
        <ErrorState message={list.error.message} onRetry={() => list.refetch()} />
      ) : null}
    </View>
  );

  const listEmpty =
    !list.isLoading && !list.isError ? (
      <Card>
        <EmptyState
          title="Chưa có mục tiêu"
          message="Thêm mục tiêu bước chân, quãng đường hoặc số buổi tập để theo dõi tiến độ."
        />
      </Card>
    ) : null;

  const listFooter = remove.isError ? (
    <Text style={[typography.caption, { color: colors.danger }]}>
      {remove.error.message}
    </Text>
  ) : null;

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlashList
          data={list.isLoading || list.isError ? [] : goals}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            padding: spacing.lg,
            paddingBottom: Math.max(insets.bottom, spacing.lg),
          }}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmpty}
          ListFooterComponent={listFooter}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
  },
  track: {
    height: 10,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
