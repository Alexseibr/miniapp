import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View } from 'react-native';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
import { useAuthStore } from '../store/authStore';

export const RootNavigator = () => {
  const { accessToken, onboardingCompleted, hydrate, user } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    hydrate().finally(() => setHydrated(true));
  }, [hydrate]);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#050608' }}>
        <ActivityIndicator color="#00f5d4" />
      </View>
    );
  }

  const isAuthenticated = Boolean(accessToken && user);
  const shouldShowOnboarding = !onboardingCompleted;

  return (
    <NavigationContainer>{isAuthenticated && !shouldShowOnboarding ? <AppNavigator /> : <AuthNavigator />}</NavigationContainer>
  );
};
