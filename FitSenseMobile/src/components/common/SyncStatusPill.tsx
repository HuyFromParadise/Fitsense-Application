import NetInfo from '@react-native-community/netinfo';
import { AlertCircle, CheckCircle2, Clock, RefreshCw, WifiOff } from 'lucide-react-native';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../app/providers/ThemeProvider';
import { syncManager } from '../../services/sync';
import { useSyncStatus } from '../../stores/useSyncStatus';
import { tabularNums } from '../../theme';

export interface SyncStatusPillProps {
  onRetry?: () => void;
}

/**
 * Compact header pill surfacing offline/sync state via icon + label
 * using granular Zustand selectors so parent screens do not over-render.
 */
export const SyncStatusPill = memo(function SyncStatusPill({ onRetry }: SyncStatusPillProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const pending = useSyncStatus(state => state.pending);
  const syncing = useSyncStatus(state => state.syncing);
  const lastError = useSyncStatus(state => state.lastError);
  const netInfo = NetInfo.useNetInfo();

  const isOffline = netInfo.isConnected === false || netInfo.isInternetReachable === false;

  let icon: React.ReactNode;
  let label: string;
  let textColor: string;
  let isRetryable = false;

  if (syncing) {
    icon = <RefreshCw size={14} color={colors.primary} strokeWidth={2.2} />;
    label = 'Đang đồng bộ…';
    textColor = colors.primary;
  } else if (lastError && !isOffline) {
    icon = <AlertCircle size={14} color={colors.danger} strokeWidth={2.2} />;
    label = 'Thử lại';
    textColor = colors.danger;
    isRetryable = true;
  } else if (isOffline) {
    icon = <WifiOff size={14} color={colors.warning} strokeWidth={2.2} />;
    label = pending > 0 ? `Offline • ${pending} chờ` : 'Offline';
    textColor = colors.warning;
  } else if (pending > 0) {
    icon = <Clock size={14} color={colors.warning} strokeWidth={2.2} />;
    label = `${pending} chờ đồng bộ`;
    textColor = colors.warning;
  } else {
    icon = <CheckCircle2 size={14} color={colors.success} strokeWidth={2.2} />;
    label = 'Đã đồng bộ';
    textColor = colors.success;
  }

  const content = (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: colors.surfaceAlt,
          borderColor: colors.border,
          borderRadius: radius.pill,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
          gap: spacing.xs,
        },
      ]}>
      {icon}
      <Text
        numberOfLines={1}
        style={[typography.caption, tabularNums, styles.label, { color: textColor }]}>
        {label}
      </Text>
    </View>
  );

  if (isRetryable) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Thử đồng bộ lại"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        onPress={() => {
          if (onRetry) {
            onRetry();
          } else {
            syncManager.retryFailed().catch(() => {});
          }
        }}>
        {content}
      </Pressable>
    );
  }

  return (
    <View accessibilityRole="text" accessibilityLabel={`Trạng thái đồng bộ: ${label}`}>
      {content}
    </View>
  );
});

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    flexShrink: 1,
  },
  label: {
    fontWeight: '600',
  },
});
