import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthNavigator';
import { useAuthStore } from '../store/authStore';

type Props = NativeStackScreenProps<AuthStackParamList, 'VerifyCode'>;

const VerifyCodeScreen: React.FC<Props> = ({ route }) => {
  const { phone } = route.params;
  const [code, setCode] = useState('');
  const verifyCode = useAuthStore((s) => s.verifyCode);
  const loading = useAuthStore((s) => s.loading);

  const handleVerify = async () => {
    if (!code) return;
    await verifyCode(phone, code);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Код из SMS/Telegram</Text>
      <Text style={styles.subtitle}>Мы отправили код на {phone}</Text>
      <TextInput
        style={styles.input}
        placeholder="Код"
        placeholderTextColor="#6b7280"
        keyboardType="number-pad"
        value={code}
        onChangeText={setCode}
      />
      <Button title={loading ? 'Проверяем...' : 'Подтвердить'} onPress={handleVerify} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617', padding: 24, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '600', color: '#e5e7eb', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#9ca3af', marginBottom: 16 },
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

export default VerifyCodeScreen;
