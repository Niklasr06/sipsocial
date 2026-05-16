import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Button, Card, Header, Screen } from '../components';
import { colors, fonts, radius, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Safety'>;

const PRINCIPLES: { icon: keyof typeof Ionicons.glyphMap; title: string; description: string }[] = [
  {
    icon: 'shield-checkmark-outline',
    title: 'Pseudonym statt Klarname',
    description:
      'Du musst weder echten Namen noch Foto angeben. Dein Pseudonym ist deine Identität in der Community.',
  },
  {
    icon: 'map-outline',
    title: 'Standort nur als Bereich',
    description:
      'Andere sehen nur den Stadtteil, niemals deinen genauen Standort oder deine Adresse.',
  },
  {
    icon: 'chatbubble-ellipses-outline',
    title: 'Chat erst nach Match',
    description:
      'Niemand kann dich ungebeten anschreiben. Chat ist nur nach beiderseitiger Bestätigung möglich.',
  },
  {
    icon: 'cut-outline',
    title: 'Chat ist begrenzt',
    description:
      'Maximal 3 Nachrichten pro Person. Damit ist der Fokus klar: schnell zum echten Treffen statt endlos schreiben.',
  },
  {
    icon: 'qr-code-outline',
    title: 'QR-Code Check-in',
    description:
      'Beim Treffen scannt ihr beide einen QR-Code. So ist transparent, dass das Treffen wirklich stattgefunden hat.',
  },
  {
    icon: 'time-outline',
    title: 'No-Show-Schutz',
    description:
      'Wer wiederholt nicht erscheint, sieht zunächst Hinweise, dann eingeschränkte Vorschläge. Fair und transparent.',
  },
  {
    icon: 'cafe-outline',
    title: 'Öffentliche Café-Treffen',
    description:
      'Treffen finden in neutralen, öffentlichen Cafés statt. Du musst niemandem deine Adresse zeigen.',
  },
  {
    icon: 'lock-closed-outline',
    title: 'Verschlüsselte Chat-Speicherung',
    description:
      'Nachrichten werden verschlüsselt gespeichert. In diesem Prototyp simuliert, im echten Betrieb End-zu-End.',
  },
];

const SafetyPrivacyScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <Screen>
      <Header onBack={() => navigation.goBack()} title="Sicherheit & Datenschutz" />
      <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
        SipSocial ist so gebaut, dass du dich sicher fühlst — durch reduzierte Daten, klare Grenzen und transparente Regeln.
      </Text>

      <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
        {PRINCIPLES.map((p) => (
          <Card key={p.title} tone="white" padding="md">
            <View style={styles.row}>
              <View style={styles.iconWrap}>
                <Ionicons name={p.icon} size={20} color={colors.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.bodyStrong, { color: colors.textDark }]}>{p.title}</Text>
                <Text style={[typography.small, { color: colors.textSecondary, marginTop: 2 }]}>
                  {p.description}
                </Text>
              </View>
            </View>
          </Card>
        ))}
      </View>

      <Card tone="cream" padding="lg" style={{ marginTop: spacing.xl }}>
        <Text style={[typography.h3, { color: colors.textDark, fontFamily: fonts.serif }]}>
          Dein Vertrauensstatus
        </Text>
        <Text style={[typography.body, { color: colors.textSecondary, marginTop: 4 }]}>
          Erfahre, wie das No-Show-System funktioniert und welche Stufen es gibt.
        </Text>
        <Button
          label="Status & No-Show System öffnen"
          variant="secondary"
          size="md"
          onPress={() => navigation.navigate('NoShow')}
          style={{ marginTop: spacing.md, alignSelf: 'flex-start' }}
        />
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(111, 143, 114, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
});

export default SafetyPrivacyScreen;
