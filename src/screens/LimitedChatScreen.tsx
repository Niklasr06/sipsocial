import React, { useMemo, useState } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Avatar, Header, Screen, UserActionsSheet } from '../components';
import { colors, fonts, radius, spacing, typography } from '../theme';
import { useApp } from '../store/AppContext';
import { ChatMessage, MAX_MESSAGES_PER_USER } from '../types';
import { decryptMessage } from '../utils/crypto';
import { checkMessageLimit } from '../services/chatService';
import { evaluateMessage } from '../services/privacyFilter';

type Props = NativeStackScreenProps<RootStackParamList, 'LimitedChat'>;

const LimitedChatScreen: React.FC<Props> = ({ navigation, route }) => {
  const { matchId } = route.params;
  const { matches, currentUser, chatMessages, sendChatMessage, getUser } = useApp();
  const match = matches.find((m) => m.id === matchId);
  const other = match ? getUser(match.userBId) : null;
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const sortedMessages = useMemo(
    () => chatMessages.filter((m) => m.matchId === matchId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [chatMessages, matchId],
  );

  if (!match || !currentUser || !other) {
    return (
      <Screen>
        <Header onBack={() => navigation.goBack()} title="Chat" />
        <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.lg }]}>
          Chat ist nicht verfügbar.
        </Text>
      </Screen>
    );
  }

  const myLimit = checkMessageLimit(chatMessages, currentUser.id, matchId);
  const otherLimit = checkMessageLimit(chatMessages, other.id, matchId);

  const onSend = () => {
    if (!draft.trim()) return;
    const r = sendChatMessage(matchId, draft);
    if (!r.ok) {
      setError(r.reason ?? 'Konnte nicht gesendet werden.');
      return;
    }
    setDraft('');
    setError(null);
  };

  const liveVerdict = draft.trim() ? evaluateMessage(draft) : null;

  return (
    <Screen padded={false} withKeyboard scroll={false}>
      <Header
        onBack={() => navigation.goBack()}
        title={other.pseudonym}
        subtitle="Begrenzter Chat"
        rightSlot={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Pressable
              hitSlop={10}
              onPress={() => navigation.navigate('Icebreakers', { matchId })}
              style={({ pressed }) => [styles.iceBtn, pressed && { opacity: 0.85 }]}
            >
              <Ionicons name="sparkles-outline" size={16} color={colors.primary} />
              <Text style={styles.iceBtnText}>Icebreaker</Text>
            </Pressable>
            <UserActionsSheet
              pseudonym={other.pseudonym}
              userId={other.id}
              matchId={matchId}
              onBlocked={() => navigation.goBack()}
            />
          </View>
        }
      />

      <View style={styles.limitBar}>
        <View style={styles.limitInfo}>
          <Avatar initials={currentUser.initials} color={currentUser.accentColor} size={24} />
          <Text style={styles.limitText}>
            Du: {MAX_MESSAGES_PER_USER - myLimit.remaining}/{MAX_MESSAGES_PER_USER}
          </Text>
        </View>
        <View style={styles.limitInfo}>
          <Avatar initials={other.initials} color={other.accentColor} size={24} />
          <Text style={styles.limitText}>
            {other.pseudonym}: {MAX_MESSAGES_PER_USER - otherLimit.remaining}/{MAX_MESSAGES_PER_USER}
          </Text>
        </View>
      </View>

      <FlatList
        data={sortedMessages}
        keyExtractor={(m) => m.id}
        style={{ flex: 1 }}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.hint}>
            <Ionicons name="lock-closed-outline" size={14} color={colors.success} />
            <Text style={styles.hintText}>
              Der Chat ist bewusst begrenzt. Lernt euch beim Kaffee kennen. Nachrichten sind mock-verschlüsselt gespeichert.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Bubble
            message={item}
            isMe={item.senderId === currentUser.id}
            otherInitials={other.initials}
            otherColor={other.accentColor}
            myColor={currentUser.accentColor}
          />
        )}
      />

      {liveVerdict && (liveVerdict.blocked || liveVerdict.warnings.length > 0) ? (
        <View style={[styles.privacyBanner, liveVerdict.blocked ? styles.privacyBannerStrong : null]}>
          <Ionicons
            name={liveVerdict.blocked ? 'alert-circle-outline' : 'information-circle-outline'}
            size={16}
            color={liveVerdict.blocked ? colors.error : colors.warning}
          />
          <Text style={styles.privacyBannerText}>
            {liveVerdict.blocked
              ? 'Zum Schutz deiner Privatsphäre solltest du persönliche Kontaktdaten erst nach dem Treffen teilen.'
              : `Hinweis: enthält ${liveVerdict.warnings.join(', ')}.`}
          </Text>
        </View>
      ) : null}

      <View style={styles.composer}>
        {myLimit.reached ? (
          <View style={styles.reachedBox}>
            <Ionicons name="cafe-outline" size={16} color={colors.primary} />
            <Text style={styles.reachedText}>
              Du hast dein Nachrichten-Limit erreicht. Sprich beim Treffen weiter ☕️
            </Text>
          </View>
        ) : (
          <>
            <TextInput
              value={draft}
              onChangeText={(t) => {
                setDraft(t);
                if (error) setError(null);
              }}
              placeholder="Nachricht schreiben…"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              multiline
              maxLength={180}
            />
            <Pressable
              onPress={onSend}
              disabled={!draft.trim()}
              style={({ pressed }) => [
                styles.sendBtn,
                !draft.trim() && { opacity: 0.5 },
                pressed && draft.trim() && { opacity: 0.85 },
              ]}
            >
              <Ionicons name="arrow-up" size={20} color="#fff" />
            </Pressable>
          </>
        )}
      </View>
      {error ? <Text style={[typography.small, { color: colors.error, padding: spacing.md }]}>{error}</Text> : null}
    </Screen>
  );
};

