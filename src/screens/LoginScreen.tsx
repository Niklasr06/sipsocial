import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../navigation/types';
import { Button, Header, Input, Screen, SafetyCard } from '../components';
import { colors, fonts, spacing, typography } from '../theme';
import { useApp } from '../store/AppContext';
import type { AuthError } from '../store/AppContext';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Login'>;

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { signIn } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const emailError =
    touched && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? 'Bitte gib eine gültige E-Mail an.' : undefined;
  const passwordError =
    touched && password.length === 0 ? 'Bitte gib dein Passwort ein.' : undefined;

  const canContinue = !emailError && !passwordError && email && password;

  const onSubmit = async () => {
    setTouched(true);
    if (!canContinue || submitting) return;
    setSubmitting(true);
    setServerError(null);
    try {
      await signIn({ email, password });
      // RootNavigator switches to the main stack as soon as the user is set.
    } catch (e) {
      const err = e as AuthError;
      setServerError(err?.message ?? 'Login fehlgeschlagen.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen withKeyboard>
      <Header onBack={() => navigation.goBack()} title="Anmelden" />
      <View style={styles.container}>
        <Text style={styles.headline}>Schön, dich wiederzusehen.</Text>
        <Text style={styles.subline}>Melde dich mit deiner E-Mail und deinem Passwort an.</Text>

        <View style={{ marginTop: spacing.xxl }}>
          <Input
            label="E-Mail"
            placeholder="du@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            error={emailError}
          />
          <Input
            label="Passwort"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            error={passwordError}
          />
        </View>

        {serverError ? (
          <View style={styles.errorBox}>
            <Text style={[typography.small, { color: colors.error }]}>{serverError}</Text>
          </View>
        ) : null}

        <SafetyCard
          icon="lock-closed-outline"
          title="Sicher gespeichert"
          description="Passwörter werden mit bcrypt gehasht, Sessions über JWT geschützt."
        />

        <Button
          label={submitting ? 'Melde an…' : 'Anmelden'}
          onPress={onSubmit}
          fullWidth
          disabled={!email || !password || submitting}
          loading={submitting}
          style={{ marginTop: spacing.xxl }}
        />

        <Pressable
          onPress={() => navigation.navigate('Register')}
          style={({ pressed }) => [styles.switchLink, pressed && { opacity: 0.7 }]}
        >
          <Text style={[typography.small, { color: colors.textSecondary }]}>
            Noch keinen Account?{' '}
            <Text style={{ color: colors.primary, fontWeight: '700' }}>Registrieren</Text>
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

export default LoginScreen;
