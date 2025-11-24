import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, MessageCircle, ArrowLeft, Phone, Share2, Heart, Eye, Calendar, X } from 'lucide-react';
import { getAd, getSimilarAds } from '@/api/ads';
import EmptyState from '@/widgets/EmptyState';
import { Ad, AdPreview } from '@/types';
import FavoriteButton from '@/components/FavoriteButton';
import { useCartStore } from '@/store/cart';
import { formatCityDistance, useGeo } from '@/utils/geo';
import http from '@/api/http';
import { useUserStore } from '@/store/useUserStore';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Navigation, Zoom } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import 'swiper/css/zoom';

export default function AdPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useUserStore((state) => state.user);
  const [ad, setAd] = useState<Ad | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingChat, setStartingChat] = useState(false);
  const [fullscreenGallery, setFullscreenGallery] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [similarAds, setSimilarAds] = useState<AdPreview[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  const { coords } = useGeo(false);

  useEffect(() => {
    if (!id) return;
    const params = coords ? { lat: coords.lat, lng: coords.lng } : {};
    getAd(id, params)
      .then((fetchedAd) => {
        setAd(fetchedAd);
        if (fetchedAd.subcategoryId) {
          setLoadingSimilar(true);
          getSimilarAds(fetchedAd._id, fetchedAd.subcategoryId, 6)
            .then((response) => setSimilarAds(response.items || []))
            .catch(() => setSimilarAds([]))
            .finally(() => setLoadingSimilar(false));
        }
      })
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Недавно';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Сегодня';
    if (diffDays === 1) return 'Вчера';
    if (diffDays < 7) return `${diffDays} дн. назад`;
    return date.toLocaleDateString('ru-RU');
  };

  return (
    <>
      <div style={{ backgroundColor: '#fff', minHeight: '100vh', paddingBottom: 100 }}>
        {/* Header */}
        <div style={{ 
          position: 'sticky', 
          top: 0, 
          zIndex: 20,
          background: '#fff',
          borderBottom: '1px solid #E5E7EB',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'none',
              border: 'none',
              padding: 8,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
            data-testid="button-back"
          >
            <ArrowLeft size={24} color="#111827" />
          </button>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              style={{
                background: 'none',
                border: 'none',
                padding: 8,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              data-testid="button-share"
            >
              <Share2 size={22} color="#6B7280" />
            </button>
            <FavoriteButton adId={ad._id} />
          </div>
        </div>

        {/* Photo Gallery */}
        {ad.photos && ad.photos.length > 0 && (
          <div style={{ position: 'relative', background: '#000' }}>
            <Swiper
              modules={[Pagination, Navigation, Zoom]}
              pagination={{ 
                clickable: true,
                dynamicBullets: false,
              }}
              navigation={ad.photos.length > 1}
              zoom={true}
              onSlideChange={(swiper) => setCurrentPhotoIndex(swiper.activeIndex)}
              onClick={() => setFullscreenGallery(true)}
              style={{ 
                width: '100%', 
                aspectRatio: '4/3',
                cursor: 'pointer'
              }}
            >
              {ad.photos.map((photo, index) => (
                <SwiperSlide key={index}>
                  <div className="swiper-zoom-container">
                    <img
                      src={photo}
                      alt={`${ad.title} - фото ${index + 1}`}
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'contain',
                      }}
                    />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
            {/* Photo counter */}
            <div style={{
              position: 'absolute',
              bottom: 16,
              right: 16,
              background: 'rgba(0, 0, 0, 0.7)',
              color: '#fff',
              padding: '6px 12px',
              borderRadius: 16,
              fontSize: 13,
              fontWeight: 600,
              zIndex: 10,
              backdropFilter: 'blur(4px)'
            }}>
              {currentPhotoIndex + 1} / {ad.photos.length}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div style={{ padding: 16 }}>
          {/* Price */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
              {ad.price.toLocaleString('ru-RU')} {ad.currency || 'р.'}
            </div>
            {(ad.city || ad.distanceKm != null) && (
              <div style={{ fontSize: 14, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={16} />
                {formatCityDistance(ad.city, ad.distanceKm)}
              </div>
            )}
          </div>

          {/* Title */}
          <h1 style={{ 
            fontSize: 22, 
            fontWeight: 600, 
            color: '#111827', 
            margin: '0 0 16px',
            lineHeight: 1.3
          }}>
            {ad.title}
          </h1>

          {/* Meta info */}
          <div style={{ 
            display: 'flex', 
            gap: 16, 
            marginBottom: 20,
            paddingBottom: 20,
            borderBottom: '1px solid #F3F4F6'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6B7280' }}>
              <Calendar size={16} />
              <span>{formatDate(ad.createdAt)}</span>
            </div>
            {ad.views !== undefined && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6B7280' }}>
                <Eye size={16} />
                <span>{ad.views} просмотров</span>
              </div>
            )}
          </div>

          {/* Description */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: '0 0 12px' }}>
              Описание
            </h3>
            <p style={{ 
              fontSize: 15, 
              color: '#374151', 
              lineHeight: 1.6,
              margin: 0,
              whiteSpace: 'pre-wrap'
            }}>
              {ad.description || 'Описание отсутствует'}
            </p>
          </div>

          {/* Attributes */}
          {ad.attributes && Object.keys(ad.attributes).length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: '0 0 12px' }}>
                Характеристики
              </h3>
              <div style={{ 
                background: '#F9FAFB', 
                borderRadius: 12, 
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 12
              }}>
                {Object.entries(ad.attributes).map(([key, value]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                    <span style={{ fontSize: 14, color: '#6B7280' }}>{key}</span>
                    <span style={{ fontSize: 14, color: '#111827', fontWeight: 500, textAlign: 'right' }}>
                      {String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Seller info */}
          <div style={{ 
            background: '#F9FAFB', 
            borderRadius: 12, 
            padding: 16,
            marginBottom: 24
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: '0 0 12px' }}>
              Продавец
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: '#3B73FC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 20,
                fontWeight: 600
              }}>
                {ad.sellerName?.charAt(0).toUpperCase() || 'П'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 2 }}>
                  {ad.sellerName || 'Продавец'}
                </div>
                <div style={{ fontSize: 13, color: '#6B7280' }}>
                  На KETMAR с {new Date().getFullYear() - 1} года
                </div>
              </div>
            </div>
          </div>

          {/* Similar ads */}
          {similarAds.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: '0 0 16px' }}>
                Похожие объявления
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 12,
              }}>
                {similarAds.map((similarAd) => (
                  <div
                    key={similarAd._id}
                    onClick={() => navigate(`/ads/${similarAd._id}`)}
                    style={{ cursor: 'pointer' }}
                    data-testid={`similar-ad-${similarAd._id}`}
                  >
                    <div style={{
                      background: '#fff',
                      borderRadius: 12,
                      overflow: 'hidden',
                      border: '1px solid #E5E7EB'
                    }}>
                      {/* Image */}
                      <div style={{
                        width: '100%',
                        aspectRatio: '4/3',
                        background: '#F3F4F6',
                        position: 'relative'
                      }}>
                        {similarAd.photos && similarAd.photos.length > 0 ? (
                          <img
                            src={similarAd.photos[0]}
                            alt={similarAd.title}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                          />
                        ) : (
                          <div style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#9CA3AF',
                            fontSize: 12
                          }}>
                            Нет фото
                          </div>
                        )}
                      </div>
                      {/* Info */}
                      <div style={{ padding: 10 }}>
                        <div style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: '#111827',
                          marginBottom: 4
                        }}>
                          {similarAd.price.toLocaleString('ru-RU')} {similarAd.currency || 'р.'}
                        </div>
                        <div style={{
                          fontSize: 13,
                          color: '#374151',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          marginBottom: 4
                        }}>
                          {similarAd.title}
                        </div>
                        {similarAd.city && (
                          <div style={{
                            fontSize: 11,
                            color: '#6B7280',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}>
                            <MapPin size={12} />
                            {similarAd.city}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action buttons - fixed bottom */}
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#fff',
          borderTop: '1px solid #E5E7EB',
          padding: 16,
          display: 'flex',
          gap: 12,
          zIndex: 10
        }}>
          <button
            onClick={startChat}
            disabled={startingChat}
            style={{
              flex: 1,
              padding: '14px 20px',
              background: '#3B73FC',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
            data-testid="button-start-chat"
          >
            <MessageCircle size={20} />
            {startingChat ? 'Открываем...' : 'Написать'}
          </button>
          <button
            style={{
              padding: '14px 20px',
              background: '#F3F4F6',
              color: '#111827',
              border: 'none',
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            data-testid="button-call"
          >
            <Phone size={20} />
          </button>
        </div>
      </div>

      {/* Fullscreen gallery modal */}
      {fullscreenGallery && ad.photos && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: '#000',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ 
            padding: 16, 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center' 
          }}>
            <span style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>
              {currentPhotoIndex + 1} / {ad.photos.length}
            </span>
            <button
              onClick={() => setFullscreenGallery(false)}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: 8,
                padding: 8,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={24} color="#fff" />
            </button>
          </div>
          <div style={{ flex: 1 }}>
            <Swiper
              modules={[Pagination, Navigation, Zoom]}
              pagination={{ clickable: true }}
              navigation
              zoom={{ maxRatio: 3 }}
              initialSlide={currentPhotoIndex}
              onSlideChange={(swiper) => setCurrentPhotoIndex(swiper.activeIndex)}
              style={{ width: '100%', height: '100%' }}
            >
              {ad.photos.map((photo, index) => (
                <SwiperSlide key={index}>
                  <div className="swiper-zoom-container">
                    <img
                      src={photo}
                      alt={`${ad.title} - фото ${index + 1}`}
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'contain',
                      }}
                    />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>
      )}
    </>
  );
}
