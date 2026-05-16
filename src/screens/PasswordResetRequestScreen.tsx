import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../navigation/types';
import { Button, Card, Header, Input, Screen } from '../components';
import { colors, fonts, spacing, typography } from '../theme';
import { authApi } from '../services/authApi';
import { isApiUnavailable } from '../services/apiClient';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'PasswordResetRequest'>;

const PasswordResetRequestScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const isValidEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);

  const onSubmit = async () => {
    if (!isValidEmail || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await authApi.requestPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      if (isApiUnavailable(err)) {
        setError('Backend nicht erreichbar. Bitte später nochmal.');
      } else {
        setError(err instanceof Error ? err.message : 'Unbekannter Fehler.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen withKeyboard>
      <Header onBack={() => navigation.goBack()} title="Passwort zurücksetzen" />
      <Text style={styles.headline}>Passwort vergessen?</Text>
      <Text style={styles.subline}>
        Trag deine E-Mail-Adresse ein. Wir schicken dir einen Code, mit dem du ein neues Passwort
        setzen kannst.
      </Text>

      {sent ? (
        <Card tone="cream" padding="md" style={{ marginTop: spacing.xl }}>
          <Text style={[typography.bodyStrong, { color: colors.textDark }]}>Mail ist raus.</Text>
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: 4 }]}>
            Falls eine Adresse mit dieser Mail existiert, hast du jetzt einen Reset-Code im Postfach.
            Der Code ist 15 Minuten gültig.
          </Text>
          <Text style={[typography.small, { color: colors.textMuted, marginTop: spacing.sm }]}>
            Hinweis fürs MVP: Bis E-Mail-Versand live ist, findest du den Code im Backend-Log.
          </Text>
          <Button
            label="Code eingeben"
            variant="primary"
            size="md"
            fullWidth
            onPress={() => navigation.navigate('PasswordResetConfirm', { email })}
            style={{ marginTop: spacing.md }}
          />
        </Card>
      ) : (
        <>
          <View style={{ marginTop: spacing.xl }}>
            <Input
              label="E-Mail"
              placeholder="du@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={[typography.small, { color: colors.error }]}>{error}</Text>
            </View>
          ) : null}

          <Button
            label={submitting ? 'Sende…' : 'Code anfordern'}
            onPress={onSubmit}
            disabled={!isValidEmail || submitting}
            loading={submitting}
            fullWidth
            style={{ marginTop: spacing.xl }}
          />
          <Pressable
            onPress={() => navigation.navigate('PasswordResetConfirm', { email })}
            style={({ pressed }) => [styles.secondaryLink, pressed && { opacity: 0.7 }]}
          >
            <Text style={[typography.small, { color: colors.primary, fontWeight: '600' }]}>
              Code schon erhalten? Direkt eingeben
            </Text>
          </Pressable>
        </>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  headline: {
    ...typography.h1,
    color: colors.textDark,
    fontFamily: fonts.serif,
    marginTop: spacing.sm,
  },
  subline: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
  errorBox: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(184, 92, 74, 0.10)',
    borderRadius: 12,
  },
  secondaryLink: { marginTop: spacing.md, alignSelf: 'center', paddingVertical: spacing.sm },
});

export default PasswordResetRequestScreen;
