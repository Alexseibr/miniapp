import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { useAuthStore } from '../store/authStore';
import { AuthStackParamList } from '../navigation/AuthNavigator';

export type OnboardingProps = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

export const OnboardingScreen: React.FC<OnboardingProps> = ({ navigation }) => {
  const markOnboarding = useAuthStore((state) => state.markOnboarding);

  const handleContinue = async () => {
    await markOnboarding();
    navigation.replace('LoginPhone');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>KETMAR Market</Text>
      <Text style={styles.subtitle}>Объявления фермеров, магазинов и частников вокруг вас. Подключено к Telegram.</Text>
      <PrimaryButton title="Продолжить" onPress={handleContinue} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050608',
    padding: 24,
    justifyContent: 'center'
  },
  title: {
    color: '#00f5d4',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 12
  },
  subtitle: {
    color: '#d1d5db',
    fontSize: 16,
    marginBottom: 24
  }
});
