import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, MessageCircle, ArrowLeft } from 'lucide-react';
import { getAd } from '@/api/ads';
import EmptyState from '@/widgets/EmptyState';
import { AdPreview } from '@/types';
import FavoriteButton from '@/components/FavoriteButton';
import { useCartStore } from '@/store/cart';
import { formatCityDistance, useGeo } from '@/utils/geo';
import http from '@/api/http';
import { useUserStore } from '@/store/useUserStore';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

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
    <div style={{ paddingBottom: '80px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #e5e7eb',
          zIndex: 10,
          padding: '12px 16px',
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 20px',
            backgroundColor: '#3B73FC',
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(59, 115, 252, 0.25)',
            transition: 'all 0.2s',
            width: '100%',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 115, 252, 0.35)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(59, 115, 252, 0.25)';
          }}
          data-testid="button-back"
        >
          <ArrowLeft size={24} />
          <span style={{ fontSize: '1.125rem' }}>Назад</span>
        </button>
      </div>

      <div className="container" style={{ paddingTop: '16px' }}>
        <article className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0 }}>{ad.title}</h2>
            <FavoriteButton adId={ad._id} />
          </div>
        <p style={{ color: '#475467' }}>{ad.description}</p>
        {ad.photos && ad.photos.length > 0 && (
          <div style={{ margin: '16px 0', borderRadius: '12px', overflow: 'hidden' }}>
            <Swiper
              modules={[Pagination, Navigation]}
              pagination={{ 
                clickable: true,
                dynamicBullets: true,
              }}
              navigation={ad.photos.length > 1}
              style={{ 
                width: '100%', 
                aspectRatio: '16/9',
                borderRadius: '12px',
              }}
            >
              {ad.photos.map((photo, index) => (
                <SwiperSlide key={index}>
                  <img
                    src={photo}
                    alt={`${ad.title} - фото ${index + 1}`}
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover',
                    }}
                  />
                </SwiperSlide>
              ))}
            </Swiper>
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
    </div>
  );
}