const Bubble: React.FC<{
  message: ChatMessage;
  isMe: boolean;
  otherInitials: string;
  otherColor: string;
  myColor: string;
}> = ({ message, isMe, otherInitials, otherColor, myColor }) => {
  const text = decryptMessage(message.encryptedText);
  return (
    <View style={[styles.bubbleRow, { justifyContent: isMe ? 'flex-end' : 'flex-start' }]}>
      {!isMe ? (
        <Avatar initials={otherInitials} color={otherColor} size={28} />
      ) : null}
      <View style={[styles.bubble, isMe ? { backgroundColor: myColor, marginLeft: 'auto' } : styles.bubbleOther]}>
        <Text style={[typography.body, { color: isMe ? '#fff' : colors.textDark }]}>{text}</Text>
        <Text
          style={[
            typography.caption,
            { color: isMe ? 'rgba(255,255,255,0.7)' : colors.textMuted, marginTop: 4 },
          ]}
        >
          Nachricht {message.messageNumber}/{MAX_MESSAGES_PER_USER}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  limitBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceAlt,
    marginHorizontal: spacing.lg,
    borderRadius: radius.lg,
  },
  limitInfo: { flexDirection: 'row', alignItems: 'center' },
  limitText: { ...typography.small, color: colors.textDark, fontWeight: '600', marginLeft: 6 },
  list: { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(111,143,114,0.10)',
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
  },
  hintText: {
    ...typography.small,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    flex: 1,
    lineHeight: 18,
  },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: spacing.md, gap: spacing.sm },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.xxl,
    borderBottomRightRadius: radius.sm,
  },
  bubbleOther: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderBottomLeftRadius: radius.sm,
    borderBottomRightRadius: radius.xxl,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? spacing.lg : spacing.md,
    backgroundColor: colors.background,
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    minHeight: 44,
    maxHeight: 110,
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.textDark,
    marginRight: spacing.sm,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reachedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    padding: spacing.md,
    borderRadius: radius.lg,
    flex: 1,
  },
  reachedText: { ...typography.small, color: colors.textDark, marginLeft: spacing.sm, flex: 1 },
  iceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  iceBtnText: {
    ...typography.caption,
    color: colors.primary,
    marginLeft: 4,
    fontWeight: '700',
  },
  privacyBanner: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    backgroundColor: 'rgba(201, 152, 96, 0.16)',
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  privacyBannerStrong: {
    backgroundColor: 'rgba(184, 92, 74, 0.12)',
  },
  privacyBannerText: {
    ...typography.small,
    color: colors.textDark,
    marginLeft: spacing.sm,
    flex: 1,
    lineHeight: 18,
  },
});

export default LimitedChatScreen;
