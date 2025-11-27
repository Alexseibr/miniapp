import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { TextField } from '../components/ui/TextField';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { adsApi } from '../api/adsApi';
import { RootStackParamList } from '../navigation/AppNavigator';

export type CreateAdProps = NativeStackScreenProps<RootStackParamList, 'CreateAd'>;

export const CreateAdScreen: React.FC<CreateAdProps> = ({ navigation }) => {
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const payload = {
        title,
        price: Number(price),
        categoryId,
        subcategoryId,
        city,
        description
      };
      const response = await adsApi.create(payload);
      const created = response.data.data;
      if (created) {
        navigation.replace('AdDetails', { adId: created._id });
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось создать объявление');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Новое объявление</Text>
      <TextField label="Категория" value={categoryId} onChangeText={setCategoryId} placeholder="farm" />
      <TextField label="Подкатегория" value={subcategoryId} onChangeText={setSubcategoryId} placeholder="berries" />
      <TextField label="Название" value={title} onChangeText={setTitle} placeholder="Свежая клубника" />
      <TextField label="Цена" value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="10" />
      <TextField label="Город" value={city} onChangeText={setCity} placeholder="Минск" />
      <TextField label="Описание" value={description} onChangeText={setDescription} placeholder="Описание товара" />
      <PrimaryButton
        title="Продолжить к локации"
        onPress={() => navigation.navigate('CreateAdLocation')}
        disabled={!title || !categoryId || !subcategoryId}
      />
      <PrimaryButton title="Создать" onPress={handleCreate} loading={loading} disabled={!title || !categoryId} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050608', padding: 16 },
  title: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 12 }
});
