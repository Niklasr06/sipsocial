import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme';

const ACK_KEY = '@sipsocial:storage_consent_ack:v1';

/**
 * Einmaliger Hinweis-Banner: wir speichern technisch notwendige Tokens
 * lokal (kein Tracking). Reine Information, keine Opt-In/Out-Logik —
 * technisch notwendige Speicherung braucht laut DSGVO/TTDSG keine
 * Einwilligung, aber Transparenz tut nicht weh.
 *
 * Wir zeigen den Banner nur, wenn ``ACK_KEY`` noch nicht gesetzt ist.
 */
export const StorageConsentBanner: React.FC<{
  onOpenPrivacy?: () => void;
}> = ({ onOpenPrivacy }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(ACK_KEY)
      .then((v) => {
        if (cancelled) return;
        if (!v) setVisible(true);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (!visible) return null;

  const acknowledge = () => {
    setVisible(false);
    AsyncStorage.setItem(ACK_KEY, '1').catch(() => undefined);
  };

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.card}>
        <View style={styles.row}>
          <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
          <Text style={styles.title}>Hinweis zur lokalen Speicherung</Text>
        </View>
        <Text style={styles.body}>
          SipSocial speichert auf diesem Gerät einen Login-Token, damit du nicht bei jedem
          App-Start neu einloggen musst. Wir nutzen keine Tracking-Cookies und teilen keine
          Daten mit Werbenetzwerken.
          {onOpenPrivacy ? ' Details findest du in der Datenschutzerklärung.' : ''}
        </Text>
        <View style={styles.actions}>
          {onOpenPrivacy ? (
            <Pressable onPress={onOpenPrivacy} style={styles.linkBtn} hitSlop={6}>
              <Text style={styles.linkText}>Datenschutz</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={acknowledge} style={styles.ackBtn} hitSlop={6}>
            <Text style={styles.ackText}>Verstanden</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: Platform.OS === 'ios' ? 28 : spacing.lg,
    zIndex: 9998,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.lg,
    shadowColor: '#2F241D',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 6,
  },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  title: {
    ...typography.bodyStrong,
    color: colors.textDark,
    marginLeft: spacing.sm,
  },
  body: {
    ...typography.small,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: spacing.md,
    gap: spacing.md,
  },
  linkBtn: { paddingVertical: 6 },
  linkText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  ackBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.pill,
  },
  ackText: {
    ...typography.small,
    color: '#fff',
    fontWeight: '700',
  },
});
