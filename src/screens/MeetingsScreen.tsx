import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { Avatar, Button, Card, Screen, StatusPill } from '../components';
import { colors, fonts, radius, spacing, typography } from '../theme';
import { useApp } from '../store/AppContext';
import { Meeting } from '../types';
import { formatDateLong, formatTimeRange, isPast } from '../utils/date';

type Tab = 'upcoming' | 'past' | 'cancelled';
type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Meetings'>,
  NativeStackScreenProps<RootStackParamList>
>;

const TAB_LABELS: { value: Tab; label: string }[] = [
  { value: 'upcoming', label: 'Geplant' },
  { value: 'past', label: 'Vergangen' },
  { value: 'cancelled', label: 'Abgesagt' },
];

const MeetingsScreen: React.FC<Props> = ({ navigation }) => {
  const { meetings, cancelMeeting } = useApp();
  const [tab, setTab] = useState<Tab>('upcoming');

  const filtered = useMemo(() => {
    if (tab === 'cancelled') {
      return meetings.filter((m) => m.status === 'cancelled');
    }
    if (tab === 'past') {
      return meetings.filter(
        (m) =>
          m.status !== 'cancelled' &&
          (m.status === 'completed' || m.status === 'no_show' || isPast(m.date, m.endTime)),
      );
    }
    return meetings.filter(
      (m) =>
        m.status !== 'cancelled' &&
        m.status !== 'completed' &&
        m.status !== 'no_show' &&
        !isPast(m.date, m.endTime),
    );
  }, [meetings, tab]);

  return (
    <Screen>
      <Text style={styles.title}>Treffen</Text>
      <Text style={[typography.body, { color: colors.textSecondary, marginTop: 6 }]}>
        Übersicht aller bestätigten Vorschläge — vor und nach dem Kaffee.
      </Text>

      <View style={styles.tabs}>
        {TAB_LABELS.map((t) => {
          const active = tab === t.value;
          return (
            <Pressable
              key={t.value}
              onPress={() => setTab(t.value)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Text
                style={[
                  typography.bodyStrong,
                  { color: active ? '#fff' : colors.textSecondary, fontSize: 14 },
                ]}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {filtered.length === 0 ? (
        <Card tone="white" padding="lg" style={{ marginTop: spacing.lg }}>
          <Text style={[typography.bodyStrong, { color: colors.textDark }]}>
            Hier ist noch nichts.
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: 4 }]}>
            {tab === 'upcoming'
              ? 'Aktuell keine geplanten Treffen. Schau bei den Vorschlägen rein.'
              : tab === 'past'
              ? 'Sobald ihr ein Treffen hattet, taucht es hier auf.'
              : 'Du hast bisher keine Treffen abgesagt.'}
          </Text>
          {tab === 'upcoming' ? (
            <Button
              label="Zu den Vorschlägen"
              variant="secondary"
              size="md"
              onPress={() => navigation.navigate('Matches')}
              style={{ marginTop: spacing.md, alignSelf: 'flex-start' }}
            />
          ) : null}
        </Card>
      ) : (
        filtered.map((m) => (
          <MeetingCard
            key={m.id}
            meeting={m}
            onOpenChat={(matchId) => navigation.navigate('LimitedChat', { matchId })}
            onCheckIn={() => navigation.navigate('QRCheckIn', { meetingId: m.id })}
            onCancel={() => cancelMeeting(m.id)}
            canCancel={tab === 'upcoming'}
          />
        ))
      )}
    </Screen>
  );
};

interface MeetingCardProps {
  meeting: Meeting;
  onOpenChat: (matchId: string) => void;
  onCheckIn: () => void;
  onCancel: () => void;
  canCancel: boolean;
}

const MeetingCard: React.FC<MeetingCardProps> = ({ meeting, onOpenChat, onCheckIn, onCancel, canCancel }) => {
  const { getCafe, getUser, matches, currentUser } = useApp();
  const cafe = getCafe(meeting.cafeId);
  const match = matches.find((m) => m.id === meeting.matchId);
  const otherId = match
    ? match.userAId === currentUser?.id
      ? match.userBId
      : match.userAId
    : '';
  const other = getUser(otherId);

  const statusInfo = STATUS_MAP[meeting.status] ?? STATUS_MAP.confirmed;

  return (
    <Card tone="white" padding="lg" style={{ marginTop: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {other ? <Avatar initials={other.initials} color={other.accentColor} size={44} /> : null}
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={[typography.bodyStrong, { color: colors.textDark }]}>
            {cafe?.name ?? 'Café'}
          </Text>
          <Text style={[typography.small, { color: colors.textSecondary }]}>
            {other ? `mit ${other.pseudonym} · ` : ''}{cafe?.area}
          </Text>
        </View>
        <StatusPill label={statusInfo.label} tone={statusInfo.tone} />
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaCell}>
          <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.metaText}>{formatDateLong(meeting.date)}</Text>
        </View>
        <View style={styles.metaCell}>
          <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.metaText}>{formatTimeRange(meeting.startTime, meeting.endTime)}</Text>
        </View>
      </View>

      {meeting.status !== 'cancelled' && meeting.status !== 'completed' && meeting.status !== 'no_show' ? (
        <View style={styles.actions}>
          <Button
            label="Chat"
            variant="secondary"
            size="md"
            onPress={() => match && onOpenChat(match.id)}
            style={{ flex: 1, marginRight: spacing.sm }}
          />
          <Button
            label="Check-in"
            variant="primary"
            size="md"
            onPress={onCheckIn}
            style={{ flex: 1 }}
          />
        </View>
      ) : null}

      {canCancel && meeting.status !== 'cancelled' ? (
        <Pressable onPress={onCancel} style={{ marginTop: spacing.md, alignSelf: 'flex-start' }}>
          <Text style={[typography.small, { color: colors.error, fontWeight: '600' }]}>Treffen absagen</Text>
        </Pressable>
      ) : null}
    </Card>
  );
};

const STATUS_MAP: Record<Meeting['status'], { label: string; tone: 'success' | 'info' | 'warning' | 'muted' | 'danger' }> = {
  pending: { label: 'Vorgeschlagen', tone: 'info' },
  confirmed: { label: 'Bestätigt', tone: 'info' },
  one_checked_in: { label: 'Ein Check-in', tone: 'warning' },
  both_checked_in: { label: 'Beide eingecheckt', tone: 'success' },
  completed: { label: 'Abgeschlossen', tone: 'success' },
  cancelled: { label: 'Abgesagt', tone: 'muted' },
  no_show: { label: 'No-Show', tone: 'danger' },
};

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.serif,
    fontSize: 30,
    lineHeight: 36,
    color: colors.textDark,
    marginTop: spacing.sm,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 4,
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: radius.lg },
  tabActive: { backgroundColor: colors.primary },
  metaRow: { flexDirection: 'row', marginTop: spacing.md, gap: spacing.lg, flexWrap: 'wrap' },
  metaCell: { flexDirection: 'row', alignItems: 'center' },
  metaText: { ...typography.small, color: colors.textSecondary, marginLeft: 6 },
  actions: { flexDirection: 'row', marginTop: spacing.lg },
});

export default MeetingsScreen;
