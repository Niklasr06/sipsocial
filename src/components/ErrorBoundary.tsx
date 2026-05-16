import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing } from '../theme';

interface State {
  error: Error | null;
  info: string | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, info: error.stack ?? null };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Surface to the browser console too.
    // eslint-disable-next-line no-console
    console.error('SipSocial crashed:', error, info);
    this.setState({ error, info: info.componentStack ?? error.stack ?? null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <ScrollView style={styles.wrap} contentContainerStyle={styles.content}>
        <Text style={styles.title}>SipSocial — Fehler beim Rendern</Text>
        <Text style={styles.message}>{String(this.state.error.message ?? this.state.error)}</Text>
        {this.state.info ? (
          <View style={styles.box}>
            <Text style={styles.stack}>{this.state.info}</Text>
          </View>
        ) : null}
        <Text style={styles.hint}>
          (Diese Ansicht ist nur in der Entwicklung. Bitte schick mir den obigen Text — damit kann ich den Fehler beheben.)
        </Text>
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, paddingTop: 60 },
  title: {
    fontFamily: fonts.serif,
    fontSize: 22,
    color: colors.error,
    marginBottom: spacing.md,
  },
  message: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.textDark,
    marginBottom: spacing.lg,
  },
  box: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
  },
  stack: {
    fontFamily: 'Menlo, Courier, monospace',
    fontSize: 12,
    color: colors.textSecondary,
  },
  hint: { marginTop: spacing.lg, color: colors.textSecondary, fontSize: 13 },
});
