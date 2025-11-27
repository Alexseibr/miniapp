import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../navigation/AppNavigator';
import { locationService } from '../services/locationService';
import { adsApi, AdListItem } from '../api/adsApi';
import { useAdsFilterStore } from '../store/adsFilterStore';

type Props = NativeStackScreenProps<HomeStackParamList, 'HomeFeed'>;

const DEFAULT_RADIUS_KM = 5;

const HomeFeedScreen: React.FC<Props> = ({ navigation }) => {
  const [ads, setAds] = useState<AdListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { category, minPrice, maxPrice, seasonCode, sellerRole } = useAdsFilterStore();

  const loadAds = useCallback(
    async (withGeo: boolean) => {
      try {
        setError(null);
        if (!refreshing) setLoading(true);

        let params: any = {
          limit: 20,
          sort: 'newest' as const,
        };

        if (withGeo) {
          const location = await locationService.getCurrentLocation();
          if (location) {
            params = {
              ...params,
              lat: location.lat,
              lng: location.lng,
              radiusKm: DEFAULT_RADIUS_KM,
              sort: 'distance' as const,
            };
          }
        }

        if (category?.slug) {
          params.categoryId = category.slug;
        }
        if (minPrice != null) {
          params.minPrice = minPrice;
        }
        if (maxPrice != null) {
          params.maxPrice = maxPrice;
        }
        if (seasonCode) {
          params.seasonCode = seasonCode;
        }
        if (sellerRole) {
          params.sellerRole = sellerRole;
        }

        const res = await adsApi.listAds(params);
        setAds(res.data.items || []);
      } catch (e: any) {
        console.warn('HomeFeed loadAds error', e);
        setError(e?.message || 'Ошибка загрузки объявлений');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [refreshing, category, minPrice, maxPrice, seasonCode, sellerRole]
  );

  useEffect(() => {
    loadAds(true);
  }, [loadAds]);

  useEffect(() => {
    loadAds(true);
  }, [category, minPrice, maxPrice, seasonCode, sellerRole, loadAds]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAds(true);
  };

  const renderItem = ({ item }: { item: AdListItem }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('AdDetails', { adId: item._id })}
    >
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.price}>
        {item.price} {item.currency}
      </Text>
      {item.location?.city && (
        <Text style={styles.meta}>
          {item.location.city}
          {item.location.area ? `, ${item.location.area}` : ''}
          {typeof item.distanceKm === 'number'
            ? ` • ${item.distanceKm.toFixed(1)} км`
            : ''}
        </Text>
      )}
    </TouchableOpacity>
  );

  if (loading && !refreshing && ads.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#22c55e" />
        <Text style={styles.loadingText}>Загружаем объявления рядом с вами…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Рядом с вами</Text>
        <TouchableOpacity style={styles.filtersButton} onPress={() => navigation.navigate('Filters')}>
          <Text style={styles.filtersButtonText}>Фильтры</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => loadAds(true)}>
            <Text style={styles.errorRetry}>Повторить</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={ads}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={ads.length === 0 ? styles.emptyContainer : undefined}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22c55e" />
        }
        ListEmptyComponent={
          !loading && (
            <Text style={styles.emptyText}>Пока нет объявлений по выбранным условиям.</Text>
          )
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617', paddingHorizontal: 12, paddingTop: 8 },
  center: { flex: 1, backgroundColor: '#020617', alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, color: '#e5e7eb' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
  },
  topBarTitle: { flex: 1, color: '#e5e7eb', fontSize: 18, fontWeight: '600' },
  filtersButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  filtersButtonText: { color: '#e5e7eb', fontSize: 14 },

  errorBox: {
    backgroundColor: '#7f1d1d',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  errorText: { color: '#fee2e2' },
  errorRetry: { color: '#facc15', marginTop: 4 },

  card: {
    backgroundColor: '#020617',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  title: { color: '#e5e7eb', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  price: { color: '#22c55e', fontSize: 15, marginBottom: 2 },
  meta: { color: '#9ca3af', fontSize: 13 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#6b7280' },
});

export default HomeFeedScreen;
