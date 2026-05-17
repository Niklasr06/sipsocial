import React, { useMemo } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import OnboardingNavigator from './OnboardingNavigator';
import MainTabs from './MainTabs';
import CafeSuggestionScreen from '../screens/CafeSuggestionScreen';
import MeetingConfirmationScreen from '../screens/MeetingConfirmationScreen';
import LimitedChatScreen from '../screens/LimitedChatScreen';
import QRCheckInScreen from '../screens/QRCheckInScreen';
import NoShowScreen from '../screens/NoShowScreen';
import AvailabilityEditScreen from '../screens/AvailabilityEditScreen';
import IcebreakerScreen from '../screens/IcebreakerScreen';
import SafetyPrivacyScreen from '../screens/SafetyPrivacyScreen';
import MeetingRescheduleScreen from '../screens/MeetingRescheduleScreen';
import ProfileEditScreen from '../screens/ProfileEditScreen';
import MatchScreen from '../screens/MatchScreen';
import { useApp } from '../store/AppContext';
import { colors } from '../theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator: React.FC = () => {
  const { currentUser } = useApp();
  const hasCompletedOnboarding = useMemo(() => {
    if (!currentUser) return false;
    // Availability ist nicht mehr Pflicht im Onboarding — User können
    // ohne Slot rein und über Profil → "Verfügbarkeit verwalten" pflegen.
    return currentUser.interests.length >= 3;
  }, [currentUser]);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      {!hasCompletedOnboarding ? (
        <Stack.Screen name="OnboardingFlow" component={OnboardingNavigator} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen
            name="CafeSuggestion"
            component={CafeSuggestionScreen}
            options={{ presentation: 'card' }}
          />
          <Stack.Screen name="MeetingConfirmation" component={MeetingConfirmationScreen} />
          <Stack.Screen
            name="LimitedChat"
            component={LimitedChatScreen}
            options={{ presentation: 'card' }}
          />
          <Stack.Screen name="QRCheckIn" component={QRCheckInScreen} />
          <Stack.Screen name="NoShow" component={NoShowScreen} />
          <Stack.Screen name="AvailabilityEdit" component={AvailabilityEditScreen} />
          <Stack.Screen
            name="Icebreakers"
            component={IcebreakerScreen}
            options={{ presentation: 'card' }}
          />
          <Stack.Screen name="Safety" component={SafetyPrivacyScreen} />
          <Stack.Screen name="MeetingReschedule" component={MeetingRescheduleScreen} />
          <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} />
          <Stack.Screen name="Matches" component={MatchScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default RootNavigator;
