import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import RootNavigator from './navigation/RootNavigator';
import { useAuthStore } from './store/authStore';

SplashScreen.preventAutoHideAsync().catch(() => {});

const App = () => {
  const initAuthFromStorage = useAuthStore((s) => s.initFromStorage);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const prepare = async () => {
      try {
        await initAuthFromStorage();
      } catch (e) {
        console.warn('Auth init error', e);
      } finally {
        setIsReady(true);
        SplashScreen.hideAsync().catch(() => {});
      }
    };
    prepare();
  }, [initAuthFromStorage]);

  if (!isReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

export default App;
