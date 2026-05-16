import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card } from './';
import { colors, radius, spacing, typography } from '../theme';

interface Props {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

/** Friendly empty-state card with optional icon + 1-2 calls-to-action. */
export const EmptyState: React.FC<Props> = ({
  icon = 'cafe-outline',
  title,
  description,
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
}) => {
  return (
    <Card tone="white" padding="lg" style={{ alignItems: 'center', marginTop: spacing.lg }}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={28} color={colors.primary} />
      </View>
      <Text style={[typography.bodyStrong, { color: colors.textDark, textAlign: 'center', marginTop: spacing.md }]}>
        {title}
      </Text>
      {description ? (
        <Text
          style={[
            typography.body,
            { color: colors.textSecondary, textAlign: 'center', marginTop: 6 },
          ]}
        >
          {description}
        </Text>
      ) : null}
      {primaryActionLabel && onPrimaryAction ? (
        <Button
          label={primaryActionLabel}
          variant="primary"
          size="md"
          onPress={onPrimaryAction}
          style={{ marginTop: spacing.lg }}
        />
      ) : null}
      {secondaryActionLabel && onSecondaryAction ? (
        <Button
          label={secondaryActionLabel}
          variant="secondary"
          size="md"
          onPress={onSecondaryAction}
          style={{ marginTop: spacing.sm }}
        />
      ) : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(122, 78, 45, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
