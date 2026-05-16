import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius } from '../theme';

interface Props {
  payload: string;
  size?: number;
}

const GRID = 17;

function hashString(input: string): number {
  let h = 5381;
  for (let i = 0; i < input.length; i += 1) {
    h = ((h << 5) + h) ^ input.charCodeAt(i);
  }
  return Math.abs(h);
}

// Deterministic faux-QR pattern derived from the payload. Visual only — not
// scannable. The matching real QR library can be dropped in later.
export const QRCodePlaceholder: React.FC<Props> = ({ payload, size = 220 }) => {
  const cells = useMemo(() => {
    const seed = hashString(payload || 'sip');
    const arr: boolean[] = [];
    for (let i = 0; i < GRID * GRID; i += 1) {
      const v = ((seed * 9301 + i * 49297) % 233280) / 233280;
      arr.push(v > 0.5);
    }
    return arr;
  }, [payload]);

  const cellSize = (size - 16) / GRID;

  const isFinder = (row: number, col: number) => {
    const inTopLeft = row < 7 && col < 7;
    const inTopRight = row < 7 && col >= GRID - 7;
    const inBottomLeft = row >= GRID - 7 && col < 7;
    return inTopLeft || inTopRight || inBottomLeft;
  };

  return (
    <View style={[styles.outer, { width: size, height: size }]}>
      {Array.from({ length: GRID }).map((_, row) => (
        <View key={row} style={styles.row}>
          {Array.from({ length: GRID }).map((__, col) => {
            const finder = isFinder(row, col);
            let on = cells[row * GRID + col];
            if (finder) {
              const r = Math.min(row, Math.abs(GRID - 1 - row));
              const c = Math.min(col, Math.abs(GRID - 1 - col));
              const innerR = row < 7 ? row : GRID - 1 - row;
              const innerC = col < 7 ? col : GRID - 1 - col;
              const outer = innerR === 0 || innerR === 6 || innerC === 0 || innerC === 6;
              const center = innerR >= 2 && innerR <= 4 && innerC >= 2 && innerC <= 4;
              on = outer || center;
            }
            return (
              <View
                key={col}
                style={{
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: on ? colors.textDark : 'transparent',
                }}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: 8,
    alignSelf: 'center',
  },
  row: { flexDirection: 'row' },
});
