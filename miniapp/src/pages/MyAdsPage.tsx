import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUserStore } from '@/store/useUserStore';
import { Ad } from '@/types';
import { fetchMyAds } from '@/api/ads';
import { Plus, Loader2, Clock, Package, Eye, ShoppingBag, Archive, MapPin } from 'lucide-react';
import { ScheduledAdChip } from '@/components/schedule/ScheduledAdBadge';
import { getThumbnailUrl } from '@/constants/placeholders';

export default function MyAdsPage() {
  const navigate = useNavigate();
  const user = useUserStore((state) => state.user);
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'active' | 'scheduled' | 'archived'>('all');

  useEffect(() => {
    async function loadMyAds() {
      if (!user?.telegramId) {
        setLoading(false);
        return;
      }

      try {
        setError('');
        const data = await fetchMyAds(user.telegramId);
        setAds(data.items || []);
      } catch (err: any) {
        console.error('Error loading my ads:', err);
        setError(err.message || 'Не удалось загрузить объявления');
        setAds([]);
      } finally {
        setLoading(false);
      }
    }

    loadMyAds();
  }, [user]);

  const scheduledAds = ads.filter((ad) => ad.status === 'scheduled');
  const activeAds = ads.filter((ad) => ad.status === 'active' || ad.status === 'draft');
  const archivedAds = ads.filter((ad) => ad.status === 'archived' || ad.status === 'sold');
  
  const filteredAds = ads.filter((ad) => {
    if (filter === 'active') return ad.status === 'active' || ad.status === 'draft';
    if (filter === 'scheduled') return ad.status === 'scheduled';
    if (filter === 'archived') return ad.status === 'archived' || ad.status === 'sold';
    return true;
  });

  if (!user) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}>
        <div style={{
          textAlign: 'center',
          padding: 32,
          maxWidth: 320,
        }}>
          <div style={{
            width: 80,
            height: 80,
            margin: '0 auto 20px',
            background: '#EBF5FF',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <ShoppingBag size={36} color="#3A7BFF" />
          </div>
          <h2 style={{ 
            margin: '0 0 8px', 
            fontSize: 20, 
            fontWeight: 700, 
            color: '#1F2937' 
          }}>
            Требуется авторизация
          </h2>
          <p style={{ 
            margin: 0, 
            fontSize: 15, 
            color: '#6B7280',
            lineHeight: 1.5,
          }}>
            Откройте MiniApp из чата с ботом
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        flexDirection: 'column',
        gap: 16,
        background: '#FFFFFF',
      }}>
        <Loader2 
          size={36} 
          color="#3A7BFF"
          style={{ animation: 'spin 1s linear infinite' }} 
        />
        <p style={{ color: '#6B7280', fontSize: 15 }}>Загрузка объявлений...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}>
        <div style={{
          textAlign: 'center',
          padding: 32,
          maxWidth: 320,
        }}>
          <p style={{ color: '#EF4444', fontSize: 15 }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      background: '#FFFFFF',
      paddingBottom: 100,
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: '#FFFFFF',
        padding: '16px 20px',
        borderBottom: '1px solid #F0F2F5',
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
        }}>
          <h1 style={{ 
            fontSize: 22, 
            fontWeight: 700, 
            color: '#1F2937',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <ShoppingBag size={22} color="#3A7BFF" />
            Мои объявления
          </h1>
          
          <Link
            to="/ads/create"
            style={{
              padding: '10px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              textDecoration: 'none',
              borderRadius: 14,
              fontSize: 14,
              fontWeight: 600,
              background: '#3A7BFF',
              color: '#FFFFFF',
              boxShadow: '0 2px 8px rgba(58, 123, 255, 0.25)',
            }}
            data-testid="button-create-ad"
          >
            <Plus size={18} />
            Создать
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        gap: 8,
        padding: '12px 16px',
        overflowX: 'auto',
        scrollbarWidth: 'none',
      }}>
        {[
          { key: 'all', label: 'Все', count: ads.length },
          { key: 'active', label: 'Активные', count: activeAds.length },
          { key: 'scheduled', label: 'Запланированные', count: scheduledAds.length, icon: Clock },
          { key: 'archived', label: 'Архив', count: archivedAds.length },
        ].filter(tab => tab.key !== 'scheduled' || scheduledAds.length > 0).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            style={{
              flexShrink: 0,
              padding: '10px 16px',
              background: filter === tab.key ? '#3A7BFF' : '#FFFFFF',
              border: filter === tab.key ? 'none' : '1px solid #E5E7EB',
              borderRadius: 20,
              fontSize: 14,
              fontWeight: 500,
              color: filter === tab.key ? '#FFFFFF' : '#6B7280',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            data-testid={`filter-${tab.key}`}
          >
            {tab.icon && <tab.icon size={14} />}
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: 16 }}>
        {filteredAds.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: 48,
          }}>
            <div style={{
              width: 64,
              height: 64,
              background: '#F5F6F8',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Package size={28} color="#9CA3AF" />
            </div>
            <p style={{
              fontSize: 16,
              color: '#6B7280',
              margin: '0 0 8px',
            }}>
              {filter === 'all' ? 'Нет объявлений' : `Нет ${filter === 'active' ? 'активных' : filter === 'scheduled' ? 'запланированных' : 'архивных'} объявлений`}
            </p>
            {filter === 'all' && (
              <p style={{
                fontSize: 14,
                color: '#9CA3AF',
                margin: 0,
              }}>
                Создайте первое объявление, нажав кнопку выше
              </p>
            )}
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}>
            {filteredAds.map((ad) => (
              <MyAdListCard 
                key={ad._id} 
                ad={ad} 
                onClick={() => navigate(`/ads/${ad._id}`)} 
              />
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      {ads.length > 0 && (
        <div style={{
          margin: '16px',
          padding: 16,
          background: '#F8FAFC',
          borderRadius: 16,
        }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr 1fr', 
            gap: 16,
            textAlign: 'center',
          }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#3A7BFF' }}>{ads.length}</div>
              <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>Всего</div>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#22C55E' }}>
                {ads.filter((a) => a.status === 'active').length}
              </div>
              <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>Активных</div>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#6B7280' }}>
                {ads.reduce((sum, a) => sum + (a.views || 0), 0)}
              </div>
              <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>Просмотров</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface MyAdListCardProps {
  ad: Ad;
  onClick: () => void;
}

function MyAdListCard({ ad, onClick }: MyAdListCardProps) {
  const formatPrice = (price: number) => {
    if (price === 0) return 'Даром';
    return `${price.toLocaleString('ru-RU')} руб.`;
  };

  const photoUrl = ad.photos?.[0] 
    ? getThumbnailUrl(ad.photos[0])
    : null;

  const getStatusStyle = () => {
    switch (ad.status) {
      case 'active':
        return { background: '#DCFCE7', color: '#16A34A' };
      case 'scheduled':
        return { background: '#EEF2FF', color: '#4F46E5' };
      case 'sold':
        return { background: '#DBEAFE', color: '#2563EB' };
      case 'archived':
        return { background: '#F3F4F6', color: '#6B7280' };
      case 'draft':
        return { background: '#FEF3C7', color: '#D97706' };
      default:
        return { background: '#F3F4F6', color: '#6B7280' };
    }
  };

  const getStatusLabel = () => {
    switch (ad.status) {
      case 'active': return 'Активно';
      case 'scheduled': return 'Запланировано';
      case 'sold': return 'Продано';
      case 'archived': return 'В архиве';
      case 'draft': return 'Черновик';
      default: return ad.status;
    }
  };

  const statusStyle = getStatusStyle();

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        gap: 12,
        padding: 12,
        background: '#FFFFFF',
        border: '1px solid #F0F2F5',
        borderRadius: 16,
        cursor: 'pointer',
        textAlign: 'left',
      }}
      data-testid={`my-ad-${ad._id}`}
    >
      {/* Photo */}
      <div style={{
        width: 80,
        height: 80,
        borderRadius: 12,
        background: '#F5F6F8',
        flexShrink: 0,
        overflow: 'hidden',
      }}>
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={ad.title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
            loading="lazy"
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Package size={24} color="#9CA3AF" />
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 4,
        }}>
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            padding: '4px 8px',
            borderRadius: 6,
            ...statusStyle,
          }}>
            {getStatusLabel()}
          </span>
          {ad.status === 'scheduled' && ad.publishAt && (
            <ScheduledAdChip publishAt={ad.publishAt} />
          )}
        </div>

        <div style={{
          fontSize: 15,
          fontWeight: 500,
          color: '#1F2937',
          marginBottom: 4,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {ad.title}
        </div>

        <div style={{
          fontSize: 18,
          fontWeight: 700,
          color: '#1F2937',
          marginBottom: 6,
        }}>
          {formatPrice(ad.price)}
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontSize: 12,
          color: '#9CA3AF',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Eye size={12} />
            {ad.views || 0}
          </span>
          {ad.city && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <MapPin size={12} />
              {ad.city}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
