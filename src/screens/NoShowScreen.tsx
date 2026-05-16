import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Button, Card, Header, Screen, StatusPill } from '../components';
import { colors, fonts, radius, spacing, typography } from '../theme';
import { useApp } from '../store/AppContext';
import { calculateTrustStatus } from '../services/noShowService';

type Props = NativeStackScreenProps<RootStackParamList, 'NoShow'>;

const LEVELS = [
  {
    count: 0,
    title: 'Vertrauensvoll',
    description: 'Alles in Ordnung. Du erhältst alle passenden Vorschläge.',
    tone: 'success' as const,
  },
  {
    count: 1,
    title: 'Freundlicher Hinweis',
    description: 'Beim ersten Mal nur ein Hinweis. Bitte sag im Chat Bescheid, wenn etwas dazwischenkommt.',
    tone: 'info' as const,
  },
  {
    count: 2,
    title: 'Match-Funktion eingeschränkt',
    description: 'Nur noch ausgewählte Vorschläge — bis du wieder zu einem Treffen erscheinst.',
    tone: 'warning' as const,
  },
  {
    count: 3,
    title: 'Vorübergehend pausiert',
    description: 'Dein Konto pausiert für 14 Tage. Danach kannst du wieder ganz normal starten.',
    tone: 'danger' as const,
  },
];

const NoShowScreen: React.FC<Props> = ({ navigation }) => {
  const { currentUser, registerSelfNoShow } = useApp();
  if (!currentUser) return null;

  const info = calculateTrustStatus(currentUser.noShowCount);

  return (
    <Screen>
      <Header onBack={() => navigation.goBack()} title="Vertrauensstatus" />
      <Text style={styles.title}>So funktioniert unser No-Show-System.</Text>
      <Text style={styles.subline}>
        Damit Treffen verlässlich sind, achten wir gemeinsam darauf, dass Zusagen eingehalten werden — fair und transparent.
      </Text>

      <Card tone="cream" padding="lg" style={{ marginTop: spacing.xl }}>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>Dein aktueller Status</Text>
        <View style={styles.statusHeader}>
          <Text style={styles.statusTitle}>{info.title}</Text>
          <StatusPill label={info.badge} tone={info.level === 'none' ? 'success' : info.level === 'soft_warning' ? 'info' : info.level === 'limited_matches' ? 'warning' : 'danger'} />
        </View>
        <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm }]}>
          {info.description}
        </Text>

        <View style={styles.divider} />

        <Text style={[typography.caption, { color: colors.textSecondary }]}>No-Shows</Text>
        <View style={styles.dotRow}>
          {[0, 1, 2].map((i) => {
            const reached = i < currentUser.noShowCount;
            return <View key={i} style={[styles.dot, reached && styles.dotActive]} />;
          })}
          <Text style={[typography.small, { color: colors.textSecondary, marginLeft: spacing.sm }]}>
            {currentUser.noShowCount} von 3
          </Text>
        </View>
      </Card>

      <Text style={[typography.caption, styles.sectionLabel]}>Die Eskalationsstufen</Text>
      {LEVELS.map((lvl) => (
        <Card
          key={lvl.count}
          tone="white"
          padding="md"
          style={{
            marginBottom: spacing.sm,
            borderWidth: currentUser.noShowCount >= lvl.count ? 1.5 : 1,
            borderColor: currentUser.noShowCount === lvl.count ? colors.primary : colors.border,
          }}
        >
          <View style={styles.levelRow}>
            <View
              style={[
                styles.levelBadge,
                lvl.count === 0 && { backgroundColor: 'rgba(111,143,114,0.15)' },
                lvl.count === 1 && { backgroundColor: 'rgba(199,119,82,0.15)' },
                lvl.count === 2 && { backgroundColor: 'rgba(201,152,96,0.20)' },
                lvl.count === 3 && { backgroundColor: 'rgba(184,92,74,0.18)' },
              ]}
            >
              <Text
                style={[
                  styles.levelBadgeText,
                  lvl.count === 0 && { color: colors.success },
                  lvl.count === 1 && { color: colors.primary },
                  lvl.count === 2 && { color: colors.warning },
                  lvl.count === 3 && { color: colors.error },
                ]}
              >
                {lvl.count === 0 ? '✓' : lvl.count}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={[typography.bodyStrong, { color: colors.textDark }]}>{lvl.title}</Text>
              <Text style={[typography.small, { color: colors.textSecondary, marginTop: 2 }]}>
                {lvl.description}
              </Text>
            </View>
          </View>
        </Card>
      ))}

      <Card tone="white" padding="md" style={{ marginTop: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <Ionicons name="bug-outline" size={18} color={colors.textSecondary} />
          <Text style={[typography.small, { color: colors.textSecondary, marginLeft: spacing.sm, flex: 1 }]}>
            Demo-Funktion: Du kannst einen No-Show simulieren, um die Eskalation zu testen.
          </Text>
        </View>
        <Button
          label="No-Show simulieren"
          variant="ghost"
          size="md"
          onPress={() => registerSelfNoShow()}
          style={{ alignSelf: 'flex-start', marginTop: spacing.sm }}
        />
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.serif,
    fontSize: 26,
    lineHeight: 32,
    color: colors.textDark,
    marginTop: spacing.sm,
  },
  subline: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  statusTitle: {
    fontFamily: fonts.serif,
    fontSize: 22,
    color: colors.textDark,
    flex: 1,
    paddingRight: spacing.md,
  },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.lg, opacity: 0.7 },
  dotRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  dotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  sectionLabel: { color: colors.textSecondary, marginTop: spacing.xxl, marginBottom: spacing.sm },
  levelRow: { flexDirection: 'row', alignItems: 'center' },
  levelBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBadgeText: { fontFamily: fonts.serif, fontSize: 17, fontWeight: '700' },
});

export default NoShowScreen;
