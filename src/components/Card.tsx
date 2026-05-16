import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radius, shadow, spacing } from '../theme';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  tone?: 'white' | 'cream' | 'flat';
  padding?: keyof typeof paddings;
  elevated?: boolean;
}

const paddings = {
  none: 0,
  sm: spacing.md,
  md: spacing.lg,
  lg: spacing.xl,
  xl: spacing.xxl,
};

export const Card: React.FC<Props> = ({
  children,
  style,
  onPress,
  tone = 'white',
  padding = 'lg',
  elevated = true,
}) => {
  const Content = (
    <View
      style={[
        styles.base,
        tone === 'white' && styles.white,
        tone === 'cream' && styles.cream,
        tone === 'flat' && styles.flat,
        elevated && tone !== 'flat' && shadow.card,
        { padding: paddings[padding] },
        style,
      ]}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.9 }]}>
        {Content}
      </Pressable>
    );
  }
  return Content;
};

const styles = StyleSheet.create({
  base: { borderRadius: radius.xxl },
  white: { backgroundColor: colors.surface },
  cream: { backgroundColor: colors.surfaceAlt },
  flat: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
});
