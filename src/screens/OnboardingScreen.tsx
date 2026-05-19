import React, { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { OnboardingStackParamList } from '../navigation/types';
import { Button, Card, Screen } from '../components';
import { colors, fonts, radius, spacing, typography } from '../theme';
import { useApp } from '../store/AppContext';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Onboarding'>;

const FEATURES: { icon: keyof typeof Ionicons.glyphMap; title: string; description: string }[] = [
  {
    icon: 'cafe-outline',
    title: 'Sichere Treffen in Cafés',
    description: 'Vorgeschlagen in neutralen, öffentlichen Orten in deiner Nähe.',
  },
  {
    icon: 'chatbubble-ellipses-outline',
    title: 'Begrenzter Chat',
    description: 'Maximal 3 Nachrichten pro Person. Lernt euch beim Kaffee kennen.',
  },
  {
    icon: 'sparkles-outline',
    title: 'Interessenbasiertes Matching',
    description: 'Treffen werden auf gemeinsamer Basis vorgeschlagen, nicht nach Optik.',
  },
  {
    icon: 'qr-code-outline',
    title: 'QR-Code Check-in',
    description: 'Bestätigung vor Ort. Fair, transparent und sicher.',
  },
];

const OnboardingScreen: React.FC<Props> = ({ navigation }) => {
  const { currentUser, authBootstrapping } = useApp();

  // Returning user with stored token + unvollständigem Profil landet sonst
  // hier auf dem Intro statt im ProfileSetup. ``useFocusEffect`` statt
  // ``useEffect``, weil React Navigation Vorgänger-Screens mounted hält —
  // ein nacktes useEffect würde sonst auch dann feuern, wenn der User schon
  // einen Schritt weiter ist und gerade speichert, und uns mit
  // navigation.replace zurück nach ProfileSetup ziehen.
  useFocusEffect(
    useCallback(() => {
      if (authBootstrapping) return;
      if (!currentUser) return;
      if (currentUser.interests.length < 3) {
        navigation.replace('ProfileSetup');
      }
    }, [authBootstrapping, currentUser, navigation]),
  );

  return (
    <Screen padded={false}>
      <View style={styles.hero}>
        <View style={styles.heroIconWrap}>
          <Text style={styles.heroIcon}>☕️</Text>
        </View>
        <Text style={styles.brand}>SipSocial</Text>
        <Text style={styles.headline}>Neue Kontakte beim Kaffee.</Text>
        <Text style={styles.subline}>
          Triff Menschen in deiner Nähe — kein Dating, kein endloser Chat.
        </Text>
      </View>

      <View style={styles.featuresWrap}>
        {FEATURES.map((f) => (
          <Card key={f.title} tone="white" padding="md" style={styles.featureCard}>
            <View style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name={f.icon} size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.bodyStrong, { color: colors.textDark }]}>{f.title}</Text>
                <Text style={[typography.small, { color: colors.textSecondary, marginTop: 2 }]}>
                  {f.description}
                </Text>
              </View>
            </View>
          </Card>
        ))}
      </View>

      <View style={styles.footer}>
        <Button label="Loslegen" onPress={() => navigation.navigate('Register')} fullWidth />
        <View style={styles.altLinkRow}>
          <Text style={[typography.small, { color: colors.textSecondary }]}>Schon dabei?</Text>
          <Text
            style={[typography.small, styles.altLink]}
            onPress={() => navigation.navigate('Login')}
          >
            {'  '}Anmelden
          </Text>
        </View>
        <Text style={[typography.small, styles.footerNote]}>
          Mit der Nutzung stimmst du dem SipSocial-Verhaltenskodex zu.
        </Text>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    alignItems: 'center',
  },
  heroIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heroIcon: { fontSize: 28 },
  brand: {
    fontFamily: fonts.serif,
    fontSize: 14,
    color: colors.primary,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  headline: {
    ...typography.h1,
    color: colors.textDark,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subline: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  featuresWrap: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  featureCard: {},
  featureRow: { flexDirection: 'row', alignItems: 'center' },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  footerNote: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  altLinkRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  altLink: { color: colors.primary, fontWeight: '700' },
});

export default OnboardingScreen;
