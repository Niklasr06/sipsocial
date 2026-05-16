import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme';

export type StatusTone = 'success' | 'warning' | 'info' | 'muted' | 'danger';

interface Props {
  label: string;
  tone?: StatusTone;
}

const TONES: Record<StatusTone, { bg: string; color: string }> = {
  success: { bg: 'rgba(111, 143, 114, 0.15)', color: colors.success },
  warning: { bg: 'rgba(201, 152, 96, 0.18)', color: colors.warning },
  info: { bg: 'rgba(122, 78, 45, 0.12)', color: colors.primary },
  muted: { bg: 'rgba(123, 106, 92, 0.12)', color: colors.textSecondary },
  danger: { bg: 'rgba(184, 92, 74, 0.14)', color: colors.error },
};

export const StatusPill: React.FC<Props> = ({ label, tone = 'info' }) => {
  const t = TONES[tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }]}>
      <Text style={[typography.caption, { color: t.color }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
});
