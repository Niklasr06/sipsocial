import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { colors, radius, spacing, typography, fonts } from '../theme';

interface Props extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string;
  multiline?: boolean;
}

export const Input: React.FC<Props> = ({ label, hint, error, multiline, style, ...rest }) => {
  return (
    <View style={styles.wrapper}>
      {label ? <Text style={[typography.caption, styles.label]}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          multiline && styles.multiline,
          error && styles.errorBorder,
          style,
        ]}
        multiline={multiline}
        {...rest}
      />
      {error ? (
        <Text style={[typography.small, { color: colors.error, marginTop: 4 }]}>{error}</Text>
      ) : hint ? (
        <Text style={[typography.small, styles.hint]}>{hint}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.lg },
  label: { color: colors.textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.textDark,
  },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  errorBorder: { borderColor: colors.error },
  hint: { color: colors.textSecondary, marginTop: 4 },
});
