import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Button, Card, Header, Screen, StatusPill } from '../components';
import { colors, fonts, radius, spacing, typography } from '../theme';
import { useApp } from '../store/AppContext';
import { generateIcebreakers, IcebreakerBundle } from '../services/icebreakerService';
import { icebreakerApi } from '../services/icebreakerApi';
import { isApiUnavailable } from '../services/apiClient';
import { INTEREST_EMOJI } from '../data/interests';

type Props = NativeStackScreenProps<RootStackParamList, 'Icebreakers'>;

interface FlatQuestion {
  interest: string;
  question: string;
}

const IcebreakerScreen: React.FC<Props> = ({ navigation, route }) => {
  const { matchId } = route.params;
  const { matches, currentUser, getUser, getMeetingByMatch } = useApp();
  const match = matches.find((m) => m.id === matchId);
  const otherId = match
    ? match.userAId === currentUser?.id
      ? match.userBId
      : match.userAId
    : '';
  const other = otherId ? getUser(otherId) : null;
  const meeting = match ? getMeetingByMatch(match.id) : undefined;

  const [bundles, setBundles] = useState<IcebreakerBundle[] | null>(null);
  const [source, setSource] = useState<'backend' | 'local'>('local');
  const [index, setIndex] = useState(0);

  const fallback = useMemo(
    () => (match ? generateIcebreakers(match.sharedInterests) : []),
    [match],
  );

  useEffect(() => {
    let cancelled = false;
    if (!match) return;
    icebreakerApi
      .forMatch(match.id, match.sharedInterests)
      .then((items) => {
        if (cancelled) return;
        const normalized: IcebreakerBundle[] = items.map((i) => ({
          id: i.id,
          interest: i.interest,
          questions: i.questions,
        }));
        if (normalized.length === 0) {
          setBundles(fallback);
          setSource('local');
        } else {
          setBundles(normalized);
          setSource('backend');
        }
      })
      .catch((err) => {
        if (cancelled) return;
        if (!isApiUnavailable(err)) {
          // Non-network error: still fall back gracefully.
        }
        setBundles(fallback);
        setSource('local');
      });
    return () => {
      cancelled = true;
    };
  }, [match, fallback]);

  if (!match) {
    return (
      <Screen>
        <Header onBack={() => navigation.goBack()} title="Icebreaker" />
        <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.lg }]}>
          Dieser Match ist nicht mehr verfügbar.
        </Text>
      </Screen>
    );
  }

  const flat: FlatQuestion[] = (bundles ?? fallback).flatMap((b) =>
    b.questions.map((q) => ({ interest: b.interest, question: q })),
  );

  const current = flat.length > 0 ? flat[index % flat.length] : null;
  const hasNext = flat.length > 1;

  return (
    <Screen>
      <Header
        onBack={() => navigation.goBack()}
        title="Icebreaker"
        subtitle={other ? `mit ${other.pseudonym}` : undefined}
      />
      <Text style={styles.title}>Passend zu euren gemeinsamen Interessen.</Text>
      <Text style={styles.subline}>
        Gesprächsimpulse fürs Treffen — der Chat bleibt bewusst kurz.
      </Text>

      <View style={{ marginTop: spacing.lg, flexDirection: 'row', flexWrap: 'wrap' }}>
        {match.sharedInterests.slice(0, 5).map((i) => (
          <View key={i} style={styles.interestPill}>
            <Text style={styles.interestText}>
              {INTEREST_EMOJI[i] ?? ''} {i}
            </Text>
          </View>
        ))}
      </View>

      {current ? (
        <Card tone="white" padding="lg" style={styles.questionCard}>
          <View style={styles.questionHeader}>
            <StatusPill label={current.interest} tone="info" />
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              {(index % flat.length) + 1} / {flat.length}
            </Text>
          </View>
          <Text style={styles.questionText}>„{current.question}"</Text>
          <Text style={[typography.small, { color: colors.textSecondary, marginTop: spacing.md }]}>
            {source === 'backend'
              ? 'Aus dem SipSocial-Server geladen.'
              : 'Lokal generiert — Backend offline.'}
          </Text>
        </Card>
      ) : (
        <Card tone="cream" padding="lg" style={styles.questionCard}>
          <Text style={[typography.bodyStrong, { color: colors.textDark }]}>
            Noch keine gemeinsamen Themen.
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: 4 }]}>
            Sobald euer Match echte Überschneidungen hat, gibt es hier passende Fragen.
          </Text>
        </Card>
      )}

      <Pressable
        onPress={() => setIndex((i) => i + 1)}
        disabled={!hasNext}
        style={({ pressed }) => [
          styles.nextBtn,
          !hasNext && { opacity: 0.4 },
          pressed && hasNext && { opacity: 0.85 },
        ]}
      >
        <Ionicons name="refresh" size={18} color="#fff" />
        <Text style={styles.nextBtnText}>Nächste Frage</Text>
      </Pressable>

      <View style={styles.footer}>
        <Button
          label="Zum Chat"
          variant="secondary"
          size="md"
          onPress={() => navigation.navigate('LimitedChat', { matchId: match.id })}
          style={{ flex: 1, marginRight: spacing.sm }}
          iconLeft={<Ionicons name="chatbubble-outline" size={16} color={colors.primary} />}
        />
        <Button
          label="Zum Treffen"
          variant="primary"
          size="md"
          onPress={() => {
            if (meeting) {
              navigation.navigate('QRCheckIn', { meetingId: meeting.id });
            } else {
              navigation.navigate('Main', { screen: 'Meetings' });
            }
          }}
          style={{ flex: 1 }}
          iconLeft={<Ionicons name="cafe-outline" size={16} color="#fff" />}
        />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.serif,
    fontSize: 26,
    lineHeight: 32,
    color: colors.textDark,
    marginTop: spacing.sm,
  },
  subline: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
  interestPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  interestText: { ...typography.small, color: colors.textDark, fontWeight: '600' },
  questionCard: { marginTop: spacing.lg },
  questionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  questionText: {
    fontFamily: fonts.serif,
    fontSize: 24,
    lineHeight: 32,
    color: colors.textDark,
    marginTop: spacing.md,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    paddingVertical: 14,
    marginTop: spacing.lg,
  },
  nextBtnText: { color: '#fff', fontWeight: '700', marginLeft: spacing.sm, fontSize: 15 },
  footer: { flexDirection: 'row', marginTop: spacing.lg, alignItems: 'center' },
});

export default IcebreakerScreen;
