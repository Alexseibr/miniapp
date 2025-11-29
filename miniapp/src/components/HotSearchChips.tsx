import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Flame, Loader2 } from 'lucide-react';

interface HotSearch {
  query: string;
  normalizedQuery: string;
  count: number;
  categoryName?: string;
}

interface HotSearchChipsProps {
  lat?: number;
  lng?: number;
  countryWide?: boolean;
  onSearchClick: (query: string) => void;
  maxItems?: number;
}

export default function HotSearchChips({
  lat,
  lng,
  countryWide = false,
  onSearchClick,
  maxItems = 8,
}: HotSearchChipsProps) {
  const [hotSearches, setHotSearches] = useState<HotSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHotSearches = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          limit: String(maxItems),
        });

        if (countryWide) {
          params.set('countryWide', 'true');
        } else if (lat && lng) {
          params.set('lat', String(lat));
          params.set('lng', String(lng));
        }

        const response = await fetch(`/api/search/hot-searches?${params}`);

        if (!response.ok) {
          throw new Error('Failed to fetch hot searches');
        }

        const data = await response.json();
        
        if (data.ok) {
          setHotSearches(data.hotSearches || []);
        }
      } catch (err) {
        console.error('Failed to fetch hot searches:', err);
        setError('Не удалось загрузить');
      } finally {
        setLoading(false);
      }
    };

    fetchHotSearches();
    const interval = setInterval(fetchHotSearches, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [lat, lng, countryWide, maxItems]);

  if (loading) {
    return (
      <div
        data-testid="hot-searches-loading"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 0',
        }}
      >
        <Loader2 size={16} color="#9CA3AF" style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: 13, color: '#9CA3AF' }}>Загрузка...</span>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error || hotSearches.length === 0) {
    return null;
  }

  return (
    <div data-testid="hot-searches-chips" style={{ marginBottom: 12 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 10,
        }}
      >
        <Flame size={16} color="#F97316" />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#F97316' }}>
          Сейчас ищут
        </span>
      </div>
      
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        {hotSearches.map((search, idx) => (
          <button
            key={search.normalizedQuery || idx}
            data-testid={`hot-search-chip-${idx}`}
            onClick={() => onSearchClick(search.query)}
            style={{
              background: '#FFF7ED',
              border: '1px solid #FDBA74',
              borderRadius: 20,
              padding: '8px 14px',
              fontSize: 13,
              color: '#9A3412',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.2s',
            }}
          >
            <Search size={14} color="#EA580C" />
            <span style={{ fontWeight: 500 }}>{search.query}</span>
            {search.count > 10 && (
              <span
                style={{
                  background: '#F97316',
                  color: '#fff',
                  fontSize: 10,
                  padding: '2px 6px',
                  borderRadius: 10,
                  fontWeight: 600,
                }}
              >
                {search.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
