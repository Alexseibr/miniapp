import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../navigation/AppNavigator';
import { locationService } from '../services/locationService';
import { adsApi, AdListItem } from '../api/adsApi';

type Props = NativeStackScreenProps<HomeStackParamList, 'HomeFeed'>;

const DEFAULT_RADIUS_KM = 5;

const HomeFeedScreen: React.FC<Props> = ({ navigation }) => {
  const [ads, setAds] = useState<AdListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // фильтры
  const [categoryId, setCategoryId] = useState<string>('');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');

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

        // применяем фильтры категории/цены
        if (categoryId.trim()) {
          params.categoryId = categoryId.trim();
        }
        if (minPrice.trim()) {
          const v = Number(minPrice);
          if (!Number.isNaN(v)) params.minPrice = v;
        }
        if (maxPrice.trim()) {
          const v = Number(maxPrice);
          if (!Number.isNaN(v)) params.maxPrice = v;
        }

        const res = await adsApi.listAds(params);
        setAds(res.data.items || []);
      } catch (e: any) {
        console.warn('loadAds error', e);
        setError(e?.message || 'Ошибка загрузки объявлений');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [refreshing, categoryId, minPrice, maxPrice]
  );

  useEffect(() => {
    // первая загрузка: пробуем с гео
    loadAds(true);
  }, [loadAds]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAds(true);
  };

  const onApplyFilters = () => {
    loadAds(true);
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
      {/* ФИЛЬТРЫ */}
      <View style={styles.filtersRow}>
        <View style={styles.filterCol}>
          <Text style={styles.filterLabel}>Категория (slug)</Text>
          <TextInput
            style={styles.input}
            placeholder="например, vegetables"
            placeholderTextColor="#6b7280"
            value={categoryId}
            onChangeText={setCategoryId}
          />
        </View>
        <View style={styles.filterInlineRow}>
          <View style={styles.filterInlineCol}>
            <Text style={styles.filterLabel}>Цена от</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor="#6b7280"
              keyboardType="numeric"
              value={minPrice}
              onChangeText={setMinPrice}
            />
          </View>
          <View style={styles.filterInlineCol}>
            <Text style={styles.filterLabel}>до</Text>
            <TextInput
              style={styles.input}
              placeholder="100"
              placeholderTextColor="#6b7280"
              keyboardType="numeric"
              value={maxPrice}
              onChangeText={setMaxPrice}
            />
          </View>
        </View>
        <TouchableOpacity style={styles.buttonFilter} onPress={onApplyFilters}>
          <Text style={styles.buttonFilterText}>Применить</Text>
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

  filtersRow: {
    marginBottom: 8,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
    backgroundColor: '#020617',
  },
  filterCol: { marginBottom: 8 },
  filterInlineRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  filterInlineCol: { flex: 1 },
  filterLabel: { color: '#9ca3af', fontSize: 12, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#4b5563',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#f9fafb',
    fontSize: 14,
  },
  buttonFilter: {
    backgroundColor: '#111827',
    borderRadius: 999,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  buttonFilterText: {
    color: '#bbf7d0',
    fontWeight: '600',
    fontSize: 14,
  },

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
