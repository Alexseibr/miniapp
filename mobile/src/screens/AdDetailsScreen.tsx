import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../navigation/AppNavigator';
import { adsApi, AdDetails } from '../api/adsApi';

type Props = NativeStackScreenProps<HomeStackParamList, 'AdDetails'>;

const TELEGRAM_BOT_USERNAME = 'KetmarM_bot'; // поменяй, если другое имя

const AdDetailsScreen: React.FC<Props> = ({ route }) => {
  const { adId } = route.params;
  const [ad, setAd] = useState<AdDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await adsApi.getAdById(adId);
        setAd(res.data);
      } catch (e: any) {
        console.warn('getAdById error', e);
        setError(e?.message || 'Не удалось загрузить объявление');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [adId]);

  const openTelegramBot = () => {
    // сначала пытаемся открыть tg://, если не выйдет — https-ссылку
    const deepLink = `tg://resolve?domain=${TELEGRAM_BOT_USERNAME}`;
    const webLink = `https://t.me/${TELEGRAM_BOT_USERNAME}`;

    Linking.openURL(deepLink).catch(() => {
      Linking.openURL(webLink).catch((err) =>
        console.warn('Telegram open error', err)
      );
    });
  };

  if (loading && !ad) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#22c55e" />
        <Text style={styles.loadingText}>Загружаем объявление…</Text>
      </View>
    );
  }

  if (error && !ad) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!ad) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Объявление не найдено</Text>
      </View>
    );
  }

  const mainPhoto =
    ad.previewUrl || (ad.photos && ad.photos.length > 0 ? ad.photos[0] : null);

  return (
    <ScrollView style={styles.container}>
      {mainPhoto && (
        <Image source={{ uri: mainPhoto }} style={styles.mainPhoto} />
      )}

      <View style={styles.content}>
        <Text style={styles.title}>{ad.title}</Text>

        <Text style={styles.price}>
          {ad.price} {ad.currency}
        </Text>

        {ad.location && (
          <Text style={styles.location}>
            {ad.location.city}
            {ad.location.area ? `, ${ad.location.area}` : ''}
            {ad.distanceKm != null
              ? ` • ${ad.distanceKm.toFixed(1)} км от вас`
              : ''}
          </Text>
        )}

        {ad.description && (
          <>
            <Text style={styles.sectionTitle}>Описание</Text>
            <Text style={styles.description}>{ad.description}</Text>
          </>
        )}

        {/* Галерея дополнительных фото */}
        {ad.photos && ad.photos.length > 1 && (
          <>
            <Text style={styles.sectionTitle}>Фотографии</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.photosRow}
            >
              {ad.photos.map((url, idx) => (
                <Image key={idx} source={{ uri: url }} style={styles.photoThumb} />
              ))}
            </ScrollView>
          </>
        )}

        <View style={styles.buttonsBlock}>
          <TouchableOpacity style={styles.buttonPrimary} onPress={openTelegramBot}>
            <Text style={styles.buttonPrimaryText}>Открыть в Telegram</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  center: {
    flex: 1,
    backgroundColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: { marginTop: 12, color: '#e5e7eb' },
  errorText: { color: '#fecaca' },
  mainPhoto: { width: '100%', height: 260, backgroundColor: '#020617' },
  content: { padding: 16 },
  title: { color: '#e5e7eb', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  price: { color: '#22c55e', fontSize: 18, fontWeight: '600', marginBottom: 4 },
  location: { color: '#9ca3af', marginBottom: 16 },
  sectionTitle: {
    color: '#e5e7eb',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  description: { color: '#e5e7eb', lineHeight: 20 },
  photosRow: { marginTop: 8 },
  photoThumb: {
    width: 96,
    height: 96,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#020617',
  },
  buttonsBlock: { marginTop: 20 },
  buttonPrimary: {
    backgroundColor: '#22c55e',
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonPrimaryText: {
    color: '#022c22',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AdDetailsScreen;
