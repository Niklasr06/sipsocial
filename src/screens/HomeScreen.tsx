import React, { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { Avatar, Button, Card, SafetyCard, Screen, StatusPill } from '../components';
import { colors, fonts, radius, shadow, spacing, typography } from '../theme';
import { useApp } from '../store/AppContext';
import { formatDateLong, formatTimeRange, isPast } from '../utils/date';
import { INTEREST_EMOJI } from '../data/interests';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const {
    currentUser,
    availabilities,
    matches,
    meetings,
    fetchMatches,
    getCafe,
    getUser,
  } = useApp();

  // First-render: ensure matches are present
  useEffect(() => {
    if (matches.length === 0) {
      fetchMatches();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const myAvailability = useMemo(
    () => (currentUser ? availabilities.find((a) => a.userId === currentUser.id) : undefined),
    [availabilities, currentUser],
  );

  if (!currentUser) return null;

  const activeMatches = matches.filter((m) => m.status === 'suggested' || m.status === 'proposed');
  const upcomingMeetings = meetings
    .filter((m) => m.status !== 'cancelled' && !isPast(m.date, m.endTime))
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  const nextMeeting = upcomingMeetings[0];

  const greeting = greetingForHour();

  return (
    <Screen onRefresh={() => fetchMatches().catch(() => null)}>
      <View style={styles.headerRow}>
        <View>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>{greeting}</Text>
          <Text style={styles.greeting}>{currentUser.pseudonym}</Text>
        </View>
        <Pressable
          onPress={() => navigation.navigate('Profile')}
          style={({ pressed }) => [pressed && { opacity: 0.85 }]}
        >
          <Avatar initials={currentUser.initials} color={currentUser.accentColor} size={52} />
        </Pressable>
      </View>

      {/* Match-finden Primary Action */}
      <Button
        label="Match finden"
        variant="primary"
        onPress={() => {
          fetchMatches();
          navigation.navigate('Matches');
        }}
        fullWidth
        style={{ marginTop: spacing.xl }}
        iconLeft={<Ionicons name="sparkles" size={18} color="#fff" />}
      />

      {/* Availability card */}
      <Card tone="white" padding="lg" style={styles.block}>
        <View style={styles.cardHeader}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Deine Verfügbarkeit</Text>
          <Pressable onPress={() => navigation.navigate('AvailabilityEdit')}>
            <Text style={[typography.small, { color: colors.primary, fontWeight: '600' }]}>Ändern</Text>
          </Pressable>
        </View>
        {myAvailability ? (
          <>
            <Text style={styles.cardTitle}>{formatDateLong(myAvailability.date)}</Text>
            <Text style={[typography.body, { color: colors.textSecondary, marginTop: 2 }]}>
              {formatTimeRange(myAvailability.startTime, myAvailability.endTime)} · {myAvailability.area}
            </Text>
          </>
        ) : (
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            Noch keine Verfügbarkeit hinterlegt.
          </Text>
        )}
      </Card>

      {/* Next meeting */}
      {nextMeeting ? (
        <Card tone="cream" padding="lg" style={styles.block}>
          <Text style={[typography.caption, { color: colors.primary }]}>Nächstes Treffen</Text>
          <NextMeetingBody meeting={nextMeeting} navigation={navigation} />
        </Card>
      ) : null}

      {/* Safety */}
      <View style={{ marginTop: spacing.xxl }}>
        <SafetyCard
          title="Du hast die Kontrolle"
          description="Standort als Bereich, Pseudonym statt Klarname, Chat erst nach Match. Mehr im Sicherheits-Bereich."
        />
      </View>
    </Screen>
  );
};

const NextMeetingBody: React.FC<{
  meeting: ReturnType<typeof useApp>['meetings'][number];
  navigation: Props['navigation'];
}> = ({ meeting, navigation }) => {
  const { getCafe, getUser, matches, currentUser } = useApp();
  const cafe = getCafe(meeting.cafeId);
  const match = matches.find((m) => m.id === meeting.matchId);
  const otherId = match ? (match.userAId === currentUser?.id ? match.userBId : match.userAId) : '';
  const other = getUser(otherId);
  return (
    <View style={{ marginTop: 6 }}>
      <Text style={styles.cardTitle}>
        {cafe?.name ?? 'Café'} · {meeting.startTime}
      </Text>
      <Text style={[typography.body, { color: colors.textSecondary, marginTop: 2 }]}>
        {formatDateLong(meeting.date)} {other ? `· mit ${other.pseudonym}` : ''}
      </Text>
      <View style={{ flexDirection: 'row', marginTop: spacing.lg, gap: spacing.sm, flexWrap: 'wrap' }}>
        <Button
          label="Chat öffnen"
          size="md"
          variant="secondary"
          onPress={() => match && navigation.navigate('LimitedChat', { matchId: match.id })}
        />
        <Button
          label="Check-in"
          size="md"
          variant="primary"
          onPress={() => navigation.navigate('QRCheckIn', { meetingId: meeting.id })}
        />
      </View>
      <View style={{ marginTop: spacing.md }}>
        <StatusPill
          label={meeting.status === 'both_checked_in' ? 'Beide eingecheckt' : meeting.status === 'one_checked_in' ? 'Ein Check-in' : 'Bestätigt'}
          tone={meeting.status === 'both_checked_in' ? 'success' : 'info'}
        />
      </View>
    </View>
  );
};

function greetingForHour(): string {
  const h = new Date().getHours();
  if (h < 11) return 'Guten Morgen,';
  if (h < 17) return 'Hallo,';
  return 'Guten Abend,';
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  greeting: {
    fontFamily: fonts.serif,
    fontSize: 28,
    lineHeight: 32,
    color: colors.textDark,
    marginTop: 4,
  },
  block: { marginTop: spacing.xl },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontFamily: fonts.serif,
    fontSize: 19,
    lineHeight: 24,
    color: colors.textDark,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  matchCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  matchTop: { flexDirection: 'row', alignItems: 'center' },
  scorePill: {
    backgroundColor: colors.primary,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scorePillText: { color: '#fff', fontWeight: '700', fontSize: 14, fontFamily: fonts.serif },
  matchBottom: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
});

export default HomeScreen;
