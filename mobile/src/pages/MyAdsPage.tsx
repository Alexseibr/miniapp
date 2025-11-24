import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adsApi, Ad } from '../api/adsApi';
import { LoaderScreen } from '../components/LoaderScreen';

const filters = [
  { label: 'Активные', value: 'active' },
  { label: 'Модерация', value: 'moderation' },
  { label: 'Архив', value: 'archived' }
];

export default function MyAdsPage() {
  const [currentFilter, setCurrentFilter] = useState(filters[0].value);
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAds = async () => {
      setLoading(true);
      try {
        const { data } = await adsApi.getMyAds(currentFilter);
        setAds(data);
      } finally {
        setLoading(false);
      }
    };
    loadAds();
  }, [currentFilter]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Мои объявления</h1>
        <Link to="/create-ad" className="text-primary font-semibold text-sm">
          Создать
        </Link>
      </div>
      <div className="flex gap-2 overflow-x-auto">
        {filters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setCurrentFilter(filter.value)}
            className={`px-3 py-2 rounded-full border text-sm ${
              currentFilter === filter.value ? 'bg-primary text-white border-primary' : 'bg-white'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>
      {loading ? (
        <LoaderScreen message="Загружаем объявления" />
      ) : ads.length === 0 ? (
        <div className="text-sm text-gray-600">Нет объявлений</div>
      ) : (
        <div className="space-y-3">
          {ads.map((ad) => (
            <Link key={ad._id} to={`/ad/${ad._id}`} className="block border rounded-lg p-3">
              <div className="text-base font-semibold">{ad.title}</div>
              <div className="text-sm text-gray-600">{ad.price} BYN</div>
              <div className="text-xs text-gray-500">{ad.status || 'draft'}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
