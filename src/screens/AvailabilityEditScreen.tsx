import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Button, Card, Chip, Header, Screen } from '../components';
import { colors, fonts, radius, spacing, typography } from '../theme';
import { useApp } from '../store/AppContext';
import { AREAS } from '../data/interests';
import { Area, Availability } from '../types';
import { addDaysIso, formatDateShort, todayIso, toMinutes } from '../utils/date';
import { createId } from '../utils/id';

type Props = NativeStackScreenProps<RootStackParamList, 'AvailabilityEdit'>;

const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];

const AvailabilityEditScreen: React.FC<Props> = ({ navigation }) => {
  const { currentUser, availabilities, saveAvailabilityToBackend, fetchMatches } = useApp();
  const dates = useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysIso(todayIso(), i)), []);
  const existing = currentUser ? availabilities.find((a) => a.userId === currentUser.id) : undefined;

  const [selectedDate, setSelectedDate] = useState(existing?.date ?? dates[1]);
  const [startTime, setStartTime] = useState(existing?.startTime ?? '15:00');
  const [endTime, setEndTime] = useState(existing?.endTime ?? '17:00');
  const [area, setArea] = useState<Area>((existing?.area as Area) ?? 'Stuttgart-Mitte');
  const [submitting, setSubmitting] = useState(false);

  const isValidRange = toMinutes(endTime) > toMinutes(startTime);

  const onSubmit = async () => {
    if (!currentUser || !isValidRange || submitting) return;
    setSubmitting(true);
    const av: Availability = {
      id: existing?.id ?? createId('av'),
      userId: currentUser.id,
      date: selectedDate,
      startTime,
      endTime,
      area,
    };
    await saveAvailabilityToBackend(av);
    fetchMatches().catch(() => undefined);
    setSubmitting(false);
    navigation.goBack();
  };

  return (
    <Screen>
      <Header onBack={() => navigation.goBack()} title="Verfügbarkeit ändern" />
      <Text style={styles.headline}>Wann passt es dir?</Text>
      <Text style={styles.subline}>Tag, Uhrzeit und Bereich. Neue Vorschläge werden direkt aktualisiert.</Text>

      <Text style={[typography.caption, styles.label]}>Tag</Text>
      <View style={styles.dateRow}>
        {dates.map((d) => {
          const selected = d === selectedDate;
          return (
            <Pressable
              key={d}
              onPress={() => setSelectedDate(d)}
              style={[styles.dateCell, selected && styles.dateCellSelected]}
            >
              <Text style={[typography.small, { color: selected ? '#fff' : colors.textSecondary }]}>
                {formatDateShort(d).split(',')[0]}
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

      <Text style={[typography.caption, styles.label]}>Zeitfenster</Text>
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

      <Text style={[typography.caption, styles.label]}>Bereich</Text>
      <View style={styles.chipsWrap}>
        {AREAS.map((a) => (
          <Chip key={a} label={a} selected={area === a} onPress={() => setArea(a)} />
        ))}
      </View>

      <Button
        label={submitting ? 'Speichere…' : 'Speichern'}
        onPress={onSubmit}
        loading={submitting}
        disabled={!isValidRange || submitting}
        fullWidth
        style={{ marginTop: spacing.xxl }}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  headline: {
    fontFamily: fonts.serif,
    fontSize: 26,
    lineHeight: 32,
    color: colors.textDark,
    marginTop: spacing.sm,
  },
  subline: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
  label: { color: colors.textSecondary, marginTop: spacing.xl, marginBottom: spacing.sm },
  dateRow: { flexDirection: 'row', gap: spacing.sm },
  dateCell: {
    flex: 1,
    paddingVertical: 14,
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

export default AvailabilityEditScreen;
