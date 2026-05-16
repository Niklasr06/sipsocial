import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Button, Card, Chip, Header, Screen } from '../components';
import { colors, fonts, radius, spacing, typography } from '../theme';
import { useApp } from '../store/AppContext';
import { addDaysIso, formatDateLong, formatTimeRange, todayIso, toMinutes } from '../utils/date';

type Props = NativeStackScreenProps<RootStackParamList, 'MeetingReschedule'>;

const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];

const MeetingRescheduleScreen: React.FC<Props> = ({ navigation, route }) => {
  const { meetingId } = route.params;
  const { meetings, getCafe, rescheduleMeeting } = useApp();
  const meeting = meetings.find((m) => m.id === meetingId);
  const cafe = meeting ? getCafe(meeting.cafeId) : undefined;

  const dates = useMemo(() => Array.from({ length: 14 }, (_, i) => addDaysIso(todayIso(), i)), []);

  const [selectedDate, setSelectedDate] = useState(meeting?.date ?? dates[1]);
  const [startTime, setStartTime] = useState(meeting?.startTime ?? '15:00');
  const [endTime, setEndTime] = useState(meeting?.endTime ?? '17:00');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!meeting) {
    return (
      <Screen>
        <Header onBack={() => navigation.goBack()} title="Verschieben" />
        <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.lg }]}>
          Treffen nicht gefunden.
        </Text>
      </Screen>
    );
  }

  const isValidRange = toMinutes(endTime) > toMinutes(startTime);
  const isUnchanged =
    selectedDate === meeting.date && startTime === meeting.startTime && endTime === meeting.endTime;

  const onSubmit = async () => {
    if (!isValidRange || submitting || isUnchanged) return;
    setSubmitting(true);
    setError(null);
    const res = await rescheduleMeeting(meetingId, {
      date: selectedDate,
      startTime,
      endTime,
    });
    setSubmitting(false);
    if (res.ok) {
      navigation.goBack();
    } else {
      setError(res.reason ?? 'Konnte nicht verschoben werden.');
    }
  };

  return (
    <Screen>
      <Header onBack={() => navigation.goBack()} title="Treffen verschieben" subtitle={cafe?.name} />

      <Card tone="cream" padding="md" style={{ marginTop: spacing.md }}>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>Aktuell geplant</Text>
        <Text style={[typography.bodyStrong, { color: colors.textDark, marginTop: 4 }]}>
          {formatDateLong(meeting.date)}
        </Text>
        <Text style={[typography.small, { color: colors.textSecondary, marginTop: 2 }]}>
          {formatTimeRange(meeting.startTime, meeting.endTime)}
          {cafe ? ` · ${cafe.area}` : ''}
        </Text>
      </Card>

      <Text style={[typography.caption, styles.label]}>Neuer Tag</Text>
      <View style={styles.dateRowWrap}>
        {dates.map((d) => {
          const selected = d === selectedDate;
          return (
            <Pressable
              key={d}
              onPress={() => setSelectedDate(d)}
              style={[styles.dateCell, selected && styles.dateCellSelected]}
            >
              <Text style={[typography.small, { color: selected ? '#fff' : colors.textSecondary }]}>
                {formatDateLong(d).split(',')[0].slice(0, 2)}
              </Text>
              <Text
                style={[
                  typography.bodyStrong,
                  { color: selected ? '#fff' : colors.textDark, marginTop: 2 },
                ]}
              >
                {d.split('-')[2]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[typography.caption, styles.label]}>Neue Uhrzeit</Text>
      <Card tone="white" padding="md">
        <View style={styles.timeRow}>
          <View style={styles.timeBlock}>
            <Text style={[typography.small, { color: colors.textSecondary }]}>Start</Text>
            <Text style={styles.timeValue}>{startTime}</Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color={colors.textSecondary} />
          <View style={styles.timeBlock}>
            <Text style={[typography.small, { color: colors.textSecondary }]}>Ende</Text>
            <Text style={[styles.timeValue, !isValidRange && { color: colors.error }]}>{endTime}</Text>
          </View>
        </View>
        <Text style={[typography.small, styles.timeSubLabel]}>Startzeit</Text>
        <View style={styles.chipsWrap}>
          {TIME_SLOTS.map((t) => (
            <Chip key={'s' + t} label={t} size="sm" selected={startTime === t} onPress={() => setStartTime(t)} />
          ))}
        </View>
        <Text style={[typography.small, styles.timeSubLabel]}>Endzeit</Text>
        <View style={styles.chipsWrap}>
          {TIME_SLOTS.map((t) => (
            <Chip key={'e' + t} label={t} size="sm" selected={endTime === t} onPress={() => setEndTime(t)} />
          ))}
        </View>
      </Card>

      {error ? (
        <Text style={[typography.small, { color: colors.error, marginTop: spacing.md }]}>{error}</Text>
      ) : null}

      <Button
        label={submitting ? 'Verschiebe…' : 'Neuen Termin bestätigen'}
        onPress={onSubmit}
        loading={submitting}
        disabled={!isValidRange || submitting || isUnchanged}
        fullWidth
        style={{ marginTop: spacing.lg }}
      />
      <Button
        label="Abbrechen"
        variant="secondary"
        onPress={() => navigation.goBack()}
        fullWidth
        style={{ marginTop: spacing.sm, marginBottom: spacing.xxl }}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  label: { color: colors.textSecondary, marginTop: spacing.xl, marginBottom: spacing.sm, fontWeight: '700' },
  dateRowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  dateCell: {
    width: '13.5%',
    minWidth: 48,
    paddingVertical: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    alignItems: 'center',
  },
  dateCellSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  timeBlock: { alignItems: 'center', flex: 1 },
  timeValue: { fontFamily: fonts.serif, fontSize: 26, color: colors.textDark, marginTop: 2 },
  timeSubLabel: { color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.xs },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap' },
});

export default MeetingRescheduleScreen;
