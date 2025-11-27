import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { authApi } from '../api/authApi';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { TextField } from '../components/ui/TextField';
import { useAuthStore } from '../store/authStore';
import { AuthStackParamList } from '../navigation/AuthNavigator';

export type VerifyCodeProps = NativeStackScreenProps<AuthStackParamList, 'VerifyCode'>;

export const VerifyCodeScreen: React.FC<VerifyCodeProps> = ({ route }) => {
  const { phone } = route.params;
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const setTokens = useAuthStore((state) => state.setTokens);
  const fetchMe = useAuthStore((state) => state.fetchMe);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const response = await authApi.confirmCode({ phone, code });
      const tokens = response.data.data;
      if (tokens?.accessToken) {
        await setTokens(tokens);
        await fetchMe();
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Неверный код.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Код из SMS</Text>
      <Text style={styles.caption}>Мы отправили код на {phone}</Text>
      <TextField label="Код" value={code} keyboardType="numeric" onChangeText={setCode} placeholder="1234" />
      <PrimaryButton title="Войти" onPress={handleConfirm} loading={loading} disabled={code.length < 4} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050608',
    padding: 24
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4
  },
  caption: {
    color: '#9ca3af',
    marginBottom: 12
  }
});
