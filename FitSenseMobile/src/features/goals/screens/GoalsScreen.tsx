import { zodResolver } from '@hookform/resolvers/zod';
import { FlashList } from '@shopify/flash-list';
import {
  CalendarCheck,
  CheckCircle2,
  Flame,
  Footprints,
  Pencil,
  Route,
  Target,
  Timer,
  Trash2,
  Trophy,
} from 'lucide-react-native';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Alert,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  RefreshControl,
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
  MetricTile,
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

const GOAL_ICONS: Record<GoalType, typeof Footprints> = {
  DAILY_STEPS: Footprints,
  DAILY_DISTANCE: Route,
  DAILY_CALORIES: Flame,
  WEEKLY_EXERCISE_DURATION: Timer,
  WEEKLY_EXERCISE_COUNT: CalendarCheck,
};

const GOAL_PRESETS: Record<GoalType, string[]> = {
  DAILY_STEPS: ['6000', '8000', '10000'],
  DAILY_DISTANCE: ['3000', '5000', '10000'],
  DAILY_CALORIES: ['300', '500', '800'],
  WEEKLY_EXERCISE_DURATION: ['90', '150', '210'],
  WEEKLY_EXERCISE_COUNT: ['3', '5', '7'],
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const countFormatter = new Intl.NumberFormat('vi-VN');

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
  const currentTarget = watch('targetValue');

  useEffect(() => {
    reset({
      type: goal?.type ?? 'DAILY_STEPS',
      targetValue: String(goal?.targetValue ?? 8000),
      startsOn: goal?.startsOn ?? todayIsoDate(),
      endsOn: goal?.endsOn ?? '',
    });
  }, [goal, reset]);

  return (
    <Card style={{ gap: spacing.md }}>
      <View style={[styles.formHeader, { gap: spacing.sm }]}>
        <View
          style={[
            styles.iconBadge,
            {
              backgroundColor: colors.primaryMuted,
              borderRadius: radius.md,
            },
          ]}>
          <Target size={18} color={colors.primary} strokeWidth={2} />
        </View>
        <View style={styles.flex}>
          <Text style={[typography.heading, { color: colors.text }]}>
            {goal ? 'Sửa mục tiêu' : 'Thêm mục tiêu mới'}
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            Chọn loại chỉ số và ngưỡng mục tiêu phù hợp
          </Text>
        </View>
      </View>

      <View style={styles.chips}>
        {GOAL_TYPES.map(option => {
          const isSelected = type === option;
          const IconComponent = GOAL_ICONS[option];
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
                  backgroundColor: isSelected ? colors.primaryMuted : colors.surfaceAlt,
                  opacity: pressed ? 0.85 : 1,
                  gap: spacing.xs,
                },
              ]}>
              <IconComponent
                size={14}
                color={isSelected ? colors.primary : colors.textMuted}
                strokeWidth={2}
              />
              <Text
                style={[
                  typography.caption,
                  {
                    color: isSelected ? colors.primary : colors.textMuted,
                    fontWeight: isSelected ? '700' : '500',
                  },
                ]}>
                {GOAL_TYPE_LABEL[option]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ gap: spacing.xs }}>
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          Gợi ý nhanh
        </Text>
        <View style={[styles.row, { gap: spacing.sm }]}>
          {GOAL_PRESETS[type].map(preset => {
            const active = currentTarget === preset;
            return (
              <Pressable
                key={preset}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() =>
                  setValue('targetValue', preset, { shouldValidate: true })
                }
                style={({ pressed }) => [
                  styles.presetChip,
                  {
                    backgroundColor: active ? colors.primaryMuted : colors.surfaceAlt,
                    borderColor: active ? colors.primary : colors.border,
                    borderRadius: radius.pill,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}>
                <Text
                  style={[
                    typography.caption,
                    tabularNums,
                    {
                      color: active ? colors.primary : colors.text,
                      fontWeight: active ? '700' : '500',
                    },
                  ]}>
                  {countFormatter.format(Number(preset))}
                </Text>
              </Pressable>
            );
          })}
        </View>
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

      <View style={[styles.twoCol, { gap: spacing.sm }]}>
        <View style={styles.flex}>
          <Controller
            control={control}
            name="startsOn"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Bắt đầu"
                placeholder="yyyy-MM-dd"
                autoCapitalize="none"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.startsOn?.message}
              />
            )}
          />
        </View>
        <View style={styles.flex}>
          <Controller
            control={control}
            name="endsOn"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Kết thúc (tùy chọn)"
                placeholder="yyyy-MM-dd"
                autoCapitalize="none"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.endsOn?.message}
              />
            )}
          />
        </View>
      </View>

      {error ? (
        <Text style={[typography.caption, { color: colors.danger }]}>{error}</Text>
      ) : null}

      <View style={[styles.row, { gap: spacing.sm }]}>
        <Button
          title={goal ? 'Lưu thay đổi' : 'Tạo mục tiêu'}
          loading={submitting}
          style={styles.flex}
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
  const IconComponent = GOAL_ICONS[goal.type];
  const isCompleted = progress >= 1;
  const pct = Math.min(100, Math.round(progress * 100));
  const scopeLabel = isWeekly(goal.type) ? 'Hằng tuần' : 'Hằng ngày';

  return (
    <Card style={{ gap: spacing.md, marginBottom: spacing.md }}>
      <View style={[styles.cardHeader, { gap: spacing.sm }]}>
        <View
          style={[
            styles.iconBadge,
            {
              backgroundColor: isCompleted ? colors.surfaceAlt : colors.primaryMuted,
              borderRadius: radius.md,
            },
          ]}>
          <IconComponent
            size={20}
            color={isCompleted ? colors.success : colors.primary}
            strokeWidth={2}
          />
        </View>

        <View style={styles.flex}>
          <Text
            numberOfLines={1}
            style={[typography.heading, { color: colors.text }]}>
            {GOAL_TYPE_LABEL[goal.type]}
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            {scopeLabel}
          </Text>
        </View>

        <View
          style={[
            styles.pctPill,
            {
              backgroundColor: isCompleted ? colors.surfaceAlt : colors.primaryMuted,
              borderRadius: radius.pill,
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xs,
              gap: spacing.xs,
            },
          ]}>
          {isCompleted ? (
            <CheckCircle2 size={14} color={colors.success} strokeWidth={2.2} />
          ) : null}
          <Text
            style={[
              typography.label,
              tabularNums,
              { color: isCompleted ? colors.success : colors.primary },
            ]}>
            {pct}%
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.track,
          { backgroundColor: colors.surfaceAlt, borderRadius: radius.pill },
        ]}>
        <View
          style={[
            styles.fill,
            {
              backgroundColor: isCompleted ? colors.success : colors.primary,
              borderRadius: radius.pill,
              width: `${pct}%`,
            },
          ]}
        />
      </View>

      <View style={[styles.metaRow, { gap: spacing.sm }]}>
        <Text
          style={[
            typography.body,
            tabularNums,
            { color: colors.text, fontWeight: '600' },
          ]}>
          {progressLabel}
        </Text>
        <Text
          style={[
            typography.caption,
            tabularNums,
            { color: colors.textMuted },
          ]}>
          {goal.endsOn ? `Đến ${goal.endsOn}` : `Từ ${goal.startsOn}`}
        </Text>
      </View>

      <View
        style={[
          styles.actionRow,
          {
            borderTopColor: colors.border,
            paddingTop: spacing.sm,
            gap: spacing.sm,
          },
        ]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Sửa ${GOAL_TYPE_LABEL[goal.type]}`}
          onPress={() => onEdit(goal)}
          style={({ pressed }) => [
            styles.actionBtn,
            {
              backgroundColor: colors.surfaceAlt,
              borderRadius: radius.md,
              opacity: pressed ? 0.8 : 1,
              gap: spacing.xs,
            },
          ]}>
          <Pencil size={14} color={colors.text} strokeWidth={2} />
          <Text style={[typography.label, { color: colors.text }]}>Sửa</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Xóa ${GOAL_TYPE_LABEL[goal.type]}`}
          onPress={() => onDelete(goal)}
          style={({ pressed }) => [
            styles.actionBtn,
            {
              backgroundColor: colors.surfaceAlt,
              borderRadius: radius.md,
              opacity: pressed ? 0.8 : 1,
              gap: spacing.xs,
            },
          ]}>
          <Trash2 size={14} color={colors.danger} strokeWidth={2} />
          <Text style={[typography.label, { color: colors.danger }]}>Xóa</Text>
        </Pressable>
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

  const handleRefresh = useCallback(() => {
    refreshDaily().catch(() => {});
    list.refetch();
  }, [refreshDaily, list]);

  const completedCount = useMemo(
    () =>
      goals.filter(goal => goalProgress(goal, daily, weekly) >= 1).length,
    [goals, daily, weekly],
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
      <View style={[styles.header, { gap: spacing.sm }]}>
        <View style={styles.flex}>
          <Text style={[typography.title, { color: colors.text }]}>Mục tiêu</Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            Theo dõi tiến độ ngày & tuần
          </Text>
        </View>
        {!showForm ? (
          <Button
            title="+ Thêm"
            variant="primary"
            onPress={() => {
              setEditing(null);
              setShowForm(true);
            }}
          />
        ) : null}
      </View>

      {!list.isLoading && !list.isError && goals.length > 0 ? (
        <View style={[styles.summaryRow, { gap: spacing.sm }]}>
          <MetricTile
            icon={<Trophy size={14} color={colors.primary} strokeWidth={2} />}
            label="Hoàn thành"
            value={`${completedCount}/${goals.length}`}
            style={styles.flex}
          />
          <MetricTile
            icon={<Target size={14} color={colors.primary} strokeWidth={2} />}
            label="Đang theo dõi"
            value={goals.length}
            unit="mục tiêu"
            style={styles.flex}
          />
        </View>
      ) : null}

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
            <SkeletonLoader width="50%" height={18} />
            <SkeletonLoader width="100%" height={10} />
            <SkeletonLoader width="60%" height={14} />
          </Card>
          <Card style={{ gap: spacing.sm }}>
            <SkeletonLoader width="45%" height={18} />
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
          refreshControl={
            <RefreshControl
              refreshing={list.isRefetching}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
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
  flex: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryRow: {
    flexDirection: 'row',
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBadge: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  presetChip: {
    minHeight: 36,
    borderWidth: 1,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  twoCol: {
    flexDirection: 'row',
  },
  row: {
    flexDirection: 'row',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pctPill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  track: {
    height: 10,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionBtn: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
