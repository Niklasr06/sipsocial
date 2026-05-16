/**
 * Expo Push token registration + foreground notification handler.
 *
 * Web is intentionally skipped: ``expo-notifications`` doesn't support web
 * push without extra service-worker setup, and Expo's own docs flag the
 * web getDevicePushToken path as unsupported. We just no-op gracefully.
 *
 * Native (iOS/Android via Expo Go or a custom dev client):
 *   1. Ensure permission (request if not yet granted).
 *   2. Pull an Expo push token via ``getExpoPushTokenAsync``.
 *   3. Send it to the backend so it can address pushes to this device.
 *
 * The handler is registered once at module import so taps + foreground
 * banners behave consistently across the app.
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import { userApi } from './userApi';
import { isApiUnavailable } from './apiClient';

// Foreground: actually show the banner + play sound. Without this, pushes
// only surface when the app is in the background.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const EAS_PROJECT_ID =
  (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
  (Constants.easConfig as { projectId?: string } | undefined)?.projectId ??
  undefined;

async function ensurePermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  if (!existing.canAskAgain) return false;
  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

/**
 * Best-effort: never throws. Returns the token on success so the caller
 * can log it if they want. Silently no-ops on web, on simulators, or when
 * the user denies the permission prompt.
 */
export async function registerPushTokenForCurrentUser(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  if (!Device.isDevice) {
    // Push tokens are not handed out on simulators / emulators.
    return null;
  }

  try {
    if (Platform.OS === 'android') {
      // A default channel is required so notifications actually appear on
      // Android 8+; channel settings are user-facing in OS settings.
      await Notifications.setNotificationChannelAsync('default', {
        name: 'SipSocial',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const allowed = await ensurePermission();
    if (!allowed) return null;

    const tokenResp = await Notifications.getExpoPushTokenAsync(
      EAS_PROJECT_ID ? { projectId: EAS_PROJECT_ID } : undefined,
    );
    const token = tokenResp.data;
    if (!token) return null;

    try {
      await userApi.setPushToken(token);
    } catch (err) {
      // Backend offline / not yet authenticated — keep the token, the next
      // session bootstrap will retry.
      if (!isApiUnavailable(err)) {
        // eslint-disable-next-line no-console
        console.warn('[push] failed to register token with backend:', err);
      }
    }

    return token;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[push] registration failed:', err);
    return null;
  }
}

export async function clearPushTokenForCurrentUser(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await userApi.setPushToken(null);
  } catch {
    // best-effort; if the backend is offline we don't really care
  }
}
