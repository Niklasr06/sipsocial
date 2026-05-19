import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../navigation/types';
import { Button, Header, Input, Screen } from '../components';
import { colors, fonts, spacing, typography } from '../theme';
import { authApi } from '../services/authApi';
import { ApiError, isApiUnavailable } from '../services/apiClient';
import { setTokens } from '../services/tokenStore';
import { useApp } from '../store/AppContext';
import { apiUserToLocal } from '../store/backendBridge';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'PasswordResetConfirm'>;

const PasswordResetConfirmScreen: React.FC<Props> = ({ navigation }) => {
  const { setCurrentUser } = useApp();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordValid = password.length >= 8;
  const passwordsMatch = password === confirm;
  const tokenValid = token.trim().length >= 8;
  const canSubmit = passwordValid && passwordsMatch && tokenValid && !submitting;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await authApi.confirmPasswordReset(token.trim(), password);
      await setTokens(res.token, res.refresh_token);
      setCurrentUser(apiUserToLocal(res.user));
      // RootNavigator switches stacks automatically as soon as user is set.
    } catch (err) {
      if (isApiUnavailable(err)) {
        setError('Backend nicht erreichbar.');
      } else if (err instanceof ApiError) {
        setError(err.detail ?? err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Unbekannter Fehler.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen withKeyboard>
      <Header onBack={() => navigation.goBack()} title="Neues Passwort setzen" />
      <Text style={styles.headline}>Setz ein neues Passwort.</Text>
      <Text style={styles.subline}>
        Trag den Reset-Code aus deiner E-Mail ein und wähle ein neues Passwort (mind. 8 Zeichen).
      </Text>

      <View style={{ marginTop: spacing.xl }}>
        <Input
          label="Reset-Code"
          placeholder="z. B. wkpL-rA..."
          value={token}
          onChangeText={(t) => {
            setToken(t);
            if (error) setError(null);
          }}
          autoCapitalize="none"
        />
        <Input
          label="Neues Passwort"
          placeholder="Mindestens 8 Zeichen"
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            if (error) setError(null);
          }}
          secureTextEntry
          error={password.length > 0 && !passwordValid ? 'Mindestens 8 Zeichen.' : undefined}
        />
        <Input
          label="Passwort bestätigen"
          value={confirm}
          onChangeText={(t) => {
            setConfirm(t);
            if (error) setError(null);
          }}
          secureTextEntry
          error={confirm.length > 0 && !passwordsMatch ? 'Passwörter stimmen nicht überein.' : undefined}
        />
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={[typography.small, { color: colors.error }]}>{error}</Text>
        </View>
      ) : null}

      <Button
        label={submitting ? 'Setze Passwort…' : 'Passwort speichern'}
        onPress={onSubmit}
        disabled={!canSubmit}
        loading={submitting}
        fullWidth
        style={{ marginTop: spacing.xl }}
      />
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
});

export default PasswordResetConfirmScreen;
