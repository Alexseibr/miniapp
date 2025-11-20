import { useEffect, useState } from 'react';
import { listLiveSpots } from '@/api/ads';
import { AdPreview } from '@/types';

interface GeoCoords {
  lat: number;
  lng: number;
}

export default function LiveSpotsPage() {
  const [coords, setCoords] = useState<GeoCoords | null>(null);
  const [seasonCode, setSeasonCode] = useState<string>('');
  const [items, setItems] = useState<AdPreview[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setError('Не удалось определить местоположение')
    );
  }, []);

  useEffect(() => {
    async function load() {
      if (!coords) return;
      setLoading(true);
      setError(null);
      try {
        const response = await listLiveSpots({
          lat: coords.lat,
          lng: coords.lng,
          radiusKm: 10,
          ...(seasonCode ? { seasonCode } : {}),
        });
        setItems(response.items || []);
      } catch (e) {
        setError('Не удалось загрузить живые точки');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [coords, seasonCode]);

  return (
    <div className="page">
      <h2>Живые точки ярмарок</h2>
      <p className="muted">На карте отображаются активные павильоны и палатки.</p>

      <label className="card">
        Фильтр по сезону
        <input
          placeholder="например march8_tulips"
          value={seasonCode}
          onChange={(e) => setSeasonCode(e.target.value)}
        />
      </label>

      {loading && <p>Загрузка...</p>}
      {error && <p className="error">{error}</p>}

      <div className="map-placeholder">
        <p>🗺️ Карта-заглушка. Используйте выбранную карточку, чтобы подсветить точку.</p>
        {selectedId && <p>Выбрана точка {selectedId}</p>}
      </div>

      <div className="cards-grid">
        {items
          .slice()
          .sort((a, b) => (a.distanceMeters || 0) - (b.distanceMeters || 0))
          .map((ad) => (
            <div
              key={ad._id}
              className={`card ${selectedId === ad._id ? 'card--active' : ''}`}
              onClick={() => setSelectedId(ad._id)}
            >
              <h3>{ad.title}</h3>
              <p className="muted">{ad.seasonCode}</p>
              <p className="muted">{ad.attributes ? formatAttributes(ad.attributes) : '—'}</p>
              <p>{ad.distanceMeters ? `${Math.round(ad.distanceMeters)} м` : ''}</p>
            </div>
          ))}
      </div>
    </div>
  );
}

function formatAttributes(attrs: Record<string, unknown>) {
  return Object.entries(attrs)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
    .join(' · ');
}
