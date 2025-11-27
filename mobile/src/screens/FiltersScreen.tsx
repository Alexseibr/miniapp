import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../navigation/AppNavigator';
import { categoriesApi, CategoryNode } from '../api/categoriesApi';
import { useAdsFilterStore, SellerRole } from '../store/adsFilterStore';

type Props = NativeStackScreenProps<HomeStackParamList, 'Filters'>;

const sellerRoleLabels: { value: SellerRole; label: string }[] = [
  { value: null, label: 'Все' },
  { value: 'user', label: 'Частник' },
  { value: 'farmer', label: 'Фермер' },
  { value: 'shop', label: 'Магазин' },
  { value: 'other', label: 'Другое' },
];

const possibleSeasons = [
  { value: '', label: 'Все сезоны' },
  { value: 'march8', label: '8 марта / тюльпаны' },
  { value: 'newyear', label: 'Новый год' },
  { value: 'summer', label: 'Лето' },
];

const FiltersScreen: React.FC<Props> = ({ navigation }) => {
  const {
    category,
    minPrice,
    maxPrice,
    seasonCode,
    sellerRole,
    setCategory,
    setMinPrice,
    setMaxPrice,
    setSeasonCode,
    setSellerRole,
    reset,
  } = useAdsFilterStore();

  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  const [minPriceInput, setMinPriceInput] = useState(minPrice != null ? String(minPrice) : '');
  const [maxPriceInput, setMaxPriceInput] = useState(maxPrice != null ? String(maxPrice) : '');
  const [seasonInput, setSeasonInput] = useState(seasonCode || '');

  const loadCategories = useCallback(async () => {
    try {
      setCategoriesLoading(true);
      setCategoriesError(null);
      const tree = await categoriesApi.getCategoriesTree();
      setCategories(tree);
    } catch (e: any) {
      console.warn('FiltersScreen loadCategories error', e);
      setCategoriesError(e?.message || 'Ошибка загрузки категорий');
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const applyFilters = () => {
    const minVal = minPriceInput.trim() ? Number(minPriceInput.trim()) : null;
    const maxVal = maxPriceInput.trim() ? Number(maxPriceInput.trim()) : null;

    setMinPrice(!Number.isNaN(minVal as any) ? minVal : null);
    setMaxPrice(!Number.isNaN(maxVal as any) ? maxVal : null);

    const normalizedSeason = seasonInput.trim() || null;
    setSeasonCode(normalizedSeason);

    navigation.goBack();
  };

  const resetFilters = () => {
    reset();
    setMinPriceInput('');
    setMaxPriceInput('');
    setSeasonInput('');
  };

  const selectSeason = (value: string) => {
    setSeasonInput(value);
  };

  const selectSellerRole = (value: SellerRole) => {
    setSellerRole(value);
  };

  const selectCategory = (node: CategoryNode | null) => {
    setCategory(node);
  };

  const renderCategoryNode = (node: CategoryNode, level: number = 0) => {
    const isSelected = category?.id === node.id;

    return (
      <View key={node.id} style={{ marginLeft: level * 12, marginBottom: 4 }}>
        <TouchableOpacity
          style={[styles.categoryRow, isSelected && styles.categoryRowSelected]}
          onPress={() => selectCategory(node)}
        >
          <Text style={styles.categoryText}>{node.name}</Text>
          {node.adCount != null && <Text style={styles.categoryAdCount}>{node.adCount}</Text>}
        </TouchableOpacity>

        {node.children?.length
          ? node.children.map((child) => renderCategoryNode(child, level + 1))
          : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.headerBack}>{'‹'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Фильтры</Text>
        <TouchableOpacity onPress={resetFilters}>
          <Text style={styles.headerReset}>Сброс</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Категория</Text>
        <View style={styles.categoryContainer}>
          {categoriesLoading && (
            <View style={styles.centerBlock}>
              <ActivityIndicator size="small" color="#22c55e" />
              <Text style={styles.mutedText}>Загружаем категории…</Text>
            </View>
          )}

          {categoriesError && !categoriesLoading && (
            <View style={styles.centerBlock}>
              <Text style={styles.errorText}>{categoriesError}</Text>
              <TouchableOpacity onPress={loadCategories}>
                <Text style={styles.errorRetry}>Повторить</Text>
              </TouchableOpacity>
            </View>
          )}

          {!categoriesLoading && !categoriesError && (
            <>
              <TouchableOpacity
                style={[styles.categoryRow, !category && styles.categoryRowSelected]}
                onPress={() => selectCategory(null)}
              >
                <Text style={styles.categoryText}>Все категории</Text>
              </TouchableOpacity>

              {categories.map((root) => renderCategoryNode(root, 0))}
            </>
          )}
        </View>

        <Text style={styles.sectionTitle}>Цена, BYN</Text>
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>От</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor="#6b7280"
              keyboardType="numeric"
              value={minPriceInput}
              onChangeText={setMinPriceInput}
            />
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>До</Text>
            <TextInput
              style={styles.input}
              placeholder="100"
              placeholderTextColor="#6b7280"
              keyboardType="numeric"
              value={maxPriceInput}
              onChangeText={setMaxPriceInput}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Сезон / кампания (seasonCode)</Text>
        <View style={styles.chipsRow}>
          {possibleSeasons.map((s) => {
            const isActive = seasonInput === s.value || (!seasonInput && !s.value);
            return (
              <TouchableOpacity
                key={s.value || 'all'}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => selectSeason(s.value)}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.smallHint}>
          Можно ввести свой код (например, tulips2025), если вы используете кастомные кампании:
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Например: march8, newyear"
          placeholderTextColor="#6b7280"
          value={seasonInput}
          onChangeText={setSeasonInput}
        />

        <Text style={styles.sectionTitle}>Тип продавца</Text>
        <View style={styles.chipsRow}>
          {sellerRoleLabels.map((s) => {
            const isActive = sellerRole === s.value;
            const finalActive = s.value === null ? sellerRole === null : isActive;

            return (
              <TouchableOpacity
                key={s.label}
                style={[styles.chip, finalActive && styles.chipActive]}
                onPress={() => selectSellerRole(s.value)}
              >
                <Text style={[styles.chipText, finalActive && styles.chipTextActive]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.smallHint}>
          Параметр sellerRole будет отправляться в /ads как query-параметр. Нужно реализовать поддержку
          этого фильтра на backend.
        </Text>

        <View style={{ height: 24 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
          <Text style={styles.applyButtonText}>Показать объявления</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  headerBack: { color: '#e5e7eb', fontSize: 22, width: 32 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#e5e7eb',
    fontSize: 16,
    fontWeight: '600',
  },
  headerReset: { color: '#f97316', fontSize: 14 },

  scrollContent: { padding: 12, paddingBottom: 40 },

  sectionTitle: {
    color: '#e5e7eb',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
  },

  categoryContainer: {
    borderWidth: 1,
    borderColor: '#1f2937',
    borderRadius: 12,
    padding: 8,
    maxHeight: 260,
  },
  centerBlock: { alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  mutedText: { color: '#9ca3af', marginTop: 6 },
  errorText: { color: '#fecaca', textAlign: 'center' },
  errorRetry: { color: '#facc15', marginTop: 4 },

  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  categoryAdCount: { color: '#6b7280', fontSize: 12 },

  row: { flexDirection: 'row', gap: 8 },
  col: { flex: 1 },
  label: { color: '#9ca3af', fontSize: 12, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#4b5563',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#f9fafb',
    fontSize: 14,
    marginTop: 4,
  },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#4b5563',
    backgroundColor: '#020617',
  },
  chipActive: {
    borderColor: '#22c55e',
    backgroundColor: '#064e3b',
  },
  chipText: { color: '#e5e7eb', fontSize: 13 },
  chipTextActive: { color: '#bbf7d0' },

  smallHint: { color: '#6b7280', fontSize: 12, marginTop: 4 },

  footer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
    backgroundColor: '#020617',
  },
  applyButton: {
    backgroundColor: '#22c55e',
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#022c22',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FiltersScreen;
