import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Avatar, Button, Card, EmptyState, Header, ScoreBadge, Screen, StatusPill } from '../components';
import { colors, fonts, radius, spacing, typography } from '../theme';
import { useApp } from '../store/AppContext';
import { formatDateLong, formatTimeRange } from '../utils/date';
import { INTEREST_EMOJI } from '../data/interests';
import { Match } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Matches'>;

const MatchScreen: React.FC<Props> = ({ navigation }) => {
  const { matches, fetchMatches, getUser, getCafe, cancelMatch, currentUser, availabilities } = useApp();
  const myAvailCount = currentUser
    ? availabilities.filter((a) => a.userId === currentUser.id).length
    : 0;

  useEffect(() => {
    if (matches.length === 0) fetchMatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = matches.filter((m) => m.status !== 'declined');
  const open = visible.filter((m) => m.status === 'suggested' || m.status === 'proposed');
  const handled = visible.filter((m) => m.status === 'accepted');

  return (
    <Screen onRefresh={() => fetchMatches().catch(() => null)}>
      <Header
        onBack={() => navigation.goBack()}
        title="Matches"
        rightSlot={
          <Button
            label="Aktualisieren"
            variant="ghost"
            size="md"
            onPress={() => fetchMatches()}
            iconLeft={<Ionicons name="refresh" size={16} color={colors.primary} />}
          />
        }
      />
      <Text style={[typography.body, styles.subline]}>
        Vorschläge basieren auf Zeit, Bereich, Interessen und Treffenstyp.
      </Text>

      {open.length === 0 ? (
        myAvailCount === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title="Du hast noch keine Verfügbarkeit"
            description="Trag mind. ein Zeitfenster ein — wir suchen dann passende Cafés und Menschen in deinem Bereich."
            primaryActionLabel="Verfügbarkeit hinzufügen"
            onPrimaryAction={() => navigation.navigate('AvailabilityEdit')}
          />
        ) : (
          <EmptyState
            icon="sparkles-outline"
            title="Aktuell keine offenen Vorschläge"
            description="Mehr Zeitfenster oder andere Bereiche erhöhen die Chance auf Matches."
            primaryActionLabel="Verfügbarkeit erweitern"
            onPrimaryAction={() => navigation.navigate('AvailabilityEdit')}
            secondaryActionLabel="Erneut suchen"
            onSecondaryAction={() => fetchMatches()}
          />
        )
      ) : (
        open.map((m) => {
          const other = getUser(m.userBId);
          const cafe = getCafe(m.suggestedCafeId);
          if (!other || !cafe) return null;
          return (
            <MatchCard
              key={m.id}
              match={m}
              otherInitials={other.initials}
              otherColor={other.accentColor}
              otherPseudonym={other.pseudonym}
              otherAgeRange={other.ageRange}
              cafeName={cafe.name}
              cafeArea={cafe.area}
              onPropose={() => navigation.navigate('CafeSuggestion', { matchId: m.id })}
              onDecline={() => cancelMatch(m.id)}
            />
          );
        })
      )}

      {handled.length > 0 ? (
        <View style={{ marginTop: spacing.xxl }}>
          <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.md }]}>
            Bestätigte Matches
          </Text>
          {handled.map((m) => {
            const other = getUser(m.userBId);
            const cafe = getCafe(m.suggestedCafeId);
            if (!other || !cafe) return null;
            return (
              <Card key={m.id} tone="cream" padding="md" style={{ marginBottom: spacing.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Avatar initials={other.initials} color={other.accentColor} size={40} />
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text style={[typography.bodyStrong, { color: colors.textDark }]}>
                      {other.pseudonym}
                    </Text>
                    <Text style={[typography.small, { color: colors.textSecondary }]}>
                      {cafe.name} · {m.suggestedStartTime}
                    </Text>
                  </View>
                  <StatusPill label="Bestätigt" tone="success" />
                </View>
              </Card>
            );
          })}
        </View>
      ) : null}
    </Screen>
  );
};

interface MatchCardProps {
  match: Match;
  otherInitials: string;
  otherColor: string;
  otherPseudonym: string;
  otherAgeRange: string;
  cafeName: string;
  cafeArea: string;
  onPropose: () => void;
  onDecline: () => void;
}

const MatchCard: React.FC<MatchCardProps> = ({
  match,
  otherInitials,
  otherColor,
  otherPseudonym,
  otherAgeRange,
  cafeName,
  cafeArea,
  onPropose,
  onDecline,
}) => {
  return (
    <Card tone="white" padding="lg" style={{ marginBottom: spacing.lg }}>
      <View style={styles.top}>
        <Avatar initials={otherInitials} color={otherColor} size={58} />
        <View style={{ flex: 1, marginLeft: spacing.lg }}>
          <Text style={[typography.h3, { color: colors.textDark }]}>{otherPseudonym}</Text>
          <Text style={[typography.small, { color: colors.textSecondary }]}>
            {otherAgeRange} · {cafeArea}
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 6 }]}>
            {match.meetingPreference === 'one_on_one'
              ? '1:1 Treffen'
              : match.meetingPreference === 'group'
              ? 'Kleine Gruppe'
              : '1:1 oder Gruppe'}
          </Text>
        </View>
        <ScoreBadge score={match.score} size={72} />
      </View>

      <View style={styles.reasons}>
        <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 6 }]}>
          Warum dieses Match?
        </Text>
        {match.reasons.map((r) => (
          <View key={r.label} style={styles.reasonRow}>
            <View style={styles.reasonDot} />
            <Text style={[typography.small, { color: colors.textDark, flex: 1 }]}>{r.detail}</Text>
          </View>
        ))}
      </View>

      {match.sharedInterests.length > 0 ? (
        <View style={styles.interestRow}>
          {match.sharedInterests.slice(0, 4).map((i) => (
            <View key={i} style={styles.interestPill}>
              <Text style={styles.interestText}>
                {INTEREST_EMOJI[i] ?? ''} {i}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.cafeRow}>
        <Ionicons name="cafe-outline" size={16} color={colors.primary} />
        <Text style={[typography.small, { color: colors.textDark, marginLeft: 6 }]}>
          {cafeName}
        </Text>
      </View>
      <Text style={[typography.small, { color: colors.textSecondary, marginTop: 4 }]}>
        {formatDateLong(match.suggestedDate)} · {formatTimeRange(match.suggestedStartTime, match.suggestedEndTime)}
      </Text>

      <View style={styles.actions}>
        <Button
          label="Ablehnen"
          variant="ghost"
          size="md"
          onPress={onDecline}
          style={{ flex: 1, marginRight: spacing.sm }}
        />
        <Button
          label="Treffen vorschlagen"
          variant="primary"
          size="md"
          onPress={onPropose}
          style={{ flex: 1.4 }}
        />
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 30,
    lineHeight: 36,
    color: colors.textDark,
  },
  subline: { color: colors.textSecondary, marginTop: 6 },
  top: { flexDirection: 'row', alignItems: 'center' },
  reasons: {
    marginTop: spacing.lg,
    backgroundColor: colors.surfaceAlt,
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  reasonRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  reasonDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 8,
    marginRight: 10,
  },
  interestRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
  },
  interestPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  interestText: { ...typography.small, color: colors.textDark, fontWeight: '600' },
  cafeRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg },
  actions: { flexDirection: 'row', marginTop: spacing.lg, alignItems: 'center' },
});

export default MatchScreen;
