import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { onSlowRequest } from '../services/apiClient';
import { colors, radius, spacing, typography } from '../theme';

/**
 * Erklärt dem User den langen Cold-Start vom Render Free Tier. Erscheint
 * sobald ein API-Request länger als 5s in der Luft ist, verschwindet,
 * sobald alle slow-Requests abgeschlossen sind.
 */
export const ColdStartBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => onSlowRequest((slowInFlight) => setVisible(slowInFlight > 0)), []);

  if (!visible) return null;

  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={styles.banner}>
        <Ionicons name="cloud-offline-outline" size={16} color={colors.textDark} />
        <Text style={styles.text}>Server wacht gerade auf — gleich geht's los.</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    shadowColor: '#2F241D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  text: {
    ...typography.small,
    color: colors.textDark,
    marginLeft: spacing.sm,
    fontWeight: '600',
  },
});
