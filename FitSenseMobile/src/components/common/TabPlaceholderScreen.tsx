import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';
import { Card } from '../../components/common';

interface TabPlaceholderProps {
  title: string;
  subtitle: string;
  icon: string;
  owner: 'A' | 'B';
}

export const TabPlaceholderScreen: React.FC<TabPlaceholderProps> = ({
  title,
  subtitle,
  icon,
  owner,
}) => {
  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={[typography.h2, styles.title]}>{title}</Text>
        <Text style={[typography.body, styles.subtitle]}>{subtitle}</Text>
        <View style={styles.badge}>
          <Text style={[typography.captionBold, styles.badgeText]}>
            Owner: Dev {owner} (Đang hoàn thiện)
          </Text>
        </View>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  icon: {
    fontSize: 56,
    marginBottom: spacing.md,
  },
  title: {
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surfaceLight,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeText: {
    color: colors.primary,
  },
});
