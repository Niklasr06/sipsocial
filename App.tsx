import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  NavigationContainer,
  DefaultTheme,
  createNavigationContainerRef,
} from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { AppStateProvider } from './src/store/AppContext';
import RootNavigator from './src/navigation/RootNavigator';
import { ErrorBoundary, WebPhoneFrame } from './src/components';
import { colors } from './src/theme';
import { RootStackParamList } from './src/navigation/types';

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.surface,
    primary: colors.primary,
    text: colors.textDark,
    border: colors.border,
  },
};

const navRef = createNavigationContainerRef<RootStackParamList>();

// Route a tapped push notification to the right screen. The ``data`` shape
// is whatever the backend's notification_service attached when sending —
// we silently ignore unknown types so old clients don't crash on new pushes.
function handleNotificationResponse(
  response: Notifications.NotificationResponse,
): void {
  if (!navRef.isReady()) return;
  const data = response.notification.request.content.data as
    | { type?: string; match_id?: string; meeting_id?: string }
    | undefined;
  if (!data?.type) return;

  if (data.type === 'chat_message' && data.match_id) {
    navRef.navigate('LimitedChat', { matchId: data.match_id });
  } else if (data.type === 'match_accepted' && data.match_id) {
    navRef.navigate('Main', { screen: 'Matches' });
  } else if (
    (data.type === 'meeting_created' || data.type === 'meeting_reminder') &&
    data.meeting_id
  ) {
    navRef.navigate('QRCheckIn', { meetingId: data.meeting_id });
  } else if (
    (data.type === 'meeting_cancelled' || data.type === 'meeting_rescheduled') &&
    data.meeting_id
  ) {
    navRef.navigate('Main', { screen: 'Meetings' });
  }
}

export default function App() {
  const tapSub = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    tapSub.current = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse,
    );
    // If the app was opened cold from a notification, handle that too.
    Notifications.getLastNotificationResponseAsync().then((r) => {
      if (r) handleNotificationResponse(r);
    });
    return () => {
      tapSub.current?.remove();
      tapSub.current = null;
    };
  }, []);

  return (
    <ErrorBoundary>
      <WebPhoneFrame>
        <SafeAreaProvider>
          <AppStateProvider>
            <NavigationContainer ref={navRef} theme={navTheme}>
              <StatusBar style="dark" />
              <RootNavigator />
            </NavigationContainer>
          </AppStateProvider>
        </SafeAreaProvider>
      </WebPhoneFrame>
    </ErrorBoundary>
  );
}
