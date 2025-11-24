import { useEffect, useMemo, useState } from 'react';
import { layoutApi, LayoutResponse } from '../api/layoutApi';
import { useResolvedCity } from '../hooks/useResolvedCity';
import { LoaderScreen } from '../components/LoaderScreen';

export default function HomePage() {
  const { city, loading: cityLoading } = useResolvedCity();
  const [layout, setLayout] = useState<LayoutResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadLayout = async () => {
      if (cityLoading) return;
      try {
        const { data } = await layoutApi.getLayout(city?.code, 'home');
        setLayout(data);
      } catch (err) {
        try {
          const { data } = await layoutApi.getLayout('global', 'home');
          setLayout(data);
        } catch (fallbackError) {
          console.error(fallbackError);
          setError('Не удалось загрузить главную страницу');
        }
      }
    };

    loadLayout();
  }, [city?.code, cityLoading]);

  const blocks = useMemo(() => layout?.blocks || [], [layout]);

  if (cityLoading) return <LoaderScreen message="Определяем город" />;
  if (!layout && !cityLoading && !error) return <LoaderScreen message="Загружаем контент" />;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Главная</h1>
      {error && <div className="text-sm text-red-600">{error}</div>}
      {blocks.length === 0 ? (
        <div className="text-sm text-gray-600">Нет блоков для отображения.</div>
      ) : (
        <div className="space-y-3">
          {blocks.map((block, index) => (
            <div key={index} className="p-3 border rounded-lg">
              <div className="text-sm text-gray-500">{block.type}</div>
              <div className="text-base font-semibold">{block.title || 'Без названия'}</div>
              {block.source && <div className="text-xs text-gray-500">Источник: {block.source}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
