import { NavigatorScreenParams } from '@react-navigation/native';

export type OnboardingStackParamList = {
  Onboarding: undefined;
  Register: undefined;
  Login: undefined;
  PasswordResetRequest: undefined;
  PasswordResetConfirm: { email?: string } | undefined;
  ProfileSetup: undefined;
  Interests: undefined;
  Legal: { document: 'impressum' | 'datenschutz' | 'nutzungsbedingungen' };
};

export type MainTabParamList = {
  Home: undefined;
  Chat: undefined;
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
  MeetingReschedule: { meetingId: string };
  ProfileEdit: undefined;
  Matches: undefined;
  Legal: { document: 'impressum' | 'datenschutz' | 'nutzungsbedingungen' };
};
