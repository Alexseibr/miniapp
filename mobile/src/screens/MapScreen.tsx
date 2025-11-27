import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import { useGeoStore } from '../store/geoStore';
import { adsApi } from '../api/adsApi';
import { AdPreview } from '../types';
import { RootStackParamList } from '../navigation/AppNavigator';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export const MapScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { currentLocation, detectLocation, radiusKm } = useGeoStore();
  const [ads, setAds] = useState<AdPreview[]>([]);

  useEffect(() => {
    const load = async () => {
      const location = currentLocation || (await detectLocation());
      if (!location) return;
      const response = await adsApi.nearby({ lat: location.lat, lng: location.lng, radiusKm });
      setAds(response.data.data?.items || []);
    };
    load();
  }, [currentLocation, detectLocation, radiusKm]);

  if (!currentLocation) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Определяем вашу локацию...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={{
          latitude: currentLocation.lat,
          longitude: currentLocation.lng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05
        }}
      >
        {ads.map((ad) =>
          ad.location ? (
            <Marker
              key={ad._id}
              coordinate={{ latitude: ad.location.lat, longitude: ad.location.lng }}
              title={ad.title}
              description={ad.city ?? ''}
              onPress={() => navigation.navigate('AdDetails', { adId: ad._id })}
            />
          ) : null
        )}
      </MapView>
      <TouchableOpacity style={styles.refresh} onPress={() => detectLocation()}>
        <Text style={styles.refreshText}>Обновить</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  text: { color: '#fff', marginTop: 20, textAlign: 'center' },
  refresh: {
    position: 'absolute',
    bottom: 32,
    right: 16,
    backgroundColor: '#00f5d4',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12
  },
  refreshText: { color: '#050608', fontWeight: '700' }
});
