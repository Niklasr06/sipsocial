import React, { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Button, Card, Chip, Header, Screen } from '../components';
import { colors, fonts, radius, spacing, typography } from '../theme';
import { useApp } from '../store/AppContext';
import { AREAS } from '../data/interests';
import { Area, Availability } from '../types';
import { addDaysIso, formatDateLong, formatTimeRange, todayIso, toMinutes } from '../utils/date';
import { createId } from '../utils/id';

type Props = NativeStackScreenProps<RootStackParamList, 'AvailabilityEdit'>;

const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];

const AvailabilityEditScreen: React.FC<Props> = ({ navigation }) => {
  const {
    currentUser,
    availabilities,
    saveAvailabilityToBackend,
    removeAvailability,
    fetchMatches,
  } = useApp();
  const dates = useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysIso(todayIso(), i)), []);
  const myAvailabilities = useMemo(
    () =>
      currentUser
        ? availabilities
            .filter((a) => a.userId === currentUser.id)
            .sort((a, b) => (a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date)))
        : [],
    [availabilities, currentUser],
  );

  const [selectedDate, setSelectedDate] = useState(dates[1]);
  const [startTime, setStartTime] = useState('15:00');
  const [endTime, setEndTime] = useState('17:00');
  const [area, setArea] = useState<Area>('Stuttgart-Mitte');
  const [submitting, setSubmitting] = useState(false);

  const isValidRange = toMinutes(endTime) > toMinutes(startTime);
  // Soft guard: prevent obvious duplicate slots (same day + same start).
  const isDuplicate = myAvailabilities.some(
    (a) => a.date === selectedDate && a.startTime === startTime && a.area === area,
  );

  const onAdd = async () => {
    if (!currentUser || !isValidRange || submitting || isDuplicate) return;
    setSubmitting(true);
    const av: Availability = {
      id: createId('av'),
      userId: currentUser.id,
      date: selectedDate,
      startTime,
      endTime,
      area,
    };
    await saveAvailabilityToBackend(av);
    fetchMatches().catch(() => undefined);
    setSubmitting(false);
  };

  const onDelete = (av: Availability) => {
    const doDelete = () => {
      removeAvailability(av.id);
      fetchMatches().catch(() => undefined);
    };
    if (Platform.OS === 'web') {
      // RN Web's Alert.alert is a no-op — fall back to native confirm.
      // eslint-disable-next-line no-alert
      if (typeof window !== 'undefined' && window.confirm('Verfügbarkeit wirklich löschen?')) {
        doDelete();
      }
      return;
    }
    Alert.alert(
      'Verfügbarkeit löschen?',
      `${formatDateLong(av.date)}, ${formatTimeRange(av.startTime, av.endTime)} · ${av.area}`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Löschen', style: 'destructive', onPress: doDelete },
      ],
    );
  };

  return (
    <Screen>
      <Header onBack={() => navigation.goBack()} title="Verfügbarkeit" />
      <Text style={styles.headline}>Wann passt es dir?</Text>
      <Text style={styles.subline}>
        Du kannst mehrere Zeitfenster hinterlegen — jedes findet eigene Match-Vorschläge.
      </Text>

      <Text style={[typography.caption, styles.label]}>Meine Verfügbarkeiten ({myAvailabilities.length})</Text>
      {myAvailabilities.length === 0 ? (
        <Card tone="cream" padding="md">
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            Noch nichts hinterlegt. Fülle unten dein erstes Zeitfenster aus.
          </Text>
        </Card>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {myAvailabilities.map((av) => (
            <Card key={av.id} tone="white" padding="md">
              <View style={styles.slotRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.bodyStrong, { color: colors.textDark }]}>
                    {formatDateLong(av.date)}
                  </Text>
                  <Text style={[typography.small, { color: colors.textSecondary, marginTop: 2 }]}>
                    {formatTimeRange(av.startTime, av.endTime)} · {av.area}
                  </Text>
                </View>
                <Pressable
                  onPress={() => onDelete(av)}
                  hitSlop={10}
                  style={styles.deleteBtn}
                  accessibilityLabel="Verfügbarkeit löschen"
                >
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                </Pressable>
              </View>
            </Card>
          ))}
        </View>
      )}

      <Text style={[typography.caption, styles.label]}>Neues Zeitfenster hinzufügen</Text>

      <Text style={[typography.caption, styles.subLabel]}>Tag</Text>
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

      <Text style={[typography.caption, styles.subLabel]}>Zeitfenster</Text>
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

      <Text style={[typography.caption, styles.subLabel]}>Bereich</Text>
      <View style={styles.chipsWrap}>
        {AREAS.map((a) => (
          <Chip key={a} label={a} selected={area === a} onPress={() => setArea(a)} />
        ))}
      </View>

      {isDuplicate ? (
        <Text style={[typography.small, { color: colors.error, marginTop: spacing.md }]}>
          Dieses Zeitfenster hast du schon eingetragen.
        </Text>
      ) : null}

      <Button
        label={submitting ? 'Speichere…' : 'Zeitfenster hinzufügen'}
        onPress={onAdd}
        loading={submitting}
        disabled={!isValidRange || submitting || isDuplicate}
        fullWidth
        style={{ marginTop: spacing.lg }}
        iconLeft={!submitting ? <Ionicons name="add-circle-outline" size={18} color="#fff" /> : null}
      />
      <Button
        label="Fertig"
        variant="secondary"
        onPress={() => navigation.goBack()}
        fullWidth
        style={{ marginTop: spacing.sm, marginBottom: spacing.xxl }}
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
  label: { color: colors.textSecondary, marginTop: spacing.xl, marginBottom: spacing.sm, fontWeight: '700' },
  subLabel: { color: colors.textSecondary, marginTop: spacing.lg, marginBottom: spacing.sm },
  slotRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(196, 73, 73, 0.10)',
  },
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
