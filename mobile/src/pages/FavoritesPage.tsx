import { useEffect, useState } from 'react';
import { favoritesApi } from '../api/favoritesApi';
import { Ad } from '../api/adsApi';
import { LoaderScreen } from '../components/LoaderScreen';
import { Link } from 'react-router-dom';

export default function FavoritesPage() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await favoritesApi.getMyFavorites();
        setAds(data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <LoaderScreen message="Загружаем избранное" />;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Избранное</h1>
      {ads.length === 0 ? (
        <div className="text-sm text-gray-600">Пока нет объявлений</div>
      ) : (
        <div className="space-y-3">
          {ads.map((ad) => (
            <Link key={ad._id} to={`/ad/${ad._id}`} className="block border rounded-lg p-3">
              <div className="text-base font-semibold">{ad.title}</div>
              <div className="text-sm text-gray-600">{ad.price} BYN</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
