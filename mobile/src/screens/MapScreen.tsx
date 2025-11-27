import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppTabParamList } from '../navigation/AppNavigator';
import { locationService } from '../services/locationService';
import { adsApi, AdListItem } from '../api/adsApi';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<AppTabParamList, 'Map'>;

const DEFAULT_RADIUS_KM = 5;

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const DEFAULT_LAT_DELTA = 0.05;
const DEFAULT_LNG_DELTA = DEFAULT_LAT_DELTA * ASPECT_RATIO;

const MapScreen: React.FC<Props> = () => {
  const [region, setRegion] = useState<Region | null>(null);
  const [ads, setAds] = useState<AdListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();

  const loadAds = useCallback(
    async (lat: number, lng: number) => {
      try {
        setError(null);
        setLoading(true);

        const res = await adsApi.listAds({
          lat,
          lng,
          radiusKm: DEFAULT_RADIUS_KM,
          sort: 'distance',
          limit: 50,
        });

        setAds(res.data.items || []);
      } catch (e: any) {
        console.warn('Map ads load error', e);
        setError(e?.message || 'Ошибка загрузки объявлений на карте');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const init = async () => {
      try {
        const loc = await locationService.getCurrentLocation();
        if (!loc) {
          setError('Нет доступа к геолокации');
          return;
        }

        const nextRegion: Region = {
          latitude: loc.lat,
          longitude: loc.lng,
          latitudeDelta: DEFAULT_LAT_DELTA,
          longitudeDelta: DEFAULT_LNG_DELTA,
        };
        setRegion(nextRegion);
        await loadAds(loc.lat, loc.lng);
      } catch (e: any) {
        console.warn('Map init error', e);
        setError(e?.message || 'Ошибка инициализации карты');
      }
    };
    init();
  }, [loadAds]);

  if (!region) {
    return (
      <View style={styles.center}>
        {loading ? (
          <>
            <ActivityIndicator size="large" color="#22c55e" />
            <Text style={styles.loadingText}>Определяем ваше местоположение…</Text>
          </>
        ) : (
          <Text style={styles.errorText}>{error || 'Нет данных для карты'}</Text>
        )}
      </View>
    );
  }

  const handleMarkerPress = (adId: string) => {
    navigation.navigate('AdDetails', { adId });
  };

  return (
    <View style={styles.container}>
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        onRegionChangeComplete={(r) => setRegion(r)}
      >
        {ads.map((ad) => {
          if (!ad.location) return null;
          return (
            <Marker
              key={ad._id}
              coordinate={{
                latitude: ad.location.lat,
                longitude: ad.location.lng,
              }}
              title={ad.title}
              description={`${ad.price} ${ad.currency}`}
              onPress={() => handleMarkerPress(ad._id)}
            />
          );
        })}
      </MapView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#22c55e" />
        </View>
      )}
    </View>
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
  errorText: { color: '#fecaca', textAlign: 'center' },
  errorBox: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    zIndex: 10,
    backgroundColor: '#7f1d1d',
    padding: 8,
    borderRadius: 8,
  },
  loadingOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});

export default MapScreen;
