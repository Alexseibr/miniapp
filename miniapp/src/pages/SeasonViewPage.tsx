import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchSeasonAds, fetchSeasons } from '@/api/seasons';
import EmptyState from '@/widgets/EmptyState';
import AdCard from '@/components/AdCard';
import { AdPreview, SeasonInfo } from '@/types';

export default function SeasonViewPage() {
  const { code } = useParams();
  const [season, setSeason] = useState<SeasonInfo | null>(null);
  const [ads, setAds] = useState<AdPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) return;
    setLoading(true);
    fetchSeasons()
      .then((list) => setSeason(list.find((item) => item.code === code) || null))
      .catch(() => setSeason(null));

    fetchSeasonAds(code)
      .then((data) => setAds(data.items || data))
      .catch(() => setAds([]))
      .finally(() => setLoading(false));
  }, [code]);

  if (!code) {
    return <EmptyState title="Не указан код сезона" />;
  }

  if (loading) {
    return <EmptyState title="Загружаем сезон" />;
  }

  return (
    <div className="container">
      <h2 style={{ marginTop: 0 }}>{season?.name || `Сезон ${code}`}</h2>
      <p style={{ marginTop: 0, color: '#475467' }}>
        Здесь будут объявления сезона {code}. Карточки ниже обновятся, когда появятся новые позиции.
      </p>
      {ads.length ? (
        <div className="grid" style={{ gridTemplateColumns: '1fr' }}>
          {ads.map((ad) => (
            <AdCard key={ad._id} ad={ad} />
          ))}
        </div>
      ) : (
        <EmptyState title="Пока нет объявлений" description="Проверяем сезонные поставки" />
      )}
    </div>
  );
}
