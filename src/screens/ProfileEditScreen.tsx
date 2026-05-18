import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Button, Card, Chip, Header, Input, Screen } from '../components';
import { colors, fonts, spacing, typography } from '../theme';
import { useApp } from '../store/AppContext';
import { AgeRange, MeetingPreference } from '../types';
import { AGE_RANGES, ALL_INTERESTS } from '../data/interests';

type Props = NativeStackScreenProps<RootStackParamList, 'ProfileEdit'>;

const MEETING_OPTIONS: { value: MeetingPreference; label: string; emoji: string }[] = [
  { value: 'one_on_one', label: '1:1 Treffen', emoji: '👤' },
  { value: 'group', label: 'Kleine Gruppe', emoji: '👥' },
  { value: 'both', label: 'Beides ist gut', emoji: '✨' },
];

const MIN_INTERESTS = 3;

const ProfileEditScreen: React.FC<Props> = ({ navigation }) => {
  const { currentUser, saveUserToBackend } = useApp();

  if (!currentUser) {
    return (
      <Screen>
        <Header onBack={() => navigation.goBack()} title="Profil bearbeiten" />
        <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.lg }]}>
          Nicht angemeldet.
        </Text>
      </Screen>
    );
  }

  const [pseudonym, setPseudonym] = useState(currentUser.pseudonym);
  const [ageRange, setAgeRange] = useState<AgeRange>(currentUser.ageRange);
  const [bio, setBio] = useState(currentUser.bio ?? '');
  const [preference, setPreference] = useState<MeetingPreference>(currentUser.meetingPreference);
  const [interests, setInterests] = useState<string[]>(currentUser.interests);
  const [shareOnlyArea, setShareOnlyArea] = useState(currentUser.privacySettings.shareOnlyArea);
  const [hideBio, setHideBio] = useState(currentUser.privacySettings.hideBio);
  const [submitting, setSubmitting] = useState(false);

  const toggleInterest = (label: string) => {
    setInterests((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
    );
  };

  const validPseudonym = pseudonym.trim().length >= 2;
  const enoughInterests = interests.length >= MIN_INTERESTS;

  // What "saveable" means: form fields are valid AND something actually changed.
  const hasChanges = useMemo(() => {
    return (
      pseudonym.trim() !== currentUser.pseudonym ||
      ageRange !== currentUser.ageRange ||
      bio.trim() !== (currentUser.bio ?? '') ||
      preference !== currentUser.meetingPreference ||
      JSON.stringify([...interests].sort()) !==
        JSON.stringify([...currentUser.interests].sort()) ||
      shareOnlyArea !== currentUser.privacySettings.shareOnlyArea ||
      hideBio !== currentUser.privacySettings.hideBio
    );
  }, [
    pseudonym,
    ageRange,
    bio,
    preference,
    interests,
    shareOnlyArea,
    hideBio,
    currentUser,
  ]);

  const onSave = async () => {
    if (!validPseudonym || !enoughInterests || !hasChanges || submitting) return;
    setSubmitting(true);
    await saveUserToBackend({
      pseudonym: pseudonym.trim(),
      ageRange,
      bio: bio.trim(),
      meetingPreference: preference,
      interests,
      privacySettings: {
        shareOnlyArea,
        hideBio,
      },
    });
    setSubmitting(false);
    navigation.goBack();
  };

  return (
    <Screen withKeyboard>
      <Header onBack={() => navigation.goBack()} title="Profil bearbeiten" />
      <Text style={styles.headline}>Aktualisiere dein Profil.</Text>
      <Text style={styles.subline}>
        Änderungen werden sofort übernommen und beeinflussen neue Match-Vorschläge.
      </Text>

      <View style={{ marginTop: spacing.xl }}>
        <Input
          label="Pseudonym"
          value={pseudonym}
          onChangeText={setPseudonym}
          autoCapitalize="words"
          maxLength={20}
          hint={!validPseudonym ? 'Mindestens 2 Zeichen.' : undefined}
        />

        <Text style={[typography.caption, styles.sectionLabel]}>Altersbereich</Text>
        <View style={styles.chipRow}>
          {AGE_RANGES.map((range) => (
            <Chip
              key={range}
              label={range + ' Jahre'}
              selected={ageRange === range}
              onPress={() => setAgeRange(range)}
            />
          ))}
        </View>

        <Input
          label="Über dich"
          placeholder="Was machst du, was treibt dich an, worüber sprichst du gern?"
          value={bio}
          onChangeText={setBio}
          multiline
          maxLength={160}
          hint={`${bio.length}/160 Zeichen`}
        />

        <Text style={[typography.caption, styles.sectionLabel]}>Treffenstyp</Text>
        <View style={styles.chipRow}>
          {MEETING_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              emoji={opt.emoji}
              selected={preference === opt.value}
              onPress={() => setPreference(opt.value)}
            />
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Interessen</Text>
          <Text
            style={[
              typography.caption,
              { color: enoughInterests ? colors.success : colors.textSecondary },
            ]}
          >
            {interests.length} ausgewählt
            {!enoughInterests ? ` · mind. ${MIN_INTERESTS}` : ''}
          </Text>
        </View>
        <View style={styles.chipsWrap}>
          {ALL_INTERESTS.map((interest) => (
            <Chip
              key={interest.label}
              label={interest.label}
              emoji={interest.emoji}
              selected={interests.includes(interest.label)}
              onPress={() => toggleInterest(interest.label)}
            />
          ))}
        </View>

        <Text style={[typography.caption, styles.sectionLabel]}>Datenschutz</Text>
        <Card tone="white" padding="md" style={{ marginBottom: spacing.sm }}>
          <ToggleRow
            label="Nur Stadtteil zeigen"
            description="Andere sehen nur den Bereich, nicht den exakten Standort."
            value={shareOnlyArea}
            onChange={setShareOnlyArea}
          />
        </Card>
        <Card tone="white" padding="md">
          <ToggleRow
            label="Bio verbergen"
            description="Deine Bio wird Matches nicht angezeigt."
            value={hideBio}
            onChange={setHideBio}
          />
        </Card>

        <Button
          label={submitting ? 'Speichere…' : 'Änderungen speichern'}
          onPress={onSave}
          loading={submitting}
          disabled={!validPseudonym || !enoughInterests || !hasChanges || submitting}
          fullWidth
          style={{ marginTop: spacing.xxl }}
        />
        <Button
          label="Abbrechen"
          variant="secondary"
          onPress={() => navigation.goBack()}
          fullWidth
          style={{ marginTop: spacing.sm, marginBottom: spacing.xxl }}
        />
      </View>
    </Screen>
  );
};

const ToggleRow: React.FC<{
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, description, value, onChange }) => (
  <View style={styles.toggleRow}>
    <View style={{ flex: 1, paddingRight: spacing.md }}>
      <Text style={[typography.bodyStrong, { color: colors.textDark }]}>{label}</Text>
      <Text style={[typography.small, { color: colors.textSecondary, marginTop: 2 }]}>
        {description}
      </Text>
    </View>
    <Chip
      label={value ? 'An' : 'Aus'}
      selected={value}
      tone={value ? 'success' : 'default'}
      onPress={() => onChange(!value)}
    />
  </View>
);

const styles = StyleSheet.create({
  headline: {
    fontFamily: fonts.serif,
    fontSize: 26,
    lineHeight: 32,
    color: colors.textDark,
    marginTop: spacing.sm,
  },
  subline: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
  sectionLabel: { color: colors.textSecondary, marginTop: spacing.lg, marginBottom: spacing.sm },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  toggleRow: { flexDirection: 'row', alignItems: 'center' },
});

export default ProfileEditScreen;
