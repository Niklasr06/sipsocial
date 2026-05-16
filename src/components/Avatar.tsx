import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';

interface Props {
  initials: string;
  color?: string;
  size?: number;
  border?: boolean;
}

export const Avatar: React.FC<Props> = ({ initials, color = colors.primary, size = 56, border }) => {
  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          borderWidth: border ? 3 : 0,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          { fontSize: size * 0.36, fontFamily: fonts.serif },
        ]}
      >
        {initials.slice(0, 2).toUpperCase()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#FFFFFF',
  },
  label: {
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
