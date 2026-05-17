import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from './types';
import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import PasswordResetRequestScreen from '../screens/PasswordResetRequestScreen';
import PasswordResetConfirmScreen from '../screens/PasswordResetConfirmScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';
import InterestsScreen from '../screens/InterestsScreen';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

const OnboardingNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F7F1E8' } }}>
    <Stack.Screen name="Onboarding" component={OnboardingScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="PasswordResetRequest" component={PasswordResetRequestScreen} />
    <Stack.Screen name="PasswordResetConfirm" component={PasswordResetConfirmScreen} />
    <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
    <Stack.Screen name="Interests" component={InterestsScreen} />
  </Stack.Navigator>
);

export default OnboardingNavigator;
