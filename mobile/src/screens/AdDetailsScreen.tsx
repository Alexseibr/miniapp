import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { AdDetails } from '../types';
import { adsApi } from '../api/adsApi';
import { favoritesApi } from '../api/favoritesApi';
import { openTelegramBot } from '../services/telegramService';

export const AdDetailsScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'AdDetails'>>();
  const [ad, setAd] = useState<AdDetails | null>(null);

  useEffect(() => {
    adsApi
      .getById(route.params.adId)
      .then((res) => setAd(res.data.data || null))
      .catch(() => Alert.alert('Ошибка', 'Не удалось загрузить объявление'));
  }, [route.params.adId]);

  const handleFavorite = async () => {
    if (!ad) return;
    try {
      await favoritesApi.add(ad._id);
      Alert.alert('Готово', 'Добавлено в избранное');
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось добавить в избранное');
    }
  };

  if (!ad) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Загрузка...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      {ad.photos?.[0] ? <Image source={{ uri: ad.photos[0] }} style={styles.image} /> : null}
      <Text style={styles.title}>{ad.title}</Text>
      <Text style={styles.price}>{ad.price ? `${ad.price} ${ad.currency ?? '₽'}` : 'Цена не указана'}</Text>
      <Text style={styles.meta}>{ad.city || 'Город не указан'} {ad.distanceKm ? `• ${ad.distanceKm.toFixed(1)} км` : ''}</Text>
      <Text style={styles.description}>{ad.description || 'Описание отсутствует'}</Text>

      <TouchableOpacity style={styles.button} onPress={handleFavorite}>
        <Text style={styles.buttonText}>Добавить в избранное</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, styles.secondary]} onPress={() => openTelegramBot()}>
        <Text style={styles.buttonText}>Обсудить в Telegram</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050608', padding: 16 },
  loading: { color: '#fff', marginTop: 20 },
  image: { width: '100%', height: 220, borderRadius: 12, marginBottom: 12, backgroundColor: '#111827' },
  title: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 6 },
  price: { color: '#00f5d4', fontSize: 18, marginBottom: 6 },
  meta: { color: '#9ca3af', marginBottom: 12 },
  description: { color: '#d1d5db', marginBottom: 20 },
  button: {
    backgroundColor: '#00f5d4',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10
  },
  secondary: {
    backgroundColor: '#111827'
  },
  buttonText: { color: '#050608', fontWeight: '700' }
});
