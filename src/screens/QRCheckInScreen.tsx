import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import {
  Avatar,
  Button,
  Card,
  Header,
  Screen,
  StatusPill,
} from '../components';
import { colors, fonts, radius, spacing, typography } from '../theme';
import { useApp } from '../store/AppContext';
import { isUserCheckedIn } from '../services/checkInService';

type Props = NativeStackScreenProps<RootStackParamList, 'QRCheckIn'>;

const QRCheckInScreen: React.FC<Props> = ({ navigation, route }) => {
  const { meetingId } = route.params;
  const {
    meetings,
    matches,
    currentUser,
    getUser,
    getCafe,
    checkInToMeeting,
    simulateOtherUserCheckIn,
  } = useApp();

  const meeting = meetings.find((m) => m.id === meetingId);
  const match = useMemo(
    () => (meeting ? matches.find((mm) => mm.id === meeting.matchId) : null),
    [meeting, matches],
  );

  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const lockRef = useRef(false);

  if (!meeting || !match || !currentUser) {
    return (
      <Screen>
        <Header onBack={() => navigation.goBack()} title="Check-in" />
        <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.lg }]}>
          Treffen nicht verfügbar.
        </Text>
      </Screen>
    );
  }

  const otherUserId = match.userAId === currentUser.id ? match.userBId : match.userAId;
  const other = getUser(otherUserId);
  const cafe = getCafe(meeting.cafeId);

  const meCheckedIn = isUserCheckedIn(meeting, currentUser.id);
  const otherCheckedIn = isUserCheckedIn(meeting, otherUserId);
  const both = meCheckedIn && otherCheckedIn;

  const status =
    meeting.status === 'completed'
      ? 'Treffen abgeschlossen'
      : both
      ? 'Beide eingecheckt'
      : meCheckedIn
      ? `Wartet auf ${other?.pseudonym ?? 'Match'}`
      : otherCheckedIn
      ? `${other?.pseudonym ?? 'Match'} ist da`
      : 'Wartet auf Check-in';

  const tone =
    both ? 'success' : meCheckedIn || otherCheckedIn ? 'warning' : 'info';

  const submitToken = useCallback(
    async (token: string) => {
      if (submitting) return;
      setSubmitting(true);
      setScanError(null);
      const res = await checkInToMeeting(meetingId, token);
      setSubmitting(false);
      if (res.ok) {
        setScannerOpen(false);
      } else {
        setScanError(res.reason ?? 'Check-in fehlgeschlagen.');
      }
    },
    [checkInToMeeting, meetingId, submitting],
  );

  const onOpenScanner = () => {
    setScanError(null);
    lockRef.current = false;
    setScannerOpen(true);
  };

  const onSimulateOther = () => {
    if (otherCheckedIn) return;
    simulateOtherUserCheckIn(meetingId, otherUserId);
  };

  return (
    <Screen>
      <Header onBack={() => navigation.goBack()} title="Check-in" subtitle={cafe?.name} />
      <Text style={styles.title}>Zeig deinen QR-Code im Café.</Text>
      <Text style={styles.subline}>
        Beide scannen kurz beim Treffen. So ist klar, dass ihr da seid — fair und ohne Verpflichtungen.
      </Text>

      <Card tone="white" padding="lg" style={{ marginTop: spacing.xl, alignItems: 'center' }}>
        <View style={styles.qrFrame}>
          <QRCode value={meeting.qrCode} size={220} backgroundColor="#FFFFFF" color={colors.textDark} />
        </View>
        <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.md }]}>
          Treffen #{meeting.id.slice(-6).toUpperCase()}
        </Text>

        <View style={{ marginTop: spacing.md }}>
          <StatusPill label={status} tone={tone as any} />
        </View>

        <View style={styles.checkInRow}>
          <CheckIndicator
            label="Du"
            checked={meCheckedIn}
            initials={currentUser.initials}
            color={currentUser.accentColor}
          />
          <View style={styles.line} />
          <CheckIndicator
            label={other?.pseudonym ?? 'Match'}
            checked={otherCheckedIn}
            initials={other?.initials ?? '··'}
            color={other?.accentColor ?? colors.primary}
          />
        </View>
      </Card>

      <Card tone="cream" padding="md" style={{ marginTop: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
          <Text style={[typography.small, { color: colors.textSecondary, marginLeft: spacing.sm, flex: 1 }]}>
            Tippe „QR-Code scannen", richte die Kamera auf den QR-Code deines Matches und du wirst eingecheckt.
            Der Code ist signiert und nur für dieses eine Treffen gültig.
          </Text>
        </View>
      </Card>

      <View style={{ marginTop: spacing.xxl, gap: spacing.md }}>
        <Button
          label={meCheckedIn ? 'Du bist eingecheckt' : 'QR-Code scannen'}
          variant={meCheckedIn ? 'secondary' : 'primary'}
          disabled={meCheckedIn || submitting}
          loading={submitting}
          fullWidth
          onPress={onOpenScanner}
          iconLeft={!meCheckedIn ? <Ionicons name="qr-code-outline" size={18} color="#fff" /> : null}
        />
        <Button
          label={otherCheckedIn ? `${other?.pseudonym ?? 'Match'} ist eingecheckt` : `${other?.pseudonym ?? 'Match'} Check-in simulieren`}
          variant="secondary"
          fullWidth
          disabled={otherCheckedIn}
          onPress={onSimulateOther}
        />
        {both ? (
          <Button
            label="Zur Übersicht"
            variant="success"
            fullWidth
            onPress={() => navigation.navigate('Main', { screen: 'Meetings' })}
            iconLeft={<Ionicons name="checkmark" size={18} color="#fff" />}
          />
        ) : null}
      </View>

      <ScannerModal
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanned={(token) => {
          if (lockRef.current) return;
          lockRef.current = true;
          submitToken(token).finally(() => {
            // brief delay so a re-scan doesn't immediately retrigger before
            // the modal animates closed
            setTimeout(() => {
              lockRef.current = false;
            }, 600);
          });
        }}
        error={scanError}
        busy={submitting}
      />
    </Screen>
  );
};

