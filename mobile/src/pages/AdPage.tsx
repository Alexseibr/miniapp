import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { adsApi, Ad } from '../api/adsApi';
import { LoaderScreen } from '../components/LoaderScreen';

export default function AdPage() {
  const { id } = useParams();
  const [ad, setAd] = useState<Ad | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const { data } = await adsApi.getAdById(id);
        setAd(data);
      } catch (err) {
        setError('Объявление не найдено');
      }
    };
    load();
  }, [id]);

  if (!ad && !error) return <LoaderScreen message="Открываем объявление" />;

  if (!ad) return <div className="p-4 text-red-600 text-sm">{error}</div>;

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-xl font-semibold">{ad.title}</h1>
      <div className="text-2xl font-bold">{ad.price} BYN</div>
      <p className="text-sm text-gray-700 leading-relaxed">{ad.description}</p>
      {ad.contact && (
        <div className="space-y-1 text-sm">
          <div className="text-gray-500">Контакты продавца</div>
          {ad.contact.phone && <div>{ad.contact.phone}</div>}
          {ad.contact.username && <div>@{ad.contact.username}</div>}
        </div>
      )}
    </div>
  );
}
