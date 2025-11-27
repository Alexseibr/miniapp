import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthNavigator';

type Props = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

const OnboardingScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>KETMAR Market</Text>
      <Text style={styles.subtitle}>
        Геомаркетплейс рядом с тобой: фермеры, магазины и частники возле твоей точки.
      </Text>
      <Button title="Продолжить" onPress={() => navigation.replace('LoginPhone')} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617', padding: 24, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: '#e5e7eb', marginBottom: 16 },
  subtitle: { fontSize: 16, color: '#9ca3af', marginBottom: 24 },
});

export default OnboardingScreen;
