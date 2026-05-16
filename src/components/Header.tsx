import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme';

interface Props {
  title?: string;
  onBack?: () => void;
  rightSlot?: React.ReactNode;
  subtitle?: string;
}

export const Header: React.FC<Props> = ({ title, onBack, rightSlot, subtitle }) => {
  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        {onBack ? (
          <Pressable
            hitSlop={10}
            onPress={onBack}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.textDark} />
          </Pressable>
        ) : (
          <View style={styles.spacer} />
        )}
        <View style={styles.titleWrap}>
          {title ? <Text style={[typography.h3, styles.title]}>{title}</Text> : null}
          {subtitle ? <Text style={[typography.small, styles.subtitle]}>{subtitle}</Text> : null}
        </View>
        <View style={styles.right}>{rightSlot}</View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  spacer: { width: 40, height: 40 },
  titleWrap: { flex: 1, alignItems: 'center' },
  title: { color: colors.textDark },
  subtitle: { color: colors.textSecondary, marginTop: 2 },
  right: { minWidth: 40, alignItems: 'flex-end' },
});
