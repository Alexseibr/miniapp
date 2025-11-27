import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { TextField } from '../components/ui/TextField';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useGeoStore } from '../store/geoStore';

export type CreateAdLocationProps = NativeStackScreenProps<RootStackParamList, 'CreateAdLocation'>;

export const CreateAdStepLocationScreen: React.FC<CreateAdLocationProps> = () => {
  const { currentLocation, detectLocation, setRadius, radiusKm } = useGeoStore();
  const [city, setCity] = useState('');

  const handleUseCurrent = async () => {
    const location = await detectLocation();
    if (!location) {
      Alert.alert('Ошибка', 'Не удалось получить геопозицию');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Локация объявления</Text>
      <Text style={styles.caption}>Текущая точка: {currentLocation ? `${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}` : 'не выбрана'}</Text>
      <PrimaryButton title="Использовать мою геопозицию" onPress={handleUseCurrent} />
      <TextField label="Город" value={city} onChangeText={setCity} placeholder="Минск" />
      <TextField
        label="Радиус поиска (км)"
        value={String(radiusKm)}
        keyboardType="numeric"
        onChangeText={(value) => setRadius(Number(value) || 1)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050608', padding: 16 },
  title: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 6 },
  caption: { color: '#9ca3af', marginBottom: 12 }
});
