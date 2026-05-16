import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';

interface Props {
  score: number;
  size?: number;
}

export const ScoreBadge: React.FC<Props> = ({ score, size = 64 }) => {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const tone =
    clamped >= 85 ? colors.success : clamped >= 70 ? colors.primary : colors.accent;

  return (
    <View
      style={[
        styles.outer,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: tone,
        },
      ]}
    >
      <View
        style={[
          styles.inner,
          {
            width: size - 8,
            height: size - 8,
            borderRadius: (size - 8) / 2,
            backgroundColor: tone,
          },
        ]}
      >
        <Text
          style={[
            styles.score,
            { fontFamily: fonts.serif, fontSize: size * 0.32 },
          ]}
        >
          {clamped}
        </Text>
        <Text style={styles.suffix}>Match</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    padding: 2,
  },
  inner: { alignItems: 'center', justifyContent: 'center' },
  score: { color: '#FFFFFF', fontWeight: '600', lineHeight: undefined },
  suffix: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: -2,
  },
});
