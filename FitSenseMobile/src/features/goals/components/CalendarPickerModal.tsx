import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import React, { memo, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTheme } from '../../../app/providers/ThemeProvider';
import { Button } from '../../../components/common';
import { tabularNums } from '../../../theme';
import { todayIsoDate } from '../../../utils/date';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] as const;

function parseIsoDate(iso: string): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (match) {
    return {
      year: Number(match[1]),
      month: Number(match[2]) - 1,
      day: Number(match[3]),
    };
  }
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth(),
    day: now.getDate(),
  };
}

function toIsoDate(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export interface CalendarPickerModalProps {
  visible: boolean;
  title: string;
  selectedDate: string;
  minDate?: string;
  allowClear?: boolean;
  onSelect: (isoDate: string) => void;
  onClear?: () => void;
  onClose: () => void;
}

/**
 * Theme-aware monthly calendar modal for picking ISO dates (yyyy-MM-dd)
 * without requiring native date-picker dependencies.
 */
export const CalendarPickerModal = memo(function CalendarPickerModal({
  visible,
  title,
  selectedDate,
  minDate,
  allowClear = false,
  onSelect,
  onClear,
  onClose,
}: CalendarPickerModalProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const today = todayIsoDate();

  const initial = parseIsoDate(selectedDate || minDate || today);
  const [viewYear, setViewYear] = useState(initial.year);
  const [viewMonth, setViewMonth] = useState(initial.month);

  useEffect(() => {
    if (visible) {
      const target = parseIsoDate(selectedDate || minDate || today);
      setViewYear(target.year);
      setViewMonth(target.month);
    }
  }, [visible, selectedDate, minDate, today]);

  const cells = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const mondayOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const grid: Array<{ day: number | null; iso: string | null }> = [];
    for (let i = 0; i < mondayOffset; i++) {
      grid.push({ day: null, iso: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      grid.push({ day: d, iso: toIsoDate(viewYear, viewMonth, d) });
    }
    while (grid.length % 7 !== 0) {
      grid.push({ day: null, iso: null });
    }
    return grid;
  }, [viewYear, viewMonth]);

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear(y => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear(y => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radius.xl,
              padding: spacing.lg,
              gap: spacing.md,
            },
          ]}>
          <View style={styles.headerRow}>
            <Text style={[typography.heading, { color: colors.text }]}>
              {title}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đóng lịch"
              onPress={onClose}
              style={({ pressed }) => [
                styles.iconBtn,
                { opacity: pressed ? 0.65 : 1 },
              ]}>
              <X size={20} color={colors.textMuted} strokeWidth={2} />
            </Pressable>
          </View>

          <View style={styles.monthNav}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tháng trước"
              onPress={goPrevMonth}
              style={({ pressed }) => [
                styles.navBtn,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderRadius: radius.md,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}>
              <ChevronLeft size={20} color={colors.text} strokeWidth={2} />
            </Pressable>

            <Text
              style={[
                typography.label,
                tabularNums,
                { color: colors.text },
              ]}>
              {`Tháng ${String(viewMonth + 1).padStart(2, '0')} / ${viewYear}`}
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tháng sau"
              onPress={goNextMonth}
              style={({ pressed }) => [
                styles.navBtn,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderRadius: radius.md,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}>
              <ChevronRight size={20} color={colors.text} strokeWidth={2} />
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAYS.map(wd => (
              <View key={wd} style={styles.dayCell}>
                <Text
                  style={[
                    typography.caption,
                    { color: colors.textMuted, fontWeight: '600' },
                  ]}>
                  {wd}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((cell, idx) => {
              if (!cell.day || !cell.iso) {
                return <View key={`empty-${idx}`} style={styles.dayCell} />;
              }
              const isSelected = cell.iso === selectedDate;
              const isToday = cell.iso === today;
              const isDisabled = Boolean(minDate && cell.iso < minDate);

              return (
                <Pressable
                  key={cell.iso}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected, disabled: isDisabled }}
                  disabled={isDisabled}
                  onPress={() => {
                    onSelect(cell.iso!);
                    onClose();
                  }}
                  style={({ pressed }) => [
                    styles.dayCell,
                    {
                      borderRadius: radius.pill,
                      backgroundColor: isSelected
                        ? colors.primary
                        : isToday
                          ? colors.primaryMuted
                          : 'transparent',
                      borderWidth: isToday && !isSelected ? 1 : 0,
                      borderColor: colors.primary,
                      opacity: isDisabled ? 0.3 : pressed ? 0.75 : 1,
                    },
                  ]}>
                  <Text
                    style={[
                      typography.body,
                      tabularNums,
                      {
                        color: isSelected
                          ? colors.onPrimary
                          : isToday
                            ? colors.primary
                            : colors.text,
                        fontWeight: isSelected || isToday ? '700' : '400',
                      },
                    ]}>
                    {cell.day}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={[styles.footerRow, { gap: spacing.sm }]}>
            <Button
              title="Hôm nay"
              variant="secondary"
              style={styles.flex}
              disabled={Boolean(minDate && today < minDate)}
              onPress={() => {
                onSelect(today);
                onClose();
              }}
            />
            {allowClear && selectedDate && onClear ? (
              <Button
                title="Xóa ngày"
                variant="ghost"
                onPress={() => {
                  onClear();
                  onClose();
                }}
              />
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthNav: {
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
  weekRow: {
    flexDirection: 'row',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.2857%',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerRow: {
    flexDirection: 'row',
  },
  flex: {
    flex: 1,
  },
});
