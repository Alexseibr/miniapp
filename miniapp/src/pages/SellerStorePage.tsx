import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Store, MapPin, Star, Users, Package, Phone, MessageCircle, 
  Bell, BellOff, ExternalLink, Share2, Clock, ArrowLeft,
  Truck, Leaf, Check, ShieldCheck, Eye
} from 'lucide-react';
import { FaTelegram, FaInstagram } from 'react-icons/fa';
import { useToast } from '@/hooks/use-toast';
import { usePlatform } from '@/platform/PlatformProvider';
import LazyImage from '@/components/LazyImage';
import { getThumbnailUrl } from '@/constants/placeholders';

interface SellerProfile {
  _id: string;
  slug: string;
  name: string;
  avatar?: string;
  banner?: string;
  description?: string;
  isFarmer: boolean;
  phone?: string;
  telegramUsername?: string;
  instagram?: string;
  address?: string;
  city?: string;
  ratings: {
    score: number;
    count: number;
  };
  subscribersCount: number;
  productsCount: number;
  isVerified: boolean;
  workingHours?: string;
  deliveryInfo?: string;
  analytics?: {
    totalViews: number;
  };
}

interface SellerItem {
  _id: string;
  title: string;
  price: number;
  currency: string;
  photos: string[];
  unitType?: string;
  isFarmerAd?: boolean;
}

type TabType = 'products' | 'reviews';

