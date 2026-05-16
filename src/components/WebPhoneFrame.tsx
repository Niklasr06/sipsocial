import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';

interface Props {
  children: React.ReactNode;
}

// Wraps the app in a phone-shaped frame when running in the web preview, so it
// looks like a mobile app instead of a full-width website. On native, this is
// a no-op and just renders the children.
export const WebPhoneFrame: React.FC<Props> = ({ children }) => {
  if (Platform.OS !== 'web') return <>{children}</>;

  return (
    <View style={styles.stage}>
      <View style={styles.brandSide}>
        <Text style={styles.brand}>SipSocial</Text>
        <Text style={styles.tagline}>Neue Kontakte beginnen mit einem Kaffee.</Text>
        <Text style={styles.hint}>
          Web-Vorschau · für eine echte Mobile-Ansicht öffne die App im iOS-Simulator,
          Android-Emulator oder per QR-Code in Expo Go.
        </Text>
      </View>
      <View style={styles.phoneOuter}>
        <View style={styles.phoneInner}>
          <View style={styles.notch} />
          <View style={styles.content}>{children}</View>
          <View style={styles.homeIndicator} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    backgroundColor: '#E8DFD2',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 24,
    gap: 36,
  },
  brandSide: {
    maxWidth: 360,
    paddingHorizontal: 16,
  },
  brand: {
    fontFamily: fonts.serif,
    fontSize: 18,
    letterSpacing: 4,
    color: colors.primary,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  tagline: {
    fontFamily: fonts.serif,
    fontSize: 36,
    lineHeight: 44,
    color: colors.textDark,
    marginBottom: 18,
  },
  hint: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  phoneOuter: {
    width: 390,
    height: 800,
    borderRadius: 56,
    padding: 8,
    backgroundColor: '#1F1610',
    shadowColor: '#2F241D',
    shadowOffset: { width: 0, height: 30 },
    shadowOpacity: 0.35,
    shadowRadius: 50,
  },
  phoneInner: {
    flex: 1,
    borderRadius: 48,
    overflow: 'hidden',
    backgroundColor: colors.background,
    position: 'relative',
  },
  notch: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    width: 120,
    height: 28,
    borderRadius: 16,
    backgroundColor: '#1F1610',
    zIndex: 10,
  },
  homeIndicator: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    width: 130,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#2F241D',
    opacity: 0.5,
    zIndex: 10,
  },
  content: { flex: 1, paddingTop: 36 },
});
