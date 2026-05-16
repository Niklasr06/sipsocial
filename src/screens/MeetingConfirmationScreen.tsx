import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Avatar, Button, Card, Header, SafetyCard, Screen } from '../components';
import { colors, fonts, radius, spacing, typography } from '../theme';
import { useApp } from '../store/AppContext';
import { formatDateLong, formatTimeRange } from '../utils/date';

type Props = NativeStackScreenProps<RootStackParamList, 'MeetingConfirmation'>;

const MeetingConfirmationScreen: React.FC<Props> = ({ navigation, route }) => {
  const { matchId } = route.params;
  const { matches, getCafe, getUser, confirmMatch, cancelMatch } = useApp();
  const match = matches.find((m) => m.id === matchId);

  if (!match) {
    return (
      <Screen>
        <Header onBack={() => navigation.goBack()} title="Bestätigung" />
        <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.lg }]}>
          Dieser Vorschlag ist nicht mehr verfügbar.
        </Text>
      </Screen>
    );
  }

  const cafe = getCafe(match.suggestedCafeId);
  const other = getUser(match.userBId);

  const onConfirm = () => {
    const meeting = confirmMatch(match.id);
    if (!meeting) return;
    navigation.reset({
      index: 1,
      routes: [
        { name: 'Main' as never },
        { name: 'QRCheckIn', params: { meetingId: meeting.id } },
      ],
    });
  };

  const onCancel = () => {
    cancelMatch(match.id);
    navigation.popToTop();
  };

  return (
    <Screen>
      <Header onBack={() => navigation.goBack()} title="Treffen bestätigen" />
      <Text style={styles.title}>Bereit für einen Kaffee?</Text>
      <Text style={styles.subline}>Prüf nochmal die Eckdaten — dann wird der Chat freigeschaltet.</Text>

      <Card tone="white" padding="lg" style={{ marginTop: spacing.xl }}>
        {other ? (
          <View style={styles.matchRow}>
            <Avatar initials={other.initials} color={other.accentColor} size={56} />
            <View style={{ flex: 1, marginLeft: spacing.lg }}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Mit</Text>
              <Text style={styles.otherName}>{other.pseudonym}</Text>
              <Text style={[typography.small, { color: colors.textSecondary, marginTop: 2 }]}>
                {other.ageRange} · {match.sharedInterests.length} gemeinsame Interessen
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.divider} />

        <DetailRow icon="cafe-outline" label="Café" value={cafe?.name ?? 'Café'} sub={cafe?.address} />
        <DetailRow icon="calendar-outline" label="Datum" value={formatDateLong(match.suggestedDate)} />
        <DetailRow
          icon="time-outline"
          label="Uhrzeit"
          value={formatTimeRange(match.suggestedStartTime, match.suggestedEndTime)}
        />
        <DetailRow
          icon="people-outline"
          label="Treffenstyp"
          value={
            match.meetingPreference === 'one_on_one'
              ? '1:1 Treffen'
              : match.meetingPreference === 'group'
              ? 'Kleine Gruppe'
              : '1:1 oder Gruppe'
          }
        />
      </Card>

      <SafetyCard
        title="So bleibt es sicher"
        description="Öffentliches Café, kein Klarname-Zwang, QR-Code Check-in vor Ort. Du kannst jederzeit absagen."
      />

      <View style={styles.actions}>
        <Button label="Absagen" variant="danger" onPress={onCancel} style={{ flex: 1, marginRight: spacing.sm }} />
        <Button label="Treffen bestätigen" variant="success" onPress={onConfirm} style={{ flex: 1.4 }} />
      </View>
    </Screen>
  );
};

const DetailRow: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  sub?: string;
}> = ({ icon, label, value, sub }) => (
  <View style={styles.detailRow}>
    <View style={styles.detailIcon}>
      <Ionicons name={icon} size={18} color={colors.primary} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[typography.bodyStrong, { color: colors.textDark, marginTop: 2 }]}>{value}</Text>
      {sub ? <Text style={[typography.small, { color: colors.textSecondary, marginTop: 2 }]}>{sub}</Text> : null}
    </View>
  </View>
);

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.serif,
    fontSize: 26,
    lineHeight: 32,
    color: colors.textDark,
    marginTop: spacing.sm,
  },
  subline: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
  matchRow: { flexDirection: 'row', alignItems: 'center' },
  otherName: {
    fontFamily: fonts.serif,
    fontSize: 22,
    lineHeight: 26,
    color: colors.textDark,
    marginTop: 2,
  },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.lg, opacity: 0.7 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    marginTop: spacing.xxl,
    alignItems: 'center',
  },
});

export default MeetingConfirmationScreen;