export default function SellerStorePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { getAuthToken } = usePlatform();
  const [activeTab, setActiveTab] = useState<TabType>('products');

  const { data: storeData, isLoading: storeLoading } = useQuery({
    queryKey: ['/api/seller-profile', id],
    queryFn: async () => {
      const token = await getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const res = await fetch(`/api/seller-profile/${id}`, { headers });
      if (!res.ok) throw new Error('Store not found');
      return res.json();
    },
    enabled: !!id,
  });

  const { data: itemsData, isLoading: itemsLoading } = useQuery({
    queryKey: ['/api/seller-profile', id, 'items'],
    queryFn: async () => {
      const res = await fetch(`/api/seller-profile/${id}/items?limit=50`);
      if (!res.ok) throw new Error('Failed to load items');
      return res.json();
    },
    enabled: !!id,
  });

  const { data: reviewsData } = useQuery({
    queryKey: ['/api/seller', id, 'reviews'],
    queryFn: async () => {
      const token = await getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const res = await fetch(`/api/seller/${id}/reviews`, { headers });
      if (!res.ok) throw new Error('Failed to load reviews');
      return res.json();
    },
    enabled: !!id,
  });

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');
      
      const res = await fetch(`/api/seller/subscribe/${id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error('Subscribe failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/seller-profile', id] });
      toast({ title: 'Вы подписались на магазин' });
    },
  });

  const unsubscribeMutation = useMutation({
    mutationFn: async () => {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');
      
      const res = await fetch(`/api/seller/subscribe/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Unsubscribe failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/seller-profile', id] });
      toast({ title: 'Вы отписались от магазина' });
    },
  });

  const handleContact = async () => {
    const token = await getAuthToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    await fetch(`/api/seller-profile/${id}/contact`, { 
      method: 'POST',
      headers,
    });
  };

  const handleShare = () => {
    const url = `https://t.me/KetmarM_bot/app?startapp=store_${profile?.slug || id}`;
    if (navigator.share) {
      navigator.share({ title: profile?.name, url });
    } else {
      navigator.clipboard.writeText(url);
      toast({ title: 'Ссылка скопирована' });
    }
  };

  if (storeLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8FAFC' }}>
        <div style={{
          background: 'linear-gradient(135deg, #3B73FC 0%, #2563EB 100%)',
          height: 200,
        }} />
        <div style={{ padding: 16, marginTop: -60 }}>
          <div style={{
            width: 100,
            height: 100,
            borderRadius: 20,
            background: '#E5E7EB',
            border: '4px solid #fff',
            animation: 'pulse 2s infinite',
          }} />
          <div style={{ marginTop: 16 }}>
            <div style={{ height: 24, width: 200, background: '#E5E7EB', borderRadius: 8, animation: 'pulse 2s infinite' }} />
            <div style={{ height: 16, width: 120, background: '#E5E7EB', borderRadius: 8, marginTop: 8, animation: 'pulse 2s infinite' }} />
          </div>
        </div>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    );
  }

  const profile: SellerProfile | undefined = storeData?.profile;
  const isSubscribed = storeData?.isSubscribed;
  const isOwner = storeData?.isOwner;
  const items: SellerItem[] = itemsData?.items || [];
  const reviews = reviewsData?.reviews || [];
  const reviewStats = reviewsData?.stats;

  if (!profile) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: '#F8FAFC',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}>
        <div style={{
          background: '#fff',
          borderRadius: 24,
          padding: 40,
          textAlign: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            background: 'linear-gradient(135deg, #3B73FC 0%, #2563EB 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <Store size={40} color="#fff" />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
            Магазин не найден
          </h2>
          <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 20 }}>
            Возможно, он был удален или ссылка неверна
          </p>
          <button
            onClick={() => navigate('/')}
            style={{
              height: 48,
              padding: '0 32px',
              background: 'linear-gradient(135deg, #3B73FC 0%, #2563EB 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
            data-testid="button-go-home"
          >
            На главную
          </button>
        </div>
      </div>
    );
  }

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: 'products', label: 'Товары', count: profile.productsCount },
    { key: 'reviews', label: 'Отзывы', count: profile.ratings.count },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', paddingBottom: 100 }}>
      {/* Header with banner */}
      <div style={{
        background: profile.banner 
          ? `url(${profile.banner}) center/cover`
          : 'linear-gradient(135deg, #3B73FC 0%, #2563EB 100%)',
        height: 200,
        position: 'relative',
      }}>
        {profile.banner && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.5) 100%)',
          }} />
        )}
        
        {/* Top actions */}
        <div style={{
          position: 'absolute',
          top: 16,
          left: 16,
          right: 16,
          display: 'flex',
          justifyContent: 'space-between',
        }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(10px)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            data-testid="button-back"
          >
            <ArrowLeft size={20} color="#fff" />
          </button>
          
          <button
            onClick={handleShare}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(10px)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            data-testid="button-share-store"
          >
            <Share2 size={20} color="#fff" />
          </button>
        </div>
      </div>

      {/* Profile section */}
      <div style={{ padding: '0 16px', marginTop: -50 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
          {/* Avatar */}
          <div style={{
            width: 100,
            height: 100,
            borderRadius: 24,
            background: profile.avatar 
              ? `url(${profile.avatar}) center/cover`
              : 'linear-gradient(135deg, #3B73FC 0%, #2563EB 100%)',
            border: '4px solid #fff',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}>
            {profile.avatar ? (
              <LazyImage
                src={profile.avatar}
                alt={profile.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <Store size={40} color="#fff" />
            )}
          </div>

          {/* Name and badges */}
          <div style={{ flex: 1, paddingBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h1 style={{ 
                fontSize: 22, 
                fontWeight: 700, 
                color: '#111827',
                margin: 0,
              }} data-testid="text-store-name">
                {profile.name}
              </h1>
              {profile.isVerified && (
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #3B73FC 0%, #2563EB 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Check size={14} color="#fff" strokeWidth={3} />
                </div>
              )}
            </div>
            
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 12, 
              marginTop: 6,
              flexWrap: 'wrap',
            }}>
              {profile.city && (
                <span style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 4, 
                  fontSize: 14, 
                  color: '#6B7280' 
                }}>
                  <MapPin size={14} />
                  {profile.city}
                </span>
              )}
              {profile.ratings.count > 0 && (
                <span style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 4, 
                  fontSize: 14, 
                  color: '#6B7280' 
                }}>
                  <Star size={14} fill="#FBBF24" color="#FBBF24" />
                  {profile.ratings.score.toFixed(1)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tags */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          {profile.isFarmer && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              background: '#D1FAE5',
              color: '#059669',
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 600,
            }} data-testid="badge-farmer">
              <Leaf size={14} />
              Фермер
            </div>
          )}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            background: '#EEF2FF',
            color: '#4F46E5',
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 600,
          }}>
            <Users size={14} />
            {profile.subscribersCount} подписчиков
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            background: '#FEF3C7',
            color: '#92400E',
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 600,
          }}>
            <Package size={14} />
            {profile.productsCount} товаров
          </div>
        </div>

        {/* Description */}
        {profile.description && (
          <p style={{ 
            fontSize: 14, 
            color: '#6B7280', 
            marginTop: 16,
            lineHeight: 1.5,
          }} data-testid="text-store-description">
            {profile.description}
          </p>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          {!isOwner && (
            <button
              onClick={() => isSubscribed ? unsubscribeMutation.mutate() : subscribeMutation.mutate()}
              disabled={subscribeMutation.isPending || unsubscribeMutation.isPending}
              style={{
                flex: 1,
                height: 48,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                background: isSubscribed ? '#fff' : 'linear-gradient(135deg, #3B73FC 0%, #2563EB 100%)',
                color: isSubscribed ? '#3B73FC' : '#fff',
                border: isSubscribed ? '2px solid #3B73FC' : 'none',
                borderRadius: 14,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                opacity: subscribeMutation.isPending || unsubscribeMutation.isPending ? 0.7 : 1,
              }}
              data-testid="button-subscribe"
            >
              {isSubscribed ? (
                <>
                  <BellOff size={18} />
                  Отписаться
                </>
              ) : (
                <>
                  <Bell size={18} />
                  Подписаться
                </>
              )}
            </button>
          )}
          
          <button
            onClick={handleContact}
            style={{
              flex: 1,
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              background: '#fff',
              color: '#3B73FC',
              border: '2px solid #3B73FC',
              borderRadius: 14,
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
            data-testid="button-contact"
          >
            <MessageCircle size={18} />
            Связаться
          </button>
        </div>

        {/* Contacts card */}
        {(profile.phone || profile.telegramUsername || profile.instagram) && (
          <div style={{
            background: '#fff',
            borderRadius: 20,
            padding: 16,
            marginTop: 16,
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 12 }}>
              Контакты
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {profile.phone && (
                <a 
                  href={`tel:${profile.phone}`}
                  onClick={handleContact}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 14px',
                    background: '#F8FAFC',
                    borderRadius: 12,
                    textDecoration: 'none',
                    color: '#111827',
                    fontSize: 14,
                  }}
                  data-testid="link-phone"
                >
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Phone size={18} color="#fff" />
                  </div>
                  <span style={{ fontWeight: 500 }}>{profile.phone}</span>
                </a>
              )}
              {profile.telegramUsername && (
                <a 
                  href={`https://t.me/${profile.telegramUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleContact}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 14px',
                    background: '#F8FAFC',
                    borderRadius: 12,
                    textDecoration: 'none',
                    color: '#111827',
                    fontSize: 14,
                  }}
                  data-testid="link-telegram"
                >
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #0088cc 0%, #0077b5 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <FaTelegram size={18} color="#fff" />
                  </div>
                  <span style={{ fontWeight: 500 }}>@{profile.telegramUsername}</span>
                  <ExternalLink size={14} color="#9CA3AF" style={{ marginLeft: 'auto' }} />
                </a>
              )}
              {profile.instagram && (
                <a 
                  href={`https://instagram.com/${profile.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleContact}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 14px',
                    background: '#F8FAFC',
                    borderRadius: 12,
                    textDecoration: 'none',
                    color: '#111827',
                    fontSize: 14,
                  }}
                  data-testid="link-instagram"
                >
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #E1306C 0%, #C13584 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <FaInstagram size={18} color="#fff" />
                  </div>
                  <span style={{ fontWeight: 500 }}>@{profile.instagram}</span>
                  <ExternalLink size={14} color="#9CA3AF" style={{ marginLeft: 'auto' }} />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Info card */}
        {(profile.workingHours || profile.deliveryInfo) && (
          <div style={{
            background: '#fff',
            borderRadius: 20,
            padding: 16,
            marginTop: 12,
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {profile.workingHours && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: '#EEF2FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Clock size={18} color="#4F46E5" />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: '#6B7280' }}>Часы работы</div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#111827', marginTop: 2 }}>
                      {profile.workingHours}
                    </div>
                  </div>
                </div>
              )}
              {profile.deliveryInfo && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: '#FEF3C7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Truck size={18} color="#92400E" />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: '#6B7280' }}>Доставка</div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#111827', marginTop: 2 }}>
                      {profile.deliveryInfo}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ marginTop: 24 }}>
        <div style={{
          display: 'flex',
          gap: 8,
          padding: '0 16px',
          marginBottom: 16,
        }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                height: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                background: activeTab === tab.key 
                  ? 'linear-gradient(135deg, #3B73FC 0%, #2563EB 100%)' 
                  : '#fff',
                color: activeTab === tab.key ? '#fff' : '#6B7280',
                border: activeTab === tab.key ? 'none' : '1px solid #E5E7EB',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: activeTab === tab.key ? '0 4px 12px rgba(59, 115, 252, 0.3)' : 'none',
              }}
              data-testid={`tab-${tab.key}`}
            >
              {tab.label}
              <span style={{
                background: activeTab === tab.key ? 'rgba(255,255,255,0.2)' : '#F3F4F6',
                padding: '2px 8px',
                borderRadius: 10,
                fontSize: 12,
              }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ padding: '0 16px' }}>
          {activeTab === 'products' && (
            <>
              {itemsLoading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} style={{
                      background: '#fff',
                      borderRadius: 16,
                      height: 220,
                      animation: 'pulse 2s infinite',
                    }} />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div style={{
                  background: '#fff',
                  borderRadius: 20,
                  padding: 40,
                  textAlign: 'center',
                }}>
                  <div style={{
                    width: 64,
                    height: 64,
                    borderRadius: 16,
                    background: '#F3F4F6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}>
                    <Package size={28} color="#9CA3AF" />
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 4 }}>
                    Пока нет товаров
                  </div>
                  <div style={{ fontSize: 14, color: '#6B7280' }}>
                    Продавец ещё не добавил товары
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                  {items.map(item => (
                    <div
                      key={item._id}
                      onClick={() => navigate(`/ad/${item._id}`)}
                      style={{
                        background: '#fff',
                        borderRadius: 16,
                        overflow: 'hidden',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                        cursor: 'pointer',
                      }}
                      data-testid={`product-card-${item._id}`}
                    >
                      <div style={{
                        aspectRatio: '1',
                        background: '#F3F4F6',
                        position: 'relative',
                      }}>
                        {item.photos?.[0] ? (
                          <LazyImage
                            src={getThumbnailUrl(item.photos[0])}
                            alt={item.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            <Package size={32} color="#9CA3AF" />
                          </div>
                        )}
                        {item.isFarmerAd && (
                          <div style={{
                            position: 'absolute',
                            top: 8,
                            left: 8,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '4px 8px',
                            background: '#D1FAE5',
                            color: '#059669',
                            borderRadius: 8,
                            fontSize: 11,
                            fontWeight: 600,
                          }}>
                            <Leaf size={12} />
                            Фермер
                          </div>
                        )}
                      </div>
                      <div style={{ padding: 12 }}>
                        <h3 style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: '#111827',
                          margin: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          lineHeight: 1.3,
                          minHeight: '2.6em',
                        }}>
                          {item.title}
                        </h3>
                        <div style={{
                          marginTop: 8,
                          fontSize: 16,
                          fontWeight: 700,
                          color: '#3B73FC',
                        }}>
                          {item.price} {item.currency}
                          {item.unitType && (
                            <span style={{ fontSize: 12, fontWeight: 400, color: '#6B7280' }}>
                              /{item.unitType === 'kg' ? 'кг' : item.unitType === 'piece' ? 'шт' : item.unitType}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'reviews' && (
            <>
              {reviewStats && reviewStats.totalReviews > 0 && (
                <div style={{
                  background: '#fff',
                  borderRadius: 20,
                  padding: 20,
                  marginBottom: 16,
                  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                }}>
                  <div style={{ display: 'flex', gap: 20 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 36, fontWeight: 700, color: '#111827' }}>
                        {reviewStats.avgRating.toFixed(1)}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 4 }}>
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star
                            key={s}
                            size={16}
                            fill={s <= Math.round(reviewStats.avgRating) ? '#FBBF24' : '#E5E7EB'}
                            color={s <= Math.round(reviewStats.avgRating) ? '#FBBF24' : '#E5E7EB'}
                          />
                        ))}
                      </div>
                      <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
                        {reviewStats.totalReviews} отзывов
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      {[5, 4, 3, 2, 1].map(rating => (
                        <div key={rating} style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 8,
                          marginBottom: 4,
                        }}>
                          <span style={{ fontSize: 12, color: '#6B7280', width: 12 }}>{rating}</span>
                          <div style={{ 
                            flex: 1, 
                            height: 8, 
                            background: '#F3F4F6', 
                            borderRadius: 4,
                            overflow: 'hidden',
                          }}>
                            <div style={{
                              height: '100%',
                              width: `${(reviewStats.distribution[rating] / reviewStats.totalReviews) * 100}%`,
                              background: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)',
                              borderRadius: 4,
                            }} />
                          </div>
                          <span style={{ fontSize: 12, color: '#9CA3AF', width: 20, textAlign: 'right' }}>
                            {reviewStats.distribution[rating]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {reviews.length === 0 ? (
                <div style={{
                  background: '#fff',
                  borderRadius: 20,
                  padding: 40,
                  textAlign: 'center',
                }}>
                  <div style={{
                    width: 64,
                    height: 64,
                    borderRadius: 16,
                    background: '#F3F4F6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}>
                    <Star size={28} color="#9CA3AF" />
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 4 }}>
                    Пока нет отзывов
                  </div>
                  <div style={{ fontSize: 14, color: '#6B7280' }}>
                    Станьте первым, кто оставит отзыв
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {reviews.map((review: any) => (
                    <div key={review._id} style={{
                      background: '#fff',
                      borderRadius: 16,
                      padding: 16,
                      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>
                            {review.userId?.firstName || 'Покупатель'}
                          </div>
                          <div style={{ display: 'flex', gap: 2, marginTop: 4 }}>
                            {[1, 2, 3, 4, 5].map(s => (
                              <Star
                                key={s}
                                size={14}
                                fill={s <= review.rating ? '#FBBF24' : '#E5E7EB'}
                                color={s <= review.rating ? '#FBBF24' : '#E5E7EB'}
                              />
                            ))}
                          </div>
                        </div>
                        <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                          {new Date(review.createdAt).toLocaleDateString('ru-RU')}
                        </span>
                      </div>
                      {review.text && (
                        <p style={{ 
                          fontSize: 14, 
                          color: '#374151', 
                          marginTop: 12,
                          lineHeight: 1.5,
                        }}>
                          {review.text}
                        </p>
                      )}
                      {review.sellerReply && (
                        <div style={{
                          marginTop: 12,
                          paddingLeft: 12,
                          borderLeft: '3px solid #3B73FC',
                        }}>
                          <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>
                            Ответ продавца
                          </div>
                          <p style={{ fontSize: 14, color: '#374151', margin: 0 }}>
                            {review.sellerReply.text}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
