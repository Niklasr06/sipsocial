import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme';

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  emoji?: string;
  size?: 'sm' | 'md';
  tone?: 'default' | 'success' | 'accent';
}

export const Chip: React.FC<Props> = ({
  label,
  selected,
  onPress,
  emoji,
  size = 'md',
  tone = 'default',
}) => {
  const interactive = !!onPress;
  const toneStyle = TONES[tone];

  return (
    <Pressable
      onPress={onPress}
      disabled={!interactive}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' && styles.small,
        selected ? toneStyle.selected : styles.unselected,
        pressed && interactive && { opacity: 0.85 },
      ]}
    >
      <View style={styles.row}>
        {emoji ? <Text style={styles.emoji}>{emoji}</Text> : null}
        <Text
          style={[
            size === 'sm' ? typography.small : typography.bodyStrong,
            { color: selected ? toneStyle.color : colors.textDark },
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1.2,
    alignSelf: 'flex-start',
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  small: { paddingVertical: 6, paddingHorizontal: spacing.md, borderRadius: radius.pill },
  unselected: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  emoji: { marginRight: 6, fontSize: 14 },
});

const TONES: Record<string, { selected: any; color: string }> = {
  default: {
    selected: { backgroundColor: colors.primary, borderColor: colors.primary },
    color: '#FFFFFF',
  },
  success: {
    selected: { backgroundColor: colors.success, borderColor: colors.success },
    color: '#FFFFFF',
  },
  accent: {
    selected: { backgroundColor: colors.accent, borderColor: colors.accent },
    color: '#FFFFFF',
  },
};
