import { NavigatorScreenParams } from '@react-navigation/native';

export type OnboardingStackParamList = {
  Onboarding: undefined;
  Register: undefined;
  Login: undefined;
  ProfileSetup: undefined;
  Interests: undefined;
  Availability: { fromOnboarding?: boolean } | undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Matches: undefined;
  Meetings: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  OnboardingFlow: NavigatorScreenParams<OnboardingStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
  CafeSuggestion: { matchId: string };
  MeetingConfirmation: { matchId: string };
  LimitedChat: { matchId: string };
  QRCheckIn: { meetingId: string };
  NoShow: undefined;
  AvailabilityEdit: undefined;
  Icebreakers: { matchId: string };
  Safety: undefined;
};
