import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme';

interface Props {
  title: string;
  description: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export const SafetyCard: React.FC<Props> = ({
  title,
  description,
  icon = 'shield-checkmark-outline',
}) => {
  return (
    <View style={styles.wrapper}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={20} color={colors.success} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[typography.bodyStrong, { color: colors.textDark }]}>{title}</Text>
        <Text style={[typography.small, { color: colors.textSecondary, marginTop: 2 }]}>
          {description}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(111, 143, 114, 0.10)',
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(111, 143, 114, 0.25)',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(111, 143, 114, 0.20)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
});
