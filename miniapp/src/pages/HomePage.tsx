import { useEffect, useState } from 'react';
import CategoryGrid from '@/components/CategoryGrid';
import { fetchCategories } from '@/api/categories';
import { CategoryNode } from '@/types';
import EmptyState from '@/widgets/EmptyState';
import { useGeo } from '@/utils/geo';

export default function HomePage() {
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const { requestLocation, status } = useGeo();

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <EmptyState title="Загружаем категории" description="Подождите несколько секунд" />;
  }

  return (
    <div className="container">
      <p style={{ marginBottom: 16, color: '#475467' }}>
        Локальная витрина объявлений. Включите геолокацию, чтобы видеть фермеров и ремесленников рядом с вами.
      </p>
      <button type="button" className="secondary" onClick={requestLocation} disabled={status === 'loading'}>
        {status === 'loading' ? 'Запрашиваем координаты…' : 'Обновить моё местоположение'}
      </button>
      <CategoryGrid categories={categories} />
    </div>
  );
}
