import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthNavigator';
import { useAuthStore } from '../store/authStore';

type Props = NativeStackScreenProps<AuthStackParamList, 'LoginPhone'>;

const LoginPhoneScreen: React.FC<Props> = ({ navigation }) => {
  const [phone, setPhone] = useState('');
  const requestPhoneCode = useAuthStore((s) => s.requestPhoneCode);
  const loading = useAuthStore((s) => s.loading);

  const handleContinue = async () => {
    if (!phone) return;
    await requestPhoneCode(phone);
    navigation.navigate('VerifyCode', { phone });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Вход по телефону</Text>
      <TextInput
        style={styles.input}
        placeholder="+375..."
        placeholderTextColor="#6b7280"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />
      <Button title={loading ? 'Отправка...' : 'Получить код'} onPress={handleContinue} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617', padding: 24, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '600', color: '#e5e7eb', marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#4b5563',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f9fafb',
    marginBottom: 16,
  },
});

export default LoginPhoneScreen;
