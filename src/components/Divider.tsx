import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '../theme';

interface Props {
  vertical?: boolean;
  spacingY?: number;
}

export const Divider: React.FC<Props> = ({ vertical, spacingY = spacing.md }) => {
  if (vertical) return <View style={styles.vertical} />;
  return <View style={[styles.horizontal, { marginVertical: spacingY }]} />;
};

const styles = StyleSheet.create({
  horizontal: { height: 1, backgroundColor: colors.border, opacity: 0.7 },
  vertical: { width: 1, alignSelf: 'stretch', backgroundColor: colors.border, opacity: 0.7 },
});
