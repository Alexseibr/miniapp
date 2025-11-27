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
  Modal,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../navigation/AppNavigator';
import { locationService } from '../services/locationService';
import { adsApi, AdListItem } from '../api/adsApi';
import { categoriesApi, CategoryNode } from '../api/categoriesApi';

type Props = NativeStackScreenProps<HomeStackParamList, 'HomeFeed'>;

const DEFAULT_RADIUS_KM = 5;

const HomeFeedScreen: React.FC<Props> = ({ navigation }) => {
  const [ads, setAds] = useState<AdListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // фильтры
  const [selectedCategory, setSelectedCategory] = useState<CategoryNode | null>(null);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');

  // категории
  const [categoriesTree, setCategoriesTree] = useState<CategoryNode[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState<boolean>(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [categoryModalVisible, setCategoryModalVisible] = useState<boolean>(false);

  const loadCategories = useCallback(async () => {
    try {
      setCategoriesLoading(true);
      setCategoriesError(null);
      const items = await categoriesApi.getCategoriesTree();
      setCategoriesTree(items);
    } catch (e: any) {
      console.warn('loadCategories error', e);
      setCategoriesError(e?.message || 'Ошибка загрузки категорий');
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

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

        // применяем фильтр категории
        if (selectedCategory?.slug) {
          params.categoryId = selectedCategory.slug; // в API.md categoryId = slug
        }

        // фильтр цены
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
    [refreshing, selectedCategory, minPrice, maxPrice]
  );

  useEffect(() => {
    // первая загрузка — категории + лента
    loadCategories();
    loadAds(true);
  }, [loadCategories, loadAds]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAds(true);
  };

  const onApplyFilters = () => {
    loadAds(true);
  };

  const clearCategory = () => {
    setSelectedCategory(null);
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

  // ---------- UI выбора категории ----------

  const renderCategoryNode = (node: CategoryNode, level: number = 0) => {
    const isSelected = selectedCategory?.id === node.id;
    return (
      <View key={node.id} style={{ marginLeft: level * 12, marginBottom: 4 }}>
        <TouchableOpacity
          style={[
            styles.categoryRow,
            isSelected && styles.categoryRowSelected,
          ]}
          onPress={() => {
            setSelectedCategory(node);
            setCategoryModalVisible(false);
            loadAds(true);
          }}
        >
          <Text style={styles.categoryText}>
            {node.name}
          </Text>
        </TouchableOpacity>

        {node.children?.length
          ? node.children.map((child) => renderCategoryNode(child, level + 1))
          : null}
      </View>
    );
  };

  // ---------- Основной рендер ----------

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
        {/* Категория */}
        <Text style={styles.filterLabel}>Категория</Text>
        <View style={styles.categoryFilterRow}>
          <TouchableOpacity
            style={styles.buttonCategory}
            onPress={() => setCategoryModalVisible(true)}
          >
            <Text style={styles.buttonCategoryText}>
              {selectedCategory ? selectedCategory.name : 'Все категории'}
            </Text>
          </TouchableOpacity>
          {selectedCategory && (
            <TouchableOpacity style={styles.buttonClearCategory} onPress={clearCategory}>
              <Text style={styles.buttonClearCategoryText}>×</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Цена от/до */}
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

      {/* Модалка выбора категории */}
      <Modal
        visible={categoryModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Выбор категории</Text>
              <TouchableOpacity onPress={() => setCategoryModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {categoriesLoading && (
              <View style={styles.modalCenter}>
                <ActivityIndicator size="small" color="#22c55e" />
                <Text style={styles.modalText}>Загружаем категории…</Text>
              </View>
            )}

            {categoriesError && !categoriesLoading && (
              <View style={styles.modalCenter}>
                <Text style={styles.errorText}>{categoriesError}</Text>
                <TouchableOpacity onPress={loadCategories}>
                  <Text style={styles.errorRetry}>Повторить</Text>
                </TouchableOpacity>
              </View>
            )}

            {!categoriesLoading && !categoriesError && (
              <ScrollView style={{ maxHeight: 400 }}>
                {categoriesTree.map((cat) => renderCategoryNode(cat, 0))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
  filterLabel: { color: '#9ca3af', fontSize: 12, marginBottom: 4 },
  categoryFilterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  buttonCategory: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#4b5563',
    backgroundColor: '#020617',
  },
  buttonCategoryText: { color: '#e5e7eb', fontSize: 14 },
  buttonClearCategory: {
    marginLeft: 8,
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonClearCategoryText: { color: '#f87171', fontSize: 18, lineHeight: 20 },

  filterInlineRow: { flexDirection: 'row', gap: 8, marginBottom: 8, marginTop: 4 },
  filterInlineCol: { flex: 1 },
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

  // категории в модалке
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.85)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#020617',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitle: { color: '#e5e7eb', fontSize: 16, fontWeight: '600' },
  modalClose: { color: '#9ca3af', fontSize: 18 },
  modalCenter: { alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  modalText: { color: '#e5e7eb', marginTop: 8 },
  categoryRow: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  categoryRowSelected: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  categoryText: { color: '#e5e7eb', fontSize: 14 },
});

export default HomeFeedScreen;
