import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchSeasons } from '@/api/seasons';
import EmptyState from '@/widgets/EmptyState';
import { SeasonInfo } from '@/types';

export default function SeasonsPage() {
  const [seasons, setSeasons] = useState<SeasonInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchSeasons()
      .then((data) => setSeasons(data || []))
      .catch((err) => {
        console.error('seasons fetch error', err);
        setError('Не удалось загрузить сезоны');
        setSeasons([]);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <EmptyState title="Загружаем сезоны" />;
  }

  if (!seasons.length) {
    return <EmptyState title="Сезонные витрины пока не активны" description="Загляните позже" />;
  }

  const formatDate = (value?: string) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString('ru-RU');
  };

  return (
    <div className="container">
      <h2 style={{ marginTop: 0, marginBottom: 12 }}>Сезонные подборки</h2>
        {error && (
          <div
            role="status"
            style={{ marginBottom: 12, padding: 12, borderRadius: 12, background: '#fff7ed', color: '#9a3412' }}
          >
            {error}
          </div>
        )}
      <div className="stack" style={{ gap: 12 }}>
        {seasons.map((season) => (
          <Link key={season._id} to={`/season/${season.code}`} className="card" style={{ textDecoration: 'none' }}>
            <p className="badge" style={{ marginBottom: 8 }}>
              {season.isActive ? 'Активен' : 'Завершён'}
            </p>
            <h3 style={{ margin: '0 0 6px' }}>{season.name}</h3>
            {season.description && <p style={{ margin: '0 0 6px', color: '#475467' }}>{season.description}</p>}
            <p style={{ margin: 0, color: '#475467', fontSize: '0.9rem' }}>
              Период: {formatDate(season.startDate) || 'дата не указана'}
              {season.endDate ? ` — ${formatDate(season.endDate)}` : ''}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
