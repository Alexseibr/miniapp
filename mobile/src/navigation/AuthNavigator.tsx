import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { LoginPhoneScreen } from '../screens/LoginPhoneScreen';
import { VerifyCodeScreen } from '../screens/VerifyCodeScreen';

export type AuthStackParamList = {
  Onboarding: undefined;
  LoginPhone: undefined;
  VerifyCode: { phone: string };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Onboarding" component={OnboardingScreen} />
    <Stack.Screen name="LoginPhone" component={LoginPhoneScreen} />
    <Stack.Screen name="VerifyCode" component={VerifyCodeScreen} />
  </Stack.Navigator>
);
