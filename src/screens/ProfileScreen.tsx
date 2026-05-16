import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { Avatar, Button, Card, Screen, StatusPill } from '../components';
import { colors, fonts, radius, spacing, typography } from '../theme';
import { useApp } from '../store/AppContext';
import { calculateTrustStatus } from '../services/noShowService';
import { INTEREST_EMOJI } from '../data/interests';
import { formatDateLong, formatTimeRange } from '../utils/date';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Profile'>,
  NativeStackScreenProps<RootStackParamList>
>;

const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { currentUser, availabilities, signOut } = useApp();
  if (!currentUser) return null;

  const myAv = availabilities.find((a) => a.userId === currentUser.id);
  const trust = calculateTrustStatus(currentUser.noShowCount);

  const onLogout = async () => {
    // Clears the stored bearer token + resets the user. Root navigator switches
    // back to the onboarding stack automatically.
    await signOut();
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Avatar initials={currentUser.initials} color={currentUser.accentColor} size={92} border />
        <Text style={styles.name}>{currentUser.pseudonym}</Text>
        <Text style={[typography.small, { color: colors.textSecondary }]}>
          {currentUser.ageRange} · Pseudonym
        </Text>
        <View style={{ marginTop: spacing.sm }}>
          <StatusPill
            label={trust.title}
            tone={
              trust.level === 'none'
                ? 'success'
                : trust.level === 'soft_warning'
                ? 'info'
                : trust.level === 'limited_matches'
                ? 'warning'
                : 'danger'
            }
          />
        </View>
      </View>

      {currentUser.bio ? (
        <Card tone="white" padding="md" style={{ marginTop: spacing.xl }}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Über dich</Text>
          <Text style={[typography.body, { color: colors.textDark, marginTop: 4 }]}>{currentUser.bio}</Text>
        </Card>
      ) : null}

      <Card tone="white" padding="md" style={{ marginTop: spacing.md }}>
        <View style={styles.cardHeader}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Interessen</Text>
          <Text style={[typography.small, { color: colors.textSecondary }]}>
            {currentUser.interests.length} ausgewählt
          </Text>
        </View>
        <View style={styles.interestRow}>
          {currentUser.interests.map((i) => (
            <View key={i} style={styles.interestPill}>
              <Text style={styles.interestText}>
                {INTEREST_EMOJI[i] ?? ''} {i}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <Card tone="white" padding="md" style={{ marginTop: spacing.md }}>
        <View style={styles.cardHeader}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Treffenstyp</Text>
        </View>
        <Text style={[typography.bodyStrong, { color: colors.textDark, marginTop: 2 }]}>
          {currentUser.meetingPreference === 'one_on_one'
            ? '1:1 Treffen'
            : currentUser.meetingPreference === 'group'
            ? 'Kleine Gruppe'
            : '1:1 oder Gruppe'}
        </Text>
      </Card>

      <Card tone="cream" padding="md" style={{ marginTop: spacing.md }}>
        <View style={styles.cardHeader}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Aktuelle Verfügbarkeit</Text>
          <Pressable onPress={() => navigation.navigate('AvailabilityEdit')}>
            <Text style={[typography.small, { color: colors.primary, fontWeight: '600' }]}>Ändern</Text>
          </Pressable>
        </View>
        {myAv ? (
          <>
            <Text style={[typography.bodyStrong, { color: colors.textDark, marginTop: 4 }]}>
              {formatDateLong(myAv.date)}
            </Text>
            <Text style={[typography.small, { color: colors.textSecondary, marginTop: 2 }]}>
              {formatTimeRange(myAv.startTime, myAv.endTime)} · {myAv.area}
            </Text>
          </>
        ) : (
          <Text style={[typography.body, { color: colors.textSecondary }]}>Keine Verfügbarkeit hinterlegt.</Text>
        )}
      </Card>

      <Card tone="white" padding="md" style={{ marginTop: spacing.md }}>
        <View style={styles.cardHeader}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Datenschutz</Text>
        </View>
        <PrivacyRow label="Nur Bereich teilen" value={currentUser.privacySettings.shareOnlyArea} />
        <PrivacyRow label="Genaues Alter verbergen" value={currentUser.privacySettings.hideExactAge} />
        <PrivacyRow label="Bio verbergen" value={currentUser.privacySettings.hideBio} />
      </Card>

      <View style={{ marginTop: spacing.xxl, gap: spacing.sm }}>
        <Button
          label="Verfügbarkeit ändern"
          variant="primary"
          fullWidth
          onPress={() => navigation.navigate('AvailabilityEdit')}
          iconLeft={<Ionicons name="calendar-outline" size={18} color="#fff" />}
        />
        <Button
          label="Vertrauensstatus ansehen"
          variant="secondary"
          fullWidth
          onPress={() => navigation.navigate('NoShow')}
        />
        <Button
          label="Sicherheit & Datenschutz"
          variant="secondary"
          fullWidth
          onPress={() => navigation.navigate('Safety')}
          iconLeft={<Ionicons name="shield-checkmark-outline" size={18} color={colors.textDark} />}
        />
        <Button label="Abmelden" variant="ghost" fullWidth onPress={onLogout} />
      </View>
    </Screen>
  );
};

const PrivacyRow: React.FC<{ label: string; value: boolean }> = ({ label, value }) => (
  <View style={styles.privacyRow}>
    <Text style={[typography.body, { color: colors.textDark }]}>{label}</Text>
    <Ionicons
      name={value ? 'checkmark-circle' : 'close-circle-outline'}
      size={20}
      color={value ? colors.success : colors.textMuted}
    />
  </View>
);

const styles = StyleSheet.create({
  header: { alignItems: 'center', paddingTop: spacing.md },
  name: {
    fontFamily: fonts.serif,
    fontSize: 28,
    lineHeight: 32,
    color: colors.textDark,
    marginTop: spacing.md,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  interestRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.sm },
  interestPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  interestText: { ...typography.small, color: colors.textDark, fontWeight: '600' },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
});

export default ProfileScreen;
