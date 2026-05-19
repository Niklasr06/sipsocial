import React from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { Avatar, Button, Card, Screen, StatusPill } from '../components';
import { colors, fonts, radius, spacing, typography } from '../theme';
import { useApp } from '../store/AppContext';
import { userApi } from '../services/userApi';
import { ApiError, isApiUnavailable } from '../services/apiClient';
import { calculateTrustStatus } from '../services/noShowService';
import { INTEREST_EMOJI } from '../data/interests';
import { formatDateLong, formatTimeRange } from '../utils/date';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Profile'>,
  NativeStackScreenProps<RootStackParamList>
>;

const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { currentUser, availabilities, signOut, deleteAccount } = useApp();
  if (!currentUser) return null;

  const myAvs = availabilities
    .filter((a) => a.userId === currentUser.id)
    .sort((a, b) => (a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date)));
  const nextAv = myAvs[0];
  const trust = calculateTrustStatus(currentUser.noShowCount);

  const onLogout = async () => {
    await signOut();
  };

  const onExportData = async () => {
    try {
      const data = await userApi.exportMe();
      const json = JSON.stringify(data, null, 2);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        // Im Web: Blob + temp-Link triggert „Download as file".
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sipsocial-meine-daten-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } else {
        // Native: zeig dem User die ersten Zeilen plus Hinweis. Echtes
        // Speichern via expo-file-system / expo-sharing wäre der nächste
        // Schritt — fürs MVP reicht's, dass die Daten verfügbar sind.
        Alert.alert(
          'Datenkopie bereit',
          `${json.length} Zeichen JSON. Eine native Speichern/Teilen-Funktion folgt — bis dahin kannst du den Export über die Web-Version unter sipsocial.vercel.app abrufen.`,
        );
      }
    } catch (err) {
      const reason = isApiUnavailable(err)
        ? 'Backend nicht erreichbar.'
        : err instanceof ApiError
        ? err.detail ?? err.message
        : 'Export fehlgeschlagen.';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        // eslint-disable-next-line no-alert
        window.alert(reason);
      } else {
        Alert.alert('Fehler', reason);
      }
    }
  };

  const onDeleteAccount = () => {
    const doDelete = () => {
      void deleteAccount();
    };
    const title = 'Account wirklich löschen?';
    const body =
      'Dein Profil, alle Matches, Chats, Treffen, Blockierungen und Meldungen werden unwiderruflich gelöscht. Du kannst dich danach erneut registrieren — aber die Daten sind weg.';
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${body}`)) {
        doDelete();
      }
      return;
    }
    Alert.alert(title, body, [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Endgültig löschen', style: 'destructive', onPress: doDelete },
    ]);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Avatar initials={currentUser.initials} color={currentUser.accentColor} size={92} border />
        <Text style={styles.name}>{currentUser.pseudonym}</Text>
        <Text style={[typography.small, { color: colors.textSecondary }]}>
          {currentUser.ageRange} · Pseudonym
        </Text>
        <View style={{ marginTop: spacing.sm }}>
          <StatusPill
            label={trust.title}
            tone={
              trust.level === 'none'
                ? 'success'
                : trust.level === 'soft_warning'
                ? 'info'
                : trust.level === 'limited_matches'
                ? 'warning'
                : 'danger'
            }
          />
        </View>
      </View>

      {currentUser.bio ? (
        <Card tone="white" padding="md" style={{ marginTop: spacing.xl }}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Über dich</Text>
          <Text style={[typography.body, { color: colors.textDark, marginTop: 4 }]}>{currentUser.bio}</Text>
        </Card>
      ) : null}

      <Card tone="white" padding="md" style={{ marginTop: spacing.md }}>
        <View style={styles.cardHeader}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Interessen</Text>
          <Text style={[typography.small, { color: colors.textSecondary }]}>
            {currentUser.interests.length} ausgewählt
          </Text>
        </View>
        <View style={styles.interestRow}>
          {currentUser.interests.map((i) => (
            <View key={i} style={styles.interestPill}>
              <Text style={styles.interestText}>
                {INTEREST_EMOJI[i] ?? ''} {i}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <Card tone="white" padding="md" style={{ marginTop: spacing.md }}>
        <View style={styles.cardHeader}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Treffenstyp</Text>
        </View>
        <Text style={[typography.bodyStrong, { color: colors.textDark, marginTop: 2 }]}>
          {currentUser.meetingPreference === 'one_on_one'
            ? '1:1 Treffen'
            : currentUser.meetingPreference === 'group'
            ? 'Kleine Gruppe'
            : '1:1 oder Gruppe'}
        </Text>
      </Card>

      <Card tone="cream" padding="md" style={{ marginTop: spacing.md }}>
        <View style={styles.cardHeader}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            Verfügbarkeiten ({myAvs.length})
          </Text>
          <Pressable onPress={() => navigation.navigate('AvailabilityEdit')}>
            <Text style={[typography.small, { color: colors.primary, fontWeight: '600' }]}>Verwalten</Text>
          </Pressable>
        </View>
        {nextAv ? (
          <>
            <Text style={[typography.bodyStrong, { color: colors.textDark, marginTop: 4 }]}>
              {formatDateLong(nextAv.date)}
            </Text>
            <Text style={[typography.small, { color: colors.textSecondary, marginTop: 2 }]}>
              {formatTimeRange(nextAv.startTime, nextAv.endTime)} · {nextAv.area}
            </Text>
            {myAvs.length > 1 ? (
              <Text style={[typography.small, { color: colors.textMuted, marginTop: 6 }]}>
                + {myAvs.length - 1} weitere
              </Text>
            ) : null}
          </>
        ) : (
          <Text style={[typography.body, { color: colors.textSecondary }]}>Keine Verfügbarkeit hinterlegt.</Text>
        )}
      </Card>

      <Card tone="white" padding="md" style={{ marginTop: spacing.md }}>
        <View style={styles.cardHeader}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Datenschutz</Text>
        </View>
        <PrivacyRow label="Nur Bereich teilen" value={currentUser.privacySettings.shareOnlyArea} />
        <PrivacyRow label="Bio verbergen" value={currentUser.privacySettings.hideBio} />
      </Card>

      <View style={{ marginTop: spacing.xxl, gap: spacing.sm }}>
        <Button
          label="Profil bearbeiten"
          variant="primary"
          fullWidth
          onPress={() => navigation.navigate('ProfileEdit')}
          iconLeft={<Ionicons name="create-outline" size={18} color="#fff" />}
        />
        <Button
          label="Verfügbarkeit verwalten"
          variant="secondary"
          fullWidth
          onPress={() => navigation.navigate('AvailabilityEdit')}
          iconLeft={<Ionicons name="calendar-outline" size={18} color={colors.textDark} />}
        />
        <Button
          label="Vertrauensstatus ansehen"
          variant="secondary"
          fullWidth
          onPress={() => navigation.navigate('NoShow')}
        />
        <Button
          label="Sicherheit & Datenschutz"
          variant="secondary"
          fullWidth
          onPress={() => navigation.navigate('Safety')}
          iconLeft={<Ionicons name="shield-checkmark-outline" size={18} color={colors.textDark} />}
        />
        <Button
          label="Meine Daten exportieren"
          variant="secondary"
          fullWidth
          onPress={onExportData}
          iconLeft={<Ionicons name="download-outline" size={18} color={colors.textDark} />}
        />
        <Button label="Abmelden" variant="ghost" fullWidth onPress={onLogout} />

        <View style={styles.legalRow}>
          <Text
            style={styles.legalLink}
            onPress={() => navigation.navigate('Legal', { document: 'nutzungsbedingungen' })}
          >
            Nutzungsbedingungen
          </Text>
          <Text style={styles.legalDot}>·</Text>
          <Text
            style={styles.legalLink}
            onPress={() => navigation.navigate('Legal', { document: 'datenschutz' })}
          >
            Datenschutz
          </Text>
          <Text style={styles.legalDot}>·</Text>
          <Text
            style={styles.legalLink}
            onPress={() => navigation.navigate('Legal', { document: 'impressum' })}
          >
            Impressum
          </Text>
        </View>

        <Pressable onPress={onDeleteAccount} style={styles.deleteLink} hitSlop={8}>
          <Text style={styles.deleteLinkText}>Account löschen</Text>
        </Pressable>
      </View>
    </Screen>
  );
};

const PrivacyRow: React.FC<{ label: string; value: boolean }> = ({ label, value }) => (
  <View style={styles.privacyRow}>
    <Text style={[typography.body, { color: colors.textDark }]}>{label}</Text>
    <Ionicons
      name={value ? 'checkmark-circle' : 'close-circle-outline'}
      size={20}
      color={value ? colors.success : colors.textMuted}
    />
  </View>
);

const styles = StyleSheet.create({
  header: { alignItems: 'center', paddingTop: spacing.md },
  name: {
    fontFamily: fonts.serif,
    fontSize: 28,
    lineHeight: 32,
    color: colors.textDark,
    marginTop: spacing.md,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  interestRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.sm },
  interestPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  interestText: { ...typography.small, color: colors.textDark, fontWeight: '600' },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  deleteLink: {
    alignSelf: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  deleteLinkText: {
    ...typography.small,
    color: colors.error,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  legalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  legalLink: {
    fontSize: 12,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
  legalDot: {
    fontSize: 12,
    color: colors.textMuted,
    paddingHorizontal: 6,
  },
});

export default ProfileScreen;
