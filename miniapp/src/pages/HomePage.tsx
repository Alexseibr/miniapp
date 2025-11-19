import { useEffect, useMemo, useState } from 'react';
import CategoryGrid from '@/components/CategoryGrid';
import { fetchCategories } from '@/api/categories';
import { CategoryNode } from '@/types';
import EmptyState from '@/widgets/EmptyState';
import { useGeo } from '@/utils/geo';
import { useUserStore } from '@/store/useUserStore';
import { getTelegramContext } from '@/utils/telegram';

export default function HomePage() {
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [rawCategories, setRawCategories] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { requestLocation, status } = useGeo();
  const user = useUserStore((state) => state.user);

  const telegramUser = useMemo(() => {
    const { initDataUnsafe } = getTelegramContext();
    return initDataUnsafe?.user;
  }, []);

  const handleLoadCategories = async () => {
    try {
      setLoading(true);
      const list = await fetchCategories();
      setCategories(list);
      setRawCategories(JSON.stringify(list, null, 2));
    } catch (error) {
      console.error('load categories error', error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleLoadCategories();
  }, []);

  return (
    <div className="container">
      <h1 style={{ marginTop: 0 }}>KETMAR Market MiniApp</h1>
      {(user || telegramUser) && (
        <div className="card" style={{ marginBottom: 16 }}>
          <p style={{ margin: '4px 0', fontWeight: 600 }}>Вы в Telegram:</p>
          <p style={{ margin: 0 }}>
            @{telegramUser?.username || user?.username || 'гость'} (id: {telegramUser?.id || user?.telegramId || '—'})
          </p>
        </div>
      )}

      <p style={{ marginBottom: 16, color: '#475467' }}>
        Локальная витрина объявлений. Включите геолокацию, чтобы видеть фермеров и ремесленников рядом с вами.
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <button type="button" className="primary" onClick={handleLoadCategories} disabled={loading}>
          {loading ? 'Загружаем…' : 'Загрузить категории'}
        </button>
        <button type="button" className="secondary" onClick={requestLocation} disabled={status === 'loading'}>
          {status === 'loading' ? 'Запрашиваем координаты…' : 'Обновить моё местоположение'}
        </button>
      </div>

      {loading && <EmptyState title="Загружаем категории" description="Подождите несколько секунд" />}

      {!loading && categories.length > 0 && <CategoryGrid categories={categories} />}

      {rawCategories && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>Сырые данные /api/categories</h3>
          <pre style={{ maxHeight: 220, overflow: 'auto', background: '#0f172a', color: '#e2e8f0', padding: 12 }}>
            {rawCategories}
          </pre>
        </div>
      )}
    </div>
  );
}
