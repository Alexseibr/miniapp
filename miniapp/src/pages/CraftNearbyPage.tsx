import { useEffect, useState } from 'react';
import { listCraftNearby } from '@/api/ads';
import { AdPreview } from '@/types';

interface GeoCoords {
  lat: number;
  lng: number;
}

export default function CraftNearbyPage() {
  const [coords, setCoords] = useState<GeoCoords | null>(null);
  const [items, setItems] = useState<AdPreview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!coords) {
      navigator.geolocation?.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => setError('Не удалось получить геопозицию')
      );
    }
  }, [coords]);

  useEffect(() => {
    async function load() {
      if (!coords) return;
      setLoading(true);
      setError(null);
      try {
        const response = await listCraftNearby({ lat: coords.lat, lng: coords.lng, radiusKm: 10 });
        setItems(response.items || []);
      } catch (e) {
        setError('Не удалось загрузить ремесленников поблизости');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [coords]);

  return (
    <div className="page">
      <h2>Ремесленники и выпечка рядом</h2>
      <p className="muted">Показываем торты, эклеры, капкейки и другие десерты вокруг вас.</p>

      {!coords && <p>Определяем ваше местоположение...</p>}
      {loading && <p>Загрузка...</p>}
      {error && <p className="error">{error}</p>}

      <div className="cards-grid">
        {items.map((ad) => {
          const canDeliver =
            ad.deliveryRadiusKm != null &&
            ad.distanceMeters != null &&
            ad.distanceMeters <= (ad.deliveryRadiusKm || 0) * 1000;

          return (
            <div key={ad._id} className="card">
              <h3>{ad.title}</h3>
              <p className="muted">{ad.subcategoryCode || ad.subcategoryId}</p>
              <p className="muted">
                {ad.attributes?.weight_kg ? `Вес: ${ad.attributes.weight_kg} кг · ` : ''}
                {Array.isArray(ad.attributes?.filling) && ad.attributes?.filling?.length
                  ? `Начинки: ${ad.attributes.filling.join(', ')}`
                  : ''}
                {ad.attributes?.min_order_quantity
                  ? ` · Минимальный заказ: ${ad.attributes.min_order_quantity}`
                  : ''}
              </p>
              <p>
                {canDeliver ? '🚚 Доставка доступна' : 'Только самовывоз'} · 🏁 Самовывоз
                {ad.distanceMeters != null ? ` · ${Math.round(ad.distanceMeters)} м` : ''}
              </p>
              <p className="price">{ad.price} {ad.currency || 'BYN'}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
