import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../navigation/types';
import { Button, Header, Input, Screen } from '../components';
import { colors, fonts, spacing, typography } from '../theme';
import { useApp } from '../store/AppContext';
import type { AuthError } from '../store/AppContext';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Register'>;

const PASSWORD_MIN = 8;

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const { signUp } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const nameError =
    touched && name.trim().length < 2 ? 'Bitte gib einen Namen (mind. 2 Zeichen) an.' : undefined;
  const emailError =
    touched && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? 'Bitte gib eine gültige E-Mail an.' : undefined;
  const passwordError =
    touched && password.length < PASSWORD_MIN
      ? `Mindestens ${PASSWORD_MIN} Zeichen.`
      : undefined;
  const confirmError =
    touched && confirm !== password ? 'Die Passwörter stimmen nicht überein.' : undefined;

  const canContinue =
    !nameError && !emailError && !passwordError && !confirmError &&
    name && email && password && confirm;

  const onSubmit = async () => {
    setTouched(true);
    if (!canContinue || submitting) return;
    setSubmitting(true);
    setServerError(null);
    try {
      // Backend-Feld heißt weiter ``pseudonym``; UI nennt es schlicht ``Name``.
      await signUp({ pseudonym: name.trim(), email: email.trim(), password });
      navigation.navigate('ProfileSetup');
    } catch (e) {
      const err = e as AuthError;
      setServerError(err?.message ?? 'Registrierung fehlgeschlagen.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen withKeyboard>
      <Header onBack={() => navigation.goBack()} title="Account anlegen" />
      <View style={styles.container}>
        <Text style={styles.headline}>Schön, dass du da bist.</Text>
        <Text style={styles.subline}>
          Wähle einen Namen, mit dem du sichtbar bist.
        </Text>

        <View style={{ marginTop: spacing.xxl }}>
          <Input
            label="Name"
            placeholder="z. B. Mara, Niklas, KaffeeLiebhaber"
            autoCapitalize="words"
            value={name}
            onChangeText={(t) => {
              setName(t);
              if (serverError) setServerError(null);
            }}
            error={nameError}
            hint="So bist du für andere sichtbar."
          />
          <Input
            label="E-Mail"
            placeholder="du@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              if (serverError) setServerError(null);
            }}
            error={emailError}
          />
          <Input
            label="Passwort"
            placeholder="mindestens 8 Zeichen"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              if (serverError) setServerError(null);
            }}
            secureTextEntry
            error={passwordError}
          />
          <Input
            label="Passwort bestätigen"
            placeholder="••••••••"
            value={confirm}
            onChangeText={(t) => {
              setConfirm(t);
              if (serverError) setServerError(null);
            }}
            secureTextEntry
            error={confirmError}
          />
        </View>

        {serverError ? (
          <View style={styles.errorBox}>
            <Text style={[typography.small, { color: colors.error }]}>{serverError}</Text>
          </View>
        ) : null}

        <Button
          label={submitting ? 'Lege Account an…' : 'Registrieren'}
          onPress={onSubmit}
          fullWidth
          disabled={!name || !email || !password || !confirm || submitting}
          loading={submitting}
          style={{ marginTop: spacing.xxl }}
        />

        <Pressable
          onPress={() => navigation.navigate('Login')}
          style={({ pressed }) => [styles.switchLink, pressed && { opacity: 0.7 }]}
        >
          <Text style={[typography.small, { color: colors.textSecondary }]}>
            Schon registriert?{' '}
            <Text style={{ color: colors.primary, fontWeight: '700' }}>Anmelden</Text>
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: { paddingTop: spacing.lg },
  headline: {
    ...typography.h1,
    color: colors.textDark,
    fontFamily: fonts.serif,
    marginBottom: spacing.sm,
  },
  subline: { ...typography.body, color: colors.textSecondary },
  errorBox: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(184, 92, 74, 0.10)',
    borderRadius: 12,
  },
  switchLink: {
    marginTop: spacing.lg,
    alignSelf: 'center',
    paddingVertical: spacing.sm,
  },
});

export default RegisterScreen;
