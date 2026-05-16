import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';

interface Props {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  background?: string;
  contentStyle?: StyleProp<ViewStyle>;
  withKeyboard?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  /**
   * If provided, the screen renders a pull-to-refresh control. The
   * promise's lifetime drives the spinner — keep it short or the user
   * stares at a spinning indicator forever.
   */
  onRefresh?: () => Promise<unknown>;
}

export const Screen: React.FC<Props> = ({
  children,
  scroll = true,
  padded = true,
  background = colors.background,
  contentStyle,
  withKeyboard,
  edges = ['top', 'bottom'],
  onRefresh,
}) => {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const Content = scroll ? (
    <ScrollView
      contentContainerStyle={[
        padded && styles.padded,
        { paddingBottom: spacing.huge + insets.bottom },
        contentStyle,
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, padded && styles.padded, contentStyle]}>{children}</View>
  );

  const Wrapped = withKeyboard ? (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 0}
    >
      {Content}
    </KeyboardAvoidingView>
  ) : (
    Content
  );

  return (
    <SafeAreaView edges={edges} style={[styles.safe, { backgroundColor: background }]}>
      {Wrapped}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  padded: { paddingHorizontal: spacing.lg },
});
