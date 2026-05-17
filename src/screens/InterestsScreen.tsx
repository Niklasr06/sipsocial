import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../navigation/types';
import { Button, Chip, Header, Screen } from '../components';
import { colors, fonts, spacing, typography } from '../theme';
import { ALL_INTERESTS } from '../data/interests';
import { useApp } from '../store/AppContext';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Interests'>;

const MIN_INTERESTS = 3;

const InterestsScreen: React.FC<Props> = ({ navigation }) => {
  const { currentUser, saveUserToBackend } = useApp();
  const [selected, setSelected] = useState<string[]>(currentUser?.interests ?? []);

  const toggle = (label: string) => {
    setSelected((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
    );
  };

  const enough = selected.length >= MIN_INTERESTS;

  const onContinue = async () => {
    if (!enough) return;
    await saveUserToBackend({ interests: selected });
    // Onboarding ist fertig: RootNavigator switcht automatisch zum Main-Stack
    // sobald interests >= 3 dispatched ist und der currentUser-State sich
    // aktualisiert hat. Kein explizites navigation.navigate nötig.
  };

  return (
    <Screen>
      <Header
        onBack={() => navigation.goBack()}
        title="Interessen"
        subtitle="Schritt 2 von 2"
      />
      <Text style={styles.headline}>Was bewegt dich?</Text>
      <Text style={styles.subline}>
        Wähle mindestens {MIN_INTERESTS} Interessen aus — nach oben offen. Je mehr du angibst, desto besser passen die Vorschläge.
      </Text>

      <View style={styles.counter}>
        <Text style={[typography.caption, { color: enough ? colors.success : colors.textSecondary }]}>
          {selected.length} ausgewählt {enough ? '' : `· noch ${MIN_INTERESTS - selected.length}`}
        </Text>
      </View>

      <View style={styles.chipsWrap}>
        {ALL_INTERESTS.map((interest) => (
          <Chip
            key={interest.label}
            label={interest.label}
            emoji={interest.emoji}
            selected={selected.includes(interest.label)}
            onPress={() => toggle(interest.label)}
          />
        ))}
      </View>

      <Button
        label={enough ? 'Fertig' : `Noch ${MIN_INTERESTS - selected.length} auswählen`}
        onPress={onContinue}
        disabled={!enough}
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
  counter: { marginTop: spacing.lg, marginBottom: spacing.md },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap' },
});

export default InterestsScreen;
