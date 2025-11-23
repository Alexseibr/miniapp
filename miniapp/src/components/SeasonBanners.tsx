import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchSeasons } from '@/api/seasons';
import { SeasonInfo } from '@/types';

export default function SeasonBanners() {
  const [seasons, setSeasons] = useState<SeasonInfo[]>([]);

  useEffect(() => {
    fetchSeasons()
      .then((data) => {
        const active = data.filter((s) => {
          if (!s.startDate || !s.endDate) return false;
          const now = new Date();
          const start = new Date(s.startDate);
          const end = new Date(s.endDate);
          return now >= start && now <= end;
        });
        setSeasons(active.slice(0, 5));
      })
      .catch(console.error);
  }, []);

  if (seasons.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        overflowX: 'auto',
        paddingBottom: 12,
        scrollSnapType: 'x mandatory',
      }}
      data-testid="season-banners"
    >
      {seasons.map((season, index) => {
        const colors = [
          { start: '#6366f1', end: '#4f46e5' },
          { start: '#f59e0b', end: '#d97706' },
          { start: '#10b981', end: '#059669' },
          { start: '#ef4444', end: '#dc2626' },
          { start: '#8b5cf6', end: '#7c3aed' },
        ];
        const colorSet = colors[index % colors.length];
        
        return (
          <Link
            key={season.code}
            to={`/feed?season=${season.code}`}
            style={{
              minWidth: 280,
              height: 140,
              borderRadius: 16,
              background: `linear-gradient(135deg, ${colorSet.start} 0%, ${colorSet.end} 100%)`,
              padding: 20,
              color: 'white',
              textDecoration: 'none',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              scrollSnapAlign: 'start',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
            data-testid={`season-banner-${season.code}`}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }} data-testid={`text-season-name-${season.code}`}>{season.name}</h3>
              {season.description && (
                <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.9 }} data-testid={`text-season-description-${season.code}`}>
                  {season.description.slice(0, 60)}
                  {season.description.length > 60 ? '...' : ''}
                </p>
              )}
            </div>
            <div style={{ fontSize: 11, opacity: 0.8 }} data-testid={`text-season-cta-${season.code}`}>
              Смотреть предложения →
            </div>
          </Link>
        );
      })}
    </div>
  );
}
