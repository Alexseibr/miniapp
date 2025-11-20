import { useEffect, useMemo, useState } from 'react';
import { listAds } from '@/api/ads';
import { fetchCategories } from '@/api/categories';
import AdCard from '@/components/AdCard';
import AdDetailsModal from '@/components/AdDetailsModal';
import CategoryTabs from '@/components/CategoryTabs';
import FiltersBar from '@/components/FiltersBar';
import EmptyState from '@/widgets/EmptyState';
import { AdPreview, CategoryNode } from '@/types';
import { useGeo } from '@/utils/geo';

type SortOption = 'newest' | 'price_asc' | 'price_desc';

export default function AdsListPage() {
  const [ads, setAds] = useState<AdPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [categoryId, setCategoryId] = useState<string>('');
  const [subcategoryId, setSubcategoryId] = useState<string>('');
  const [adsError, setAdsError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortOption>('newest');
  const [deliveryOnly, setDeliveryOnly] = useState(false);
  const [selectedAdId, setSelectedAdId] = useState<string | null>(null);
  const { coords, requestLocation, status } = useGeo();

  useEffect(() => {
    let cancelled = false;
    async function loadCategories() {
      try {
        const tree = await fetchCategories();
        if (!cancelled) {
          setCategories(tree);
          if (tree.length && !categoryId) {
            setCategoryId(tree[0].slug);
          }
        }
      } catch (error) {
        console.error('categories error', error);
        if (!cancelled) setCategories([]);
      }
    }
    loadCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  const subcategoryOptions = useMemo(() => {
    const category = categories.find((cat) => cat.slug === categoryId);
    return category?.subcategories || [];
  }, [categoryId, categories]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setAdsError(null);
      try {
        const response = await listAds({
          limit: 50,
          categoryId,
          subcategoryId,
          lat: coords?.lat,
          lng: coords?.lng,
        });
        if (!cancelled) {
          const items = Array.isArray(response) ? response : response.items || [];
          setAds(items);
        }
      } catch (error) {
        console.error('ads list error', error);
        if (!cancelled) {
          setAds([]);
          setAdsError('Не удалось загрузить объявления. Попробуйте обновить позже.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [categoryId, subcategoryId, coords]);

  const filteredAds = useMemo(() => {
    let list = [...ads];
    if (deliveryOnly) {
      list = list.filter((item) => item.deliveryType && item.deliveryType !== 'pickup_only');
    }
    if (sort === 'price_asc') {
      list.sort((a, b) => a.price - b.price);
    } else if (sort === 'price_desc') {
      list.sort((a, b) => b.price - a.price);
    } else {
      list.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
    }
    return list;
  }, [ads, deliveryOnly, sort]);

  return (
    <div className="container">
      <div className="card" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: '0 0 8px' }}>Лента объявлений</h2>
        <p style={{ margin: '0 0 12px', color: '#475467' }}>
          Выбирайте категорию и подкатегорию, чтобы увидеть свежие предложения. Фильтры помогут отсортировать по цене и доставке.
        </p>
        <CategoryTabs
          categories={categories}
          activeCategory={categoryId}
          activeSubcategory={subcategoryId}
          onCategoryChange={(slug) => {
            setCategoryId(slug);
            setSubcategoryId('');
          }}
          onSubcategoryChange={setSubcategoryId}
        />
        {status !== 'ready' && (
          <button
            type="button"
            className="secondary"
            style={{ marginTop: 12 }}
            onClick={requestLocation}
            disabled={status === 'loading'}
          >
            {status === 'loading' ? 'Запрашиваем координаты…' : 'Включить поиск рядом'}
          </button>
        )}
      </div>

      <FiltersBar sort={sort} deliveryOnly={deliveryOnly} onSortChange={setSort} onDeliveryChange={setDeliveryOnly} />

      {adsError && <EmptyState title="Ошибка" description={adsError} />}

      {loading ? (
        <EmptyState title="Загружаем объявления" description="Подождите немного" />
      ) : filteredAds.length ? (
        <div className="grid" style={{ gridTemplateColumns: '1fr' }}>
          {filteredAds.map((ad) => (
            <AdCard key={ad._id} ad={ad} onSelect={(item) => setSelectedAdId(item._id)} />
          ))}
        </div>
      ) : (
        <EmptyState title="Объявлений не найдено" description="Попробуйте выбрать другую категорию или расширить фильтры" />
      )}

      <AdDetailsModal adId={selectedAdId} onClose={() => setSelectedAdId(null)} />
    </div>
  );
}
