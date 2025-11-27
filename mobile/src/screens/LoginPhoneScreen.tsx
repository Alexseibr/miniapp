import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { authApi } from '../api/authApi';
import { TextField } from '../components/ui/TextField';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { AuthStackParamList } from '../navigation/AuthNavigator';

export type LoginPhoneProps = NativeStackScreenProps<AuthStackParamList, 'LoginPhone'>;

export const LoginPhoneScreen: React.FC<LoginPhoneProps> = ({ navigation }) => {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestCode = async () => {
    setLoading(true);
    try {
      await authApi.requestCode({ phone });
      navigation.navigate('VerifyCode', { phone });
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось запросить код. Проверьте номер.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Вход по телефону</Text>
      <TextField
        label="Телефон"
        value={phone}
        placeholder="+375291234567"
        keyboardType="phone-pad"
        onChangeText={setPhone}
      />
      <PrimaryButton title="Получить код" onPress={handleRequestCode} loading={loading} disabled={!phone} />
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
    marginBottom: 12
  }
});
