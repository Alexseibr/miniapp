import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAdsStore } from '../store/adsStore';
import { useGeoStore } from '../store/geoStore';
import { AdCard } from '../components/ads/AdCard';
import { RootStackParamList } from '../navigation/AppNavigator';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export const HomeFeedScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { items, fetchAds, loading } = useAdsStore();
  const { currentLocation, detectLocation, radiusKm } = useGeoStore();

  useEffect(() => {
    if (!currentLocation) {
      detectLocation();
    }
  }, [currentLocation, detectLocation]);

  useFocusEffect(
    useCallback(() => {
      fetchAds({
        lat: currentLocation?.lat,
        lng: currentLocation?.lng,
        maxDistanceKm: radiusKm,
        radiusKm
      });
    }, [fetchAds, currentLocation?.lat, currentLocation?.lng, radiusKm])
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Рядом с вами</Text>
        <TouchableOpacity onPress={() => fetchAds({ lat: currentLocation?.lat, lng: currentLocation?.lng, maxDistanceKm: radiusKm })}>
          <Text style={styles.action}>Обновить</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => fetchAds({ lat: currentLocation?.lat, lng: currentLocation?.lng, maxDistanceKm: radiusKm })} />}
        renderItem={({ item }) => <AdCard ad={item} onPress={(ad) => navigation.navigate('AdDetails', { adId: ad._id })} />}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>Нет объявлений поблизости</Text> : null}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050608', padding: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  title: { color: '#fff', fontSize: 20, fontWeight: '700' },
  action: { color: '#00f5d4' },
  empty: { color: '#6b7280', textAlign: 'center', marginTop: 24 }
});
