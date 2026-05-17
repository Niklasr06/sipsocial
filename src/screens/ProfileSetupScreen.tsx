import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../navigation/types';
import { Button, Card, Chip, Header, Input, Screen } from '../components';
import { colors, fonts, spacing, typography } from '../theme';
import { useApp } from '../store/AppContext';
import { AgeRange, MeetingPreference } from '../types';
import { AGE_RANGES } from '../data/interests';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'ProfileSetup'>;

const MEETING_OPTIONS: { value: MeetingPreference; label: string; emoji: string }[] = [
  { value: 'one_on_one', label: '1:1 Treffen', emoji: '👤' },
  { value: 'group', label: 'Kleine Gruppe', emoji: '👥' },
  { value: 'both', label: 'Beides ist gut', emoji: '✨' },
];

const ProfileSetupScreen: React.FC<Props> = ({ navigation }) => {
  const { currentUser, saveUserToBackend } = useApp();
  const [ageRange, setAgeRange] = useState<AgeRange>(currentUser?.ageRange ?? '25-34');
  const [bio, setBio] = useState(currentUser?.bio ?? '');
  const [preference, setPreference] = useState<MeetingPreference>(currentUser?.meetingPreference ?? 'both');
  const [shareOnlyArea, setShareOnlyArea] = useState(currentUser?.privacySettings.shareOnlyArea ?? true);
  const [hideExactAge, setHideExactAge] = useState(currentUser?.privacySettings.hideExactAge ?? false);

  const onContinue = async () => {
    await saveUserToBackend({
      ageRange,
      bio: bio.trim(),
      meetingPreference: preference,
      privacySettings: {
        shareOnlyArea,
        hideExactAge,
        hideBio: false,
      },
    });
    navigation.navigate('Interests');
  };

  return (
    <Screen withKeyboard>
      <Header
        onBack={() => navigation.goBack()}
        title="Profil"
        subtitle="Schritt 1 von 2"
      />
      <Text style={styles.headline}>Erzähl ein bisschen von dir.</Text>
      <Text style={styles.subline}>
        Alle Angaben sind optional. Du entscheidest, was du teilst.
      </Text>

      <View style={{ marginTop: spacing.xxl }}>
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
          label="Über dich (optional)"
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

        <Text style={[typography.caption, styles.sectionLabel]}>Datenschutz</Text>
        <Card tone="white" padding="md" style={{ marginBottom: spacing.md }}>
          <ToggleRow
            label="Nur Stadtteil zeigen"
            description="Andere sehen nur den Bereich, nicht den exakten Standort."
            value={shareOnlyArea}
            onChange={setShareOnlyArea}
          />
        </Card>
        <Card tone="white" padding="md">
          <ToggleRow
            label="Genaues Alter verbergen"
            description="Andere sehen nur deinen Altersbereich."
            value={hideExactAge}
            onChange={setHideExactAge}
          />
        </Card>

        <Button
          label="Weiter zu Interessen"
          onPress={onContinue}
          fullWidth
          style={{ marginTop: spacing.xxl }}
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
  sectionLabel: {
    color: colors.textSecondary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md },
  toggleRow: { flexDirection: 'row', alignItems: 'center' },
});

export default ProfileSetupScreen;
