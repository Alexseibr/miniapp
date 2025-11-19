import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchSeasonAds } from '@/api/seasons';
import SeasonFilters from '@/components/SeasonFilters';
import AdCard from '@/components/AdCard';
import EmptyState from '@/widgets/EmptyState';
import { AdPreview } from '@/types';

export default function SeasonPage() {
  const { code } = useParams();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [ads, setAds] = useState<AdPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) return;
    setLoading(true);
    fetchSeasonAds(code, filters)
      .then((data) => setAds(data.items || data))
      .catch(() => setAds([]))
      .finally(() => setLoading(false));
  }, [code, filters]);

  return (
    <div className="container">
      <SeasonFilters filters={filters} onChange={setFilters} />
      {loading ? (
        <EmptyState title="Загружаем сезонную подборку" />
      ) : ads.length ? (
        <div className="grid" style={{ gridTemplateColumns: '1fr' }}>
          {ads.map((ad) => (
            <AdCard key={ad._id} ad={ad} />
          ))}
        </div>
      ) : (
        <EmptyState title="Пока нет активных объявлений" description="Попробуйте выбрать другие фильтры" />
      )}
    </div>
  );
}
