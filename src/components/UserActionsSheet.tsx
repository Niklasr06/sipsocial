/**
 * Small "..." menu that opens a sheet with block + report actions for one
 * other user. Sits inside any screen header — pass the user to act on and
 * the optional match id (used as report metadata so the moderator can find
 * the conversation).
 */

import React, { useState } from 'react';
import { Alert, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card } from './';
import { colors, fonts, radius, spacing, typography } from '../theme';
import { blockApi, REPORT_REASON_LABELS, ReportReason } from '../services/blockApi';
import { isApiUnavailable } from '../services/apiClient';

interface Props {
  /** Pseudonym shown in the dialog ("X melden?"). */
  pseudonym: string;
  /** Backend id of the user being acted on. */
  userId: string;
  /** Optional match id — attached to reports for context. */
  matchId?: string;
  /** Called after a successful block so the parent can navigate away / refresh. */
  onBlocked?: () => void;
}

const REASONS: ReportReason[] = ['harassment', 'spam', 'inappropriate', 'no_show', 'fake_profile', 'other'];

export const UserActionsSheet: React.FC<Props> = ({ pseudonym, userId, matchId, onBlocked }) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'menu' | 'report'>('menu');
  const [reason, setReason] = useState<ReportReason>('inappropriate');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setOpen(false);
    setMode('menu');
    setReason('inappropriate');
    setDetails('');
    setError(null);
  };

  const doBlock = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await blockApi.block(userId);
      close();
      onBlocked?.();
    } catch (err) {
      if (isApiUnavailable(err)) {
        setError('Backend nicht erreichbar.');
      } else {
        setError(err instanceof Error ? err.message : 'Block fehlgeschlagen.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const confirmBlock = () => {
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if (typeof window !== 'undefined' && window.confirm(`${pseudonym} blockieren? Ihr seht euch nicht mehr in Matches.`)) {
        void doBlock();
      }
      return;
    }
    Alert.alert(
      `${pseudonym} blockieren?`,
      'Ihr seht euch nicht mehr in Match-Vorschlägen. Du kannst die Blockierung später im Profil aufheben.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Blockieren', style: 'destructive', onPress: doBlock },
      ],
    );
  };

  const submitReport = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await blockApi.report({ reportedId: userId, reason, details, matchId });
      close();
      // Reports auto-block on the backend, so trigger the same callback.
      onBlocked?.();
    } catch (err) {
      if (isApiUnavailable(err)) {
        setError('Backend nicht erreichbar.');
      } else {
        setError(err instanceof Error ? err.message : 'Meldung fehlgeschlagen.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={10}
        style={({ pressed }) => [styles.trigger, pressed && { opacity: 0.7 }]}
        accessibilityLabel={`Aktionen für ${pseudonym}`}
      >
        <Ionicons name="ellipsis-horizontal" size={20} color={colors.textDark} />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close} />
        <View style={styles.sheet}>
          {mode === 'menu' ? (
            <>
              <Text style={styles.sheetTitle}>Aktionen für {pseudonym}</Text>
              <Pressable onPress={confirmBlock} style={styles.menuRow}>
                <Ionicons name="ban-outline" size={20} color={colors.error} />
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={styles.menuRowTitle}>Blockieren</Text>
                  <Text style={styles.menuRowDesc}>
                    Ihr seht euch nicht mehr in Match-Vorschlägen.
                  </Text>
                </View>
              </Pressable>
              <Pressable onPress={() => setMode('report')} style={styles.menuRow}>
                <Ionicons name="flag-outline" size={20} color={colors.warning ?? colors.error} />
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={styles.menuRowTitle}>Melden</Text>
                  <Text style={styles.menuRowDesc}>
                    Hinweis ans Team. Blockiert die Person automatisch mit.
                  </Text>
                </View>
              </Pressable>
              {error ? (
                <Text style={[typography.small, { color: colors.error, marginTop: spacing.sm }]}>
                  {error}
                </Text>
              ) : null}
              <Button label="Abbrechen" variant="secondary" fullWidth onPress={close} style={{ marginTop: spacing.md }} />
            </>
          ) : (
            <>
              <Text style={styles.sheetTitle}>{pseudonym} melden</Text>
              <Text style={[typography.small, { color: colors.textSecondary }]}>
                Wir prüfen die Meldung. Die Person wird gleichzeitig blockiert.
              </Text>

              <Text style={[typography.caption, styles.fieldLabel]}>Grund</Text>
              <View style={styles.reasonGrid}>
                {REASONS.map((r) => {
                  const selected = reason === r;
                  return (
                    <Pressable
                      key={r}
                      onPress={() => setReason(r)}
                      style={[styles.reasonChip, selected && styles.reasonChipSelected]}
                    >
                      <Text style={[styles.reasonChipText, selected && { color: '#fff' }]}>
                        {REPORT_REASON_LABELS[r]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[typography.caption, styles.fieldLabel]}>Details (optional)</Text>
              <TextInput
                value={details}
                onChangeText={setDetails}
                placeholder="Was ist passiert?"
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={1000}
                style={styles.textArea}
              />

              {error ? (
                <Text style={[typography.small, { color: colors.error, marginTop: spacing.sm }]}>
                  {error}
                </Text>
              ) : null}

              <Card tone="cream" padding="sm" style={{ marginTop: spacing.md }}>
                <Text style={[typography.small, { color: colors.textSecondary }]}>
                  Die Meldung wird an unser Team weitergeleitet. Bei akuter Gefahr wende dich an die Polizei (110).
                </Text>
              </Card>

              <Button
                label={submitting ? 'Sende…' : 'Meldung absenden'}
                variant="primary"
                fullWidth
                onPress={submitReport}
                loading={submitting}
                disabled={submitting}
                style={{ marginTop: spacing.md }}
              />
              <Button
                label="Zurück"
                variant="secondary"
                fullWidth
                onPress={() => setMode('menu')}
                style={{ marginTop: spacing.sm }}
              />
            </>
          )}
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  trigger: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.xl,
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '85%',
  },
  sheetTitle: {
    ...typography.h3,
    fontFamily: fonts.serif,
    color: colors.textDark,
    marginBottom: spacing.md,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  menuRowTitle: { ...typography.bodyStrong, color: colors.textDark },
  menuRowDesc: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
  fieldLabel: { color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.sm },
  reasonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  reasonChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  reasonChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  reasonChipText: { ...typography.small, color: colors.textDark, fontWeight: '600' },
  textArea: {
    ...typography.body,
    color: colors.textDark,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
