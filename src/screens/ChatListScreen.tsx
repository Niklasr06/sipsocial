import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { Avatar, EmptyState, Screen } from '../components';
import { colors, fonts, spacing, typography } from '../theme';
import { useApp } from '../store/AppContext';
import { decryptMessage } from '../utils/crypto';
import { MAX_MESSAGES_PER_USER } from '../types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Chat'>,
  NativeStackScreenProps<RootStackParamList>
>;

const ChatListScreen: React.FC<Props> = ({ navigation }) => {
  const { matches, chatMessages, currentUser, getUser, fetchMatches } = useApp();

  const conversations = useMemo(() => {
    if (!currentUser) return [];
    // Chat ist ab dem Match offen — alle aktiven Status zählen (Match
    // hat in den Daten keinen ``cancelled``-Status, deshalb reicht hier
    // der ``declined``-Filter).
    return matches
      .filter((m) => m.status !== 'declined')
      .map((m) => {
        const otherId = m.userAId === currentUser.id ? m.userBId : m.userAId;
        const other = getUser(otherId);
        const msgs = chatMessages
          .filter((c) => c.matchId === m.id)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        const last = msgs[msgs.length - 1];
        let preview = 'Schreibt eure erste Nachricht.';
        if (last) {
          try {
            preview = decryptMessage(last.encryptedText) || preview;
          } catch {
            preview = '(Nachricht)';
          }
        }
        return { matchId: m.id, other, lastAt: last?.createdAt ?? null, preview, count: msgs.length };
      })
      .filter((c) => c.other) // skip matches mit unbekanntem Gegenüber
      .sort((a, b) => (b.lastAt ?? '').localeCompare(a.lastAt ?? ''));
  }, [matches, chatMessages, currentUser, getUser]);

  return (
    <Screen onRefresh={() => fetchMatches().catch(() => null)}>
      <Text style={styles.title}>Chats</Text>
      <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm }]}>
        Begrenzt auf 3 Nachrichten pro Person — kurzes Kennenlernen, dann beim Kaffee weiter.
      </Text>

      {conversations.length === 0 ? (
        <EmptyState
          icon="chatbubble-ellipses-outline"
          title="Noch keine Chats"
          description="Chats werden freigeschaltet, sobald du ein Match angenommen hast. Schau bei den Vorschlägen rein."
          primaryActionLabel="Match finden"
          onPrimaryAction={() => navigation.navigate('Matches')}
        />
      ) : (
        <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
          {conversations.map((c) => (
            <Pressable
              key={c.matchId}
              onPress={() => navigation.navigate('LimitedChat', { matchId: c.matchId })}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
            >
              <Avatar
                initials={c.other!.initials}
                color={c.other!.accentColor}
                size={48}
              />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={[typography.bodyStrong, { color: colors.textDark }]} numberOfLines={1}>
                  {c.other!.pseudonym}
                </Text>
                <Text
                  style={[typography.small, { color: colors.textSecondary, marginTop: 2 }]}
                  numberOfLines={1}
                >
                  {c.preview}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                <Text style={[typography.caption, { color: colors.textMuted, marginTop: 4 }]}>
                  {c.count}/{MAX_MESSAGES_PER_USER * 2}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.serif,
    fontSize: 30,
    lineHeight: 36,
    color: colors.textDark,
    marginTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
});

export default ChatListScreen;
