import { useEffect, useMemo, useState } from 'react';
import { listAds } from '@/api/ads';
import { fetchCategories } from '@/api/categories';
import AdCard from '@/components/AdCard';
import EmptyState from '@/widgets/EmptyState';
import { AdPreview, CategoryNode } from '@/types';
import { useGeo } from '@/utils/geo';

export default function AdsListPage() {
  const [ads, setAds] = useState<AdPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [categoryId, setCategoryId] = useState<string>('');
  const [subcategoryId, setSubcategoryId] = useState<string>('');
  const { coords, requestLocation, status } = useGeo();

  useEffect(() => {
    fetchCategories()
      .then((tree) => setCategories(tree))
      .catch((error) => console.error('categories error', error));
  }, []);

  const subcategoryOptions = useMemo(() => {
    const category = categories.find((cat) => cat.slug === categoryId);
    return category?.subcategories || [];
  }, [categoryId, categories]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const response = await listAds({ limit: 20, categoryId, subcategoryId, lat: coords?.lat, lng: coords?.lng });
        if (!cancelled) {
          setAds(response.items || []);
        }
      } catch (error) {
        console.error('ads list error', error);
        if (!cancelled) {
          setAds([]);
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

  return (
    <div className="container">
      <div className="card" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: '0 0 8px' }}>Лента объявлений</h2>
        <p style={{ margin: '0 0 12px', color: '#475467' }}>
          Показываем свежие объявления. При выборе категории и подкатегории выдача обновится автоматически.
        </p>
        <div style={{ display: 'grid', gap: 8 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            Категория
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Все категории</option>
              {categories.map((cat) => (
                <option key={cat.slug} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            Подкатегория
            <select value={subcategoryId} onChange={(e) => setSubcategoryId(e.target.value)} disabled={!subcategoryOptions.length}>
              <option value="">Все подкатегории</option>
              {subcategoryOptions.map((sub) => (
                <option key={sub.slug} value={sub.slug}>
                  {sub.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {status !== 'ready' && (
          <button type="button" className="secondary" style={{ marginTop: 12 }} onClick={requestLocation} disabled={status === 'loading'}>
            {status === 'loading' ? 'Запрашиваем координаты…' : 'Включить поиск рядом'}
          </button>
        )}
      </div>

      {loading ? (
        <EmptyState title="Загружаем объявления" description="Подождите немного" />
      ) : ads.length ? (
        <div className="grid" style={{ gridTemplateColumns: '1fr' }}>
          {ads.map((ad) => (
            <AdCard key={ad._id} ad={ad} />
          ))}
        </div>
      ) : (
        <EmptyState title="Объявлений не найдено" description="Попробуйте выбрать другую категорию или расширить радиус" />
      )}
    </div>
  );
}
