import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, MessageCircle, ArrowLeft, Phone, Share2, Eye, Calendar, X, ExternalLink, Heart } from 'lucide-react';
import { SiInstagram, SiTelegram } from 'react-icons/si';
import { getAd, getSimilarAds, trackView, trackContact, trackContactReveal } from '@/api/ads';
import EmptyState from '@/widgets/EmptyState';
import { Ad, AdPreview } from '@/types';
import FavoriteButton from '@/components/FavoriteButton';
import { PriceMarketBlock } from '@/components/pricing';
import { formatCityDistance, useGeo } from '@/utils/geo';
import http from '@/api/http';
import { useUserStore } from '@/store/useUserStore';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Navigation, Zoom } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import 'swiper/css/zoom';
import { getFullImageUrl, getThumbnailUrl, NO_PHOTO_PLACEHOLDER } from '@/constants/placeholders';

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
  const [showPhone, setShowPhone] = useState(false);
  const [showPhoneActionSheet, setShowPhoneActionSheet] = useState(false);
  const { coords } = useGeo(false);

  const viewTrackedRef = useRef(false);

  useEffect(() => {
    if (!id) return;
    const params = coords ? { lat: coords.lat, lng: coords.lng } : {};
    getAd(id, params)
      .then((fetchedAd) => {
        setAd(fetchedAd);
        
        if (!viewTrackedRef.current) {
          viewTrackedRef.current = true;
          trackView(fetchedAd._id);
        }
        
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
      const { data } = await http.post('/api/chat/threads', { adId: ad._id });
      navigate(`/chat/${data._id}`);
    } catch (error) {
      console.error('Failed to start chat:', error);
      alert('Не удалось начать чат. Попробуйте позже.');
    } finally {
      setStartingChat(false);
    }
  };

  const handleShare = useCallback(() => {
    const adUrl = `${window.location.origin}/ads/${id}`;
    const shareText = ad ? `${ad.title} - ${ad.price} руб.` : 'Объявление на KETMAR';
    
    if (window.Telegram?.WebApp?.openTelegramLink) {
      const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(adUrl)}&text=${encodeURIComponent(shareText)}`;
      window.Telegram.WebApp.openTelegramLink(telegramShareUrl);
    } else if (navigator.share) {
      navigator.share({
        title: ad?.title || 'KETMAR',
        text: shareText,
        url: adUrl,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(adUrl);
      alert('Ссылка скопирована!');
    }
  }, [id, ad]);

  const handleCallPhone = useCallback(() => {
    if (ad?.contactPhone) {
      trackContact(ad._id);
      window.location.href = `tel:${ad.contactPhone}`;
    }
  }, [ad?.contactPhone, ad?._id]);

  const handleOpenTelegram = useCallback(() => {
    if (ad?.contactUsername) {
      trackContact(ad._id);
      const username = ad.contactUsername.replace('@', '');
      window.open(`https://t.me/${username}`, '_blank');
    }
  }, [ad?.contactUsername, ad?._id]);

  const handleOpenInstagram = useCallback(() => {
    if (ad?.contactInstagram) {
      trackContact(ad._id);
      const username = ad.contactInstagram.replace('@', '');
      window.open(`https://instagram.com/${username}`, '_blank');
    }
  }, [ad?.contactInstagram, ad?._id]);

  const handleShowPhone = useCallback(() => {
    if (!showPhone && ad) {
      trackContactReveal(ad._id);
      setShowPhone(true);
    } else if (showPhone && ad?.contactPhone) {
      setShowPhoneActionSheet(true);
    }
  }, [showPhone, ad]);

  const handlePhoneActionCall = useCallback(() => {
    if (ad?.contactPhone) {
      trackContact(ad._id);
      const normalizedPhone = ad.contactPhone.replace(/[\s\-\(\)]/g, '');
      window.location.href = `tel:${normalizedPhone}`;
    }
    setShowPhoneActionSheet(false);
  }, [ad?.contactPhone, ad?._id]);

  const handlePhoneActionTelegram = useCallback(() => {
    if (ad?.contactPhone) {
      trackContact(ad._id);
      const normalizedPhone = ad.contactPhone.replace(/[\s\-\(\)]/g, '').replace('+', '');
      const tgUrl = `tg://resolve?phone=${normalizedPhone}`;
      const fallbackUrl = `https://t.me/+${normalizedPhone}`;
      
      try {
        window.location.href = tgUrl;
        setTimeout(() => {
          window.open(fallbackUrl, '_blank');
        }, 500);
      } catch {
        window.open(fallbackUrl, '_blank');
      }
    }
    setShowPhoneActionSheet(false);
  }, [ad?.contactPhone, ad?._id]);

  if (loading) {
    return <EmptyState title="Загружаем объявление" />;
  }

  if (!ad) {
    return <EmptyState title="Объявление не найдено" description="Возможно, оно было удалено продавцом" />;
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Недавно';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const hasContacts = ad.contactPhone || ad.contactUsername || ad.contactInstagram;

  return (
    <>
      <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', paddingBottom: 100 }}>
        {/* Photo Gallery with overlay buttons */}
        <div style={{ position: 'relative', background: '#000' }}>
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            style={{
              position: 'absolute',
              top: 16,
              left: 16,
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.95)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 20,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            }}
            data-testid="button-back"
          >
            <ArrowLeft size={22} color="#111827" />
          </button>

          {/* Action buttons (share, favorite) */}
          <div style={{
            position: 'absolute',
            top: 16,
            right: 16,
            display: 'flex',
            gap: 10,
            zIndex: 20,
          }}>
            <button
              onClick={handleShare}
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.95)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              }}
              data-testid="button-share"
            >
              <Share2 size={20} color="#111827" />
            </button>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.95)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            }}>
              <FavoriteButton adId={ad._id} />
            </div>
          </div>

          {/* Photo Swiper */}
          {ad.photos && ad.photos.length > 0 ? (
            <Swiper
              modules={[Pagination, Navigation, Zoom]}
              pagination={{ 
                clickable: true,
                dynamicBullets: false,
                bulletClass: 'swiper-pagination-bullet',
                bulletActiveClass: 'swiper-pagination-bullet-active',
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
                      src={getFullImageUrl(photo)}
                      alt={`${ad.title} - фото ${index + 1}`}
                      loading={index === 0 ? 'eager' : 'lazy'}
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover',
                        background: '#1F2937',
                      }}
                    />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          ) : (
            <div style={{
              width: '100%',
              aspectRatio: '4/3',
              background: '#1F2937',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6B7280',
              fontSize: 16,
            }}>
              Нет фото
            </div>
          )}
          
          {/* Photo counter */}
          {ad.photos && ad.photos.length > 1 && (
            <div style={{
              position: 'absolute',
              bottom: 16,
              right: 16,
              background: 'rgba(0, 0, 0, 0.7)',
              color: '#fff',
              padding: '6px 12px',
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 600,
              zIndex: 10,
              backdropFilter: 'blur(4px)'
            }}>
              {currentPhotoIndex + 1} / {ad.photos.length}
            </div>
          )}
        </div>

        {/* Main Content Card */}
        <div style={{ 
          background: '#fff', 
          borderRadius: '20px 20px 0 0', 
          marginTop: -16,
          position: 'relative',
          zIndex: 5,
          padding: 20,
        }}>
          {/* Price */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ 
              fontSize: 28, 
              fontWeight: 700, 
              color: '#111827', 
              marginBottom: 6,
              letterSpacing: '-0.5px',
            }}>
              {ad.price.toLocaleString('ru-RU')} руб.
            </div>
            {(ad.city || ad.distanceKm != null) && (
              <div style={{ 
                fontSize: 15, 
                color: '#6B7280', 
                display: 'flex', 
                alignItems: 'center', 
                gap: 6,
              }}>
                <MapPin size={16} color="#3B73FC" />
                {formatCityDistance(ad.city, ad.distanceKm)}
              </div>
            )}
          </div>

          {/* Title */}
          <h1 style={{ 
            fontSize: 20, 
            fontWeight: 600, 
            color: '#111827', 
            margin: '0 0 12px',
            lineHeight: 1.35,
          }}>
            {ad.title}
          </h1>

          {/* Meta info */}
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap',
            gap: '12px 16px', 
            marginBottom: 20,
            paddingBottom: 20,
            borderBottom: '1px solid #F3F4F6'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6B7280' }}>
              <Calendar size={15} />
              <span>{formatDate(ad.createdAt)}</span>
            </div>
            {(ad.viewsTotal !== undefined || ad.views !== undefined) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6B7280' }}>
                <Eye size={15} />
                <span>{ad.viewsTotal || ad.views || 0} {(ad.viewsTotal || ad.views || 0) === 1 ? 'просмотр' : 'просмотров'}</span>
              </div>
            )}
            {ad.favoritesCount !== undefined && ad.favoritesCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#E11D48' }}>
                <Heart size={15} fill="#E11D48" />
                <span>{ad.favoritesCount} в избранном</span>
              </div>
            )}
          </div>

          {/* Price Market Analysis */}
          {ad.priceBadge && (
            <div style={{ marginBottom: 20 }}>
              <PriceMarketBlock
                badge={ad.priceBadge}
                avgPrice={ad.priceBadge.avgPrice}
                windowDays={ad.priceBadge.windowDays}
                categorySlug={ad.subcategoryId || ad.categoryId}
                price={ad.price}
              />
            </div>
          )}

          {/* Description */}
          {ad.description && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 17, fontWeight: 600, color: '#111827', margin: '0 0 12px' }}>
                Описание
              </h3>
              <p style={{ 
                fontSize: 15, 
                color: '#374151', 
                lineHeight: 1.65,
                margin: 0,
                whiteSpace: 'pre-wrap'
              }}>
                {ad.description}
              </p>
            </div>
          )}

          {/* Attributes */}
          {ad.attributes && Object.keys(ad.attributes).length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 17, fontWeight: 600, color: '#111827', margin: '0 0 12px' }}>
                Характеристики
              </h3>
              <div style={{ 
                background: '#F9FAFB', 
                borderRadius: 16, 
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
            borderRadius: 16, 
            padding: 16,
            marginBottom: 24
          }}>
            <h3 style={{ fontSize: 17, fontWeight: 600, color: '#111827', margin: '0 0 14px' }}>
              Продавец
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: hasContacts ? 16 : 0 }}>
              <div style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #3B73FC 0%, #2563EB 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 22,
                fontWeight: 600,
                boxShadow: '0 2px 8px rgba(59, 115, 252, 0.3)',
              }}>
                {ad.sellerName?.charAt(0).toUpperCase() || 'П'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 600, color: '#111827', marginBottom: 4 }}>
                  {ad.sellerName || 'Продавец'}
                </div>
                <div style={{ fontSize: 13, color: '#6B7280' }}>
                  На KETMAR с 2024 года
                </div>
              </div>
            </div>

            {/* Contact buttons */}
            {hasContacts && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {ad.contactPhone && (
                  <button
                    onClick={handleShowPhone}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      background: showPhone ? '#3B73FC' : '#fff',
                      color: showPhone ? '#fff' : '#111827',
                      border: showPhone ? 'none' : '1px solid #E5E7EB',
                      borderRadius: 14,
                      fontSize: 15,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                    }}
                    data-testid="button-show-phone"
                  >
                    <Phone size={18} />
                    {showPhone ? ad.contactPhone : 'Показать телефон'}
                  </button>
                )}

                {ad.contactUsername && (
                  <button
                    onClick={handleOpenTelegram}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      background: '#fff',
                      color: '#0088cc',
                      border: '1px solid #0088cc',
                      borderRadius: 14,
                      fontSize: 15,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                    }}
                    data-testid="button-telegram"
                  >
                    <SiTelegram size={18} />
                    Написать в Telegram
                  </button>
                )}

                {ad.contactInstagram && (
                  <button
                    onClick={handleOpenInstagram}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      background: '#fff',
                      color: '#E4405F',
                      border: '1px solid #E4405F',
                      borderRadius: 14,
                      fontSize: 15,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                    }}
                    data-testid="button-instagram"
                  >
                    <SiInstagram size={18} />
                    {ad.contactInstagram}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Similar ads - horizontal scroll */}
          {similarAds.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: '0 0 16px' }}>
                Похожие объявления
              </h3>
              <div style={{
                display: 'flex',
                gap: 12,
                overflowX: 'auto',
                paddingBottom: 8,
                marginLeft: -20,
                marginRight: -20,
                paddingLeft: 20,
                paddingRight: 20,
                scrollSnapType: 'x mandatory',
                WebkitOverflowScrolling: 'touch',
              }}>
                {similarAds.map((similarAd) => (
                  <div
                    key={similarAd._id}
                    onClick={() => navigate(`/ads/${similarAd._id}`)}
                    style={{ 
                      cursor: 'pointer',
                      flexShrink: 0,
                      width: 160,
                      scrollSnapAlign: 'start',
                    }}
                    data-testid={`similar-ad-${similarAd._id}`}
                  >
                    <div style={{
                      background: '#fff',
                      borderRadius: 16,
                      overflow: 'hidden',
                      border: '1px solid #E5E7EB',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                    }}>
                      <div style={{
                        width: '100%',
                        aspectRatio: '4/3',
                        background: '#F3F4F6',
                        position: 'relative',
                        overflow: 'hidden',
                      }}>
                        {similarAd.photos && similarAd.photos.length > 0 ? (
                          <img
                            src={getThumbnailUrl(similarAd.photos[0])}
                            alt={similarAd.title}
                            loading="lazy"
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
                      <div style={{ padding: 12 }}>
                        <div style={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: '#111827',
                          marginBottom: 4
                        }}>
                          {similarAd.price.toLocaleString('ru-RU')} руб.
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
                            <MapPin size={11} />
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
          padding: '12px 16px',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
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
              borderRadius: 14,
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              minHeight: 52,
            }}
            data-testid="button-start-chat"
          >
            <MessageCircle size={20} />
            {startingChat ? 'Открываем...' : 'Написать'}
          </button>
          {ad.contactPhone && (
            <button
              onClick={() => setShowPhoneActionSheet(true)}
              style={{
                padding: '14px 20px',
                background: '#10B981',
                color: '#fff',
                border: 'none',
                borderRadius: 14,
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 52,
              }}
              data-testid="button-call"
            >
              <Phone size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Phone Action Sheet */}
      {showPhoneActionSheet && (
        <div
          onClick={() => setShowPhoneActionSheet(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9998,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
          data-testid="phone-action-sheet-overlay"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 500,
              background: '#fff',
              borderRadius: '20px 20px 0 0',
              padding: '20px 16px',
              paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
              animation: 'slideUp 0.3s ease-out',
            }}
          >
            <div style={{
              width: 36,
              height: 4,
              background: '#E5E7EB',
              borderRadius: 2,
              margin: '0 auto 20px',
            }} />
            
            <h3 style={{
              fontSize: 18,
              fontWeight: 600,
              color: '#111827',
              textAlign: 'center',
              marginBottom: 20,
            }}>
              Как связаться с продавцом?
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                onClick={handlePhoneActionCall}
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  background: '#10B981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 14,
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                }}
                data-testid="button-action-call"
              >
                <Phone size={20} />
                Позвонить
              </button>
              
              <button
                onClick={handlePhoneActionTelegram}
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  background: '#0088cc',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 14,
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                }}
                data-testid="button-action-telegram"
              >
                <SiTelegram size={20} />
                Написать в Telegram
              </button>
              
              <button
                onClick={() => setShowPhoneActionSheet(false)}
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  background: '#F3F4F6',
                  color: '#6B7280',
                  border: 'none',
                  borderRadius: 14,
                  fontSize: 16,
                  fontWeight: 500,
                  cursor: 'pointer',
                  marginTop: 4,
                }}
                data-testid="button-action-cancel"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

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
                      src={getFullImageUrl(photo)}
                      alt={`${ad.title} - фото ${index + 1}`}
                      loading={index === 0 ? 'eager' : 'lazy'}
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
