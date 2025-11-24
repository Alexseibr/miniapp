import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, MessageCircle } from 'lucide-react';
import { getAd } from '@/api/ads';
import EmptyState from '@/widgets/EmptyState';
import { AdPreview } from '@/types';
import FavoriteButton from '@/components/FavoriteButton';
import { useCartStore } from '@/store/cart';
import { formatCityDistance, useGeo } from '@/utils/geo';
import http from '@/api/http';
import { useUserStore } from '@/store/useUserStore';

export default function AdPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useUserStore((state) => state.user);
  const [ad, setAd] = useState<AdPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingChat, setStartingChat] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  const { coords } = useGeo(false);

  useEffect(() => {
    if (!id) return;
    const params = coords ? { lat: coords.lat, lng: coords.lng } : {};
    getAd(id, params)
      .then(setAd)
      .catch(() => setAd(null))
      .finally(() => setLoading(false));
  }, [id, coords]);

  const startChat = async () => {
    if (!user) {
      navigate('/profile');
      return;
    }
    if (!ad?._id) return;
    setStartingChat(true);
    try {
      const { data } = await http.post('/api/chat/start', { adId: ad._id });
      navigate(`/chat/${data._id}`);
    } catch (error) {
      console.error('Failed to start chat:', error);
      alert('Не удалось начать чат. Попробуйте позже.');
    } finally {
      setStartingChat(false);
    }
  };

  if (loading) {
    return <EmptyState title="Загружаем объявление" />;
  }

  if (!ad) {
    return <EmptyState title="Объявление не найдено" description="Возможно, оно было удалено продавцом" />;
  }

  return (
    <div className="container">
      <article className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>{ad.title}</h2>
          <FavoriteButton adId={ad._id} />
        </div>
        <p style={{ color: '#475467' }}>{ad.description}</p>
        {ad.photos?.length && (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', margin: '12px 0' }}>
            {ad.photos.map((photo) => (
              <img
                key={photo}
                src={photo}
                alt={ad.title}
                style={{ width: 140, height: 100, objectFit: 'cover', borderRadius: 12 }}
              />
            ))}
          </div>
        )}
        <p style={{ fontSize: '1.8rem', fontWeight: 700 }}>
          {ad.price.toLocaleString('ru-RU')} {ad.currency || 'BYN'}
        </p>
        {(ad.city || ad.distanceKm != null) && (
          <p style={{ margin: '8px 0', fontSize: 14, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6 }}>
            <MapPin size={16} />
            {formatCityDistance(ad.city, ad.distanceKm)}
          </p>
        )}
        {ad.attributes && (
          <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0', color: '#475467' }}>
            {Object.entries(ad.attributes).map(([key, value]) => (
              <li key={key}>
                <strong>{key}:</strong> {String(value)}
              </li>
            ))}
          </ul>
        )}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="primary"
            onClick={startChat}
            disabled={startingChat}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
            data-testid="button-start-chat"
          >
            <MessageCircle size={20} />
            {startingChat ? 'Открываем чат...' : 'Написать продавцу'}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() =>
              addItem({
                adId: ad._id,
                title: ad.title,
                price: ad.price,
                quantity: 1,
                sellerTelegramId: ad.sellerTelegramId,
                photo: ad.photos?.[0],
              })
            }
            data-testid="button-add-to-cart"
          >
            Добавить в корзину
          </button>
        </div>
      </article>
    </div>
  );
}
