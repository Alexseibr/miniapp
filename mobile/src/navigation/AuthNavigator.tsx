import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import OnboardingScreen from '../screens/OnboardingScreen';
import LoginPhoneScreen from '../screens/LoginPhoneScreen';
import VerifyCodeScreen from '../screens/VerifyCodeScreen';

export type AuthStackParamList = {
  Onboarding: undefined;
  LoginPhone: undefined;
  VerifyCode: { phone: string };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

const AuthNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Onboarding"
        component={OnboardingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="LoginPhone"
        component={LoginPhoneScreen}
        options={{ title: 'Вход по телефону' }}
      />
      <Stack.Screen
        name="VerifyCode"
        component={VerifyCodeScreen}
        options={{ title: 'Подтверждение кода' }}
      />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