interface ScannerProps {
  visible: boolean;
  onClose: () => void;
  onScanned: (token: string) => void;
  error: string | null;
  busy: boolean;
}

const ScannerModal: React.FC<ScannerProps> = ({ visible, onClose, onScanned, error, busy }) => {
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    if (visible && permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [visible, permission, requestPermission]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
      <View style={styles.scannerRoot}>
        <View style={styles.scannerHeader}>
          <Pressable onPress={onClose} hitSlop={12} style={styles.scannerClose}>
            <Ionicons name="close" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.scannerTitle}>QR-Code scannen</Text>
          <View style={{ width: 32 }} />
        </View>

        <View style={styles.scannerBody}>
          {permission?.granted ? (
            <CameraView
              style={StyleSheet.absoluteFill}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={busy ? undefined : ({ data }) => onScanned(data)}
            />
          ) : (
            <View style={styles.scannerPlaceholder}>
              <Ionicons name="camera-outline" size={48} color="#fff" />
              <Text style={styles.scannerHint}>
                {Platform.OS === 'web'
                  ? 'Bitte Kamera-Zugriff im Browser erlauben.'
                  : 'Bitte erlaube den Kamera-Zugriff in den Einstellungen.'}
              </Text>
              {permission?.canAskAgain ? (
                <Button label="Zugriff erlauben" variant="primary" onPress={requestPermission} />
              ) : null}
            </View>
          )}

          <View pointerEvents="none" style={styles.scannerFrame} />
        </View>

        {error ? (
          <View style={styles.scannerError}>
            <Ionicons name="alert-circle" size={18} color="#fff" />
            <Text style={styles.scannerErrorText}>{error}</Text>
          </View>
        ) : (
          <Text style={styles.scannerFooter}>
            Richte die Kamera auf den QR-Code im Café-Display deines Matches.
          </Text>
        )}
      </View>
    </Modal>
  );
};

const CheckIndicator: React.FC<{
  label: string;
  checked: boolean;
  initials: string;
  color: string;
}> = ({ label, checked, initials, color }) => (
  <View style={{ alignItems: 'center', flex: 1 }}>
    <View style={{ position: 'relative' }}>
      <Avatar initials={initials} color={color} size={56} />
      {checked ? (
        <View style={styles.checkBadge}>
          <Ionicons name="checkmark" size={14} color="#fff" />
        </View>
      ) : null}
    </View>
    <Text style={[typography.small, { color: colors.textDark, marginTop: spacing.sm, fontWeight: '600' }]}>
      {label}
    </Text>
    <Text style={[typography.caption, { color: checked ? colors.success : colors.textMuted }]}>
      {checked ? 'Eingecheckt' : 'Wartet'}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.serif,
    fontSize: 24,
    lineHeight: 30,
    color: colors.textDark,
    marginTop: spacing.sm,
  },
  subline: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
  qrFrame: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    alignSelf: 'stretch',
  },
  line: { height: 1, backgroundColor: colors.border, flex: 1, marginHorizontal: spacing.md },
  checkBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  scannerRoot: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerHeader: {
    paddingTop: 60,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#000',
  },
  scannerClose: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  scannerTitle: { color: '#fff', fontSize: 17, fontWeight: '600' },
  scannerBody: { flex: 1, position: 'relative' },
  scannerPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  scannerHint: {
    color: '#fff',
    textAlign: 'center',
    opacity: 0.85,
  },
  scannerFrame: {
    position: 'absolute',
    top: '20%',
    left: '15%',
    right: '15%',
    aspectRatio: 1,
    borderColor: '#fff',
    borderWidth: 2,
    borderRadius: 24,
  },
  scannerError: {
    backgroundColor: '#7a1a1a',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  scannerErrorText: { color: '#fff', flex: 1 },
  scannerFooter: {
    backgroundColor: '#111',
    color: '#fff',
    opacity: 0.85,
    padding: spacing.md,
    textAlign: 'center',
  },
});

export default QRCheckInScreen;
