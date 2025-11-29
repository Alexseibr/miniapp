import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUserStore } from '@/store/useUserStore';
import { Ad } from '@/types';
import { fetchMyAds } from '@/api/ads';
import { Plus, Loader2, Clock, Package, Eye, ShoppingBag, Archive, MapPin, Trash2, X, AlertTriangle, MoreVertical, EyeOff, Play, XCircle, Edit, Gift } from 'lucide-react';
import { ScheduledAdChip } from '@/components/schedule/ScheduledAdBadge';
import { getThumbnailUrl } from '@/constants/placeholders';
import http from '@/api/http';
import ScreenLayout from '@/components/layout/ScreenLayout';

export default function MyAdsPage() {
  const navigate = useNavigate();
  const user = useUserStore((state) => state.user);
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'active' | 'scheduled' | 'rejected' | 'archived'>('all');
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; ad: Ad | null; deleting: boolean }>({
    open: false,
    ad: null,
    deleting: false,
  });
  const [actionMenu, setActionMenu] = useState<string | null>(null);

  const loadMyAds = async () => {
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
  };

  useEffect(() => {
    loadMyAds();
  }, [user]);

  const handleDeleteAd = async (permanent: boolean) => {
    if (!deleteModal.ad || !user?.telegramId) return;
    
    setDeleteModal(prev => ({ ...prev, deleting: true }));
    try {
      await http.delete(`/api/ads/${deleteModal.ad._id}?permanent=${permanent}&sellerTelegramId=${user.telegramId}`);
      setAds(prev => prev.filter(ad => ad._id !== deleteModal.ad?._id));
      setDeleteModal({ open: false, ad: null, deleting: false });
    } catch (err: any) {
      console.error('Error deleting ad:', err);
      alert(err.response?.data?.message || 'Не удалось удалить объявление');
      setDeleteModal(prev => ({ ...prev, deleting: false }));
    }
  };

  const handleToggleStatus = async (ad: Ad, newStatus: 'active' | 'hidden') => {
    if (!user?.telegramId) return;
    try {
      await http.patch(`/api/ads/${ad._id}/status`, { status: newStatus });
      setAds(prev => prev.map(a => a._id === ad._id ? { ...a, status: newStatus } : a));
      setActionMenu(null);
    } catch (err: any) {
      console.error('Error updating status:', err);
      alert('Не удалось изменить статус');
    }
  };

  const scheduledAds = ads.filter((ad) => ad.status === 'scheduled');
  const activeAds = ads.filter((ad) => ad.status === 'active' || ad.status === 'draft');
  const rejectedAds = ads.filter((ad) => ad.moderationStatus === 'rejected');
  const archivedAds = ads.filter((ad) => ad.status === 'archived' || ad.status === 'sold');
  
  const filteredAds = ads.filter((ad) => {
    if (filter === 'active') return ad.status === 'active' || ad.status === 'draft';
    if (filter === 'scheduled') return ad.status === 'scheduled';
    if (filter === 'rejected') return ad.moderationStatus === 'rejected';
    if (filter === 'archived') return ad.status === 'archived' || ad.status === 'sold';
    return true;
  });

  if (!user) {
    return (
      <ScreenLayout showBottomNav={true}>
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          minHeight: '100%',
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
      </ScreenLayout>
    );
  }

  if (loading) {
    return (
      <ScreenLayout showBottomNav={true}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '100%',
          flexDirection: 'column',
          gap: 16,
        }}>
          <Loader2 
            size={36} 
            color="#3A7BFF"
            style={{ animation: 'spin 1s linear infinite' }} 
          />
          <p style={{ color: '#6B7280', fontSize: 15 }}>Загрузка объявлений...</p>
        </div>
      </ScreenLayout>
    );
  }

  if (error) {
    return (
      <ScreenLayout showBottomNav={true}>
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          minHeight: '100%',
        }}>
          <div style={{
            textAlign: 'center',
            padding: 32,
            maxWidth: 320,
          }}>
            <p style={{ color: '#EF4444', fontSize: 15 }}>{error}</p>
          </div>
        </div>
      </ScreenLayout>
    );
  }

  const headerElement = (
    <div style={{
      padding: '16px 20px',
      borderBottom: '1px solid #F0F2F5',
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        gap: 12,
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
  );

  return (
    <ScreenLayout header={headerElement} showBottomNav={true}>
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
          { key: 'rejected', label: 'На доработку', count: rejectedAds.length, icon: XCircle, isWarning: true },
          { key: 'archived', label: 'Архив', count: archivedAds.length },
        ].filter(tab => (tab.key !== 'scheduled' || scheduledAds.length > 0) && (tab.key !== 'rejected' || rejectedAds.length > 0)).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            style={{
              flexShrink: 0,
              padding: '10px 16px',
              background: filter === tab.key 
                ? (tab.isWarning ? '#F97316' : '#3A7BFF') 
                : (tab.isWarning ? '#FFF7ED' : '#FFFFFF'),
              border: filter === tab.key 
                ? 'none' 
                : (tab.isWarning ? '1px solid #FDBA74' : '1px solid #E5E7EB'),
              borderRadius: 20,
              fontSize: 14,
              fontWeight: 500,
              color: filter === tab.key 
                ? '#FFFFFF' 
                : (tab.isWarning ? '#EA580C' : '#6B7280'),
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
                onDelete={() => setDeleteModal({ open: true, ad, deleting: false })}
                onToggleStatus={(newStatus) => handleToggleStatus(ad, newStatus)}
                showActions={actionMenu === ad._id}
                onToggleActions={() => setActionMenu(actionMenu === ad._id ? null : ad._id)}
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

      {/* Delete Confirmation Modal - rendered outside scrollable content */}
      {deleteModal.open && deleteModal.ad && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 1000,
          }}
          onClick={() => !deleteModal.deleting && setDeleteModal({ open: false, ad: null, deleting: false })}
        >
          <div 
            style={{
              background: '#fff',
              borderRadius: 20,
              padding: 24,
              maxWidth: 340,
              width: '100%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              width: 56,
              height: 56,
              background: '#FEE2E2',
              borderRadius: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <AlertTriangle size={28} color="#DC2626" />
            </div>
            
            <h3 style={{ 
              fontSize: 18, 
              fontWeight: 700, 
              color: '#111827', 
              textAlign: 'center',
              margin: '0 0 8px',
            }}>
              Удалить объявление?
            </h3>
            
            <p style={{ 
              fontSize: 14, 
              color: '#6B7280', 
              textAlign: 'center',
              margin: '0 0 20px',
              lineHeight: 1.5,
            }}>
              «{deleteModal.ad.title}»
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => handleDeleteAd(false)}
                disabled={deleteModal.deleting}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  background: '#F3F4F6',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 600,
                  color: '#374151',
                  cursor: deleteModal.deleting ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
                data-testid="button-archive-ad"
              >
                <Archive size={18} />
                В архив
              </button>
              
              <button
                onClick={() => handleDeleteAd(true)}
                disabled={deleteModal.deleting}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  background: '#DC2626',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 600,
                  color: '#fff',
                  cursor: deleteModal.deleting ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
                data-testid="button-delete-ad-permanent"
              >
                {deleteModal.deleting ? (
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Trash2 size={18} />
                )}
                Удалить навсегда
              </button>
              
              <button
                onClick={() => setDeleteModal({ open: false, ad: null, deleting: false })}
                disabled={deleteModal.deleting}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  background: 'transparent',
                  border: 'none',
                  fontSize: 15,
                  fontWeight: 500,
                  color: '#6B7280',
                  cursor: 'pointer',
                }}
                data-testid="button-cancel-delete"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </ScreenLayout>
  );
}

interface MyAdListCardProps {
  ad: Ad;
  onClick: () => void;
  onDelete: () => void;
  onToggleStatus: (newStatus: 'active' | 'hidden') => void;
  showActions: boolean;
  onToggleActions: () => void;
}

function MyAdListCard({ ad, onClick, onDelete, onToggleStatus, showActions, onToggleActions }: MyAdListCardProps) {
  const formatPrice = (price: number) => {
    if (price === 0) return 'Даром';
    return `${price.toLocaleString('ru-RU')} руб.`;
  };

  const photoUrl = ad.photos?.[0] 
    ? getThumbnailUrl(ad.photos[0])
    : null;

  const isRejected = ad.moderationStatus === 'rejected';
  const isGiveaway = ad.isFreeGiveaway === true;
  
  const getStatusStyle = () => {
    if (isRejected) {
      return { background: '#FEE2E2', color: '#DC2626' };
    }
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
    if (isRejected) {
      return 'На доработку';
    }
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
    <div style={{ position: 'relative' }}>
      <div
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
              {isGiveaway ? (
                <Gift size={24} color="#EC4899" />
              ) : (
                <Package size={24} color="#9CA3AF" />
              )}
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
            flexWrap: 'wrap',
          }}>
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '4px 8px',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              ...statusStyle,
            }}>
              {isRejected && <XCircle size={12} />}
              {getStatusLabel()}
            </span>
            {isGiveaway && (
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '4px 8px',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: '#EC4899',
                color: '#FFFFFF',
              }}>
                <Gift size={12} />
                Даром
              </span>
            )}
            {ad.status === 'scheduled' && ad.publishAt && (
              <ScheduledAdChip publishAt={ad.publishAt} />
            )}
          </div>
          
          {/* Rejection reason */}
          {isRejected && ad.moderationComment && (
            <div style={{
              marginBottom: 6,
              padding: '6px 10px',
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
            }}>
              <AlertTriangle size={14} color="#DC2626" style={{ flexShrink: 0, marginTop: 2 }} />
              <span style={{
                fontSize: 12,
                color: '#991B1B',
                lineHeight: 1.4,
              }}>
                {ad.moderationComment}
              </span>
            </div>
          )}

          <div style={{
            fontSize: 15,
            fontWeight: 500,
            color: '#1F2937',
            marginBottom: 4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            paddingRight: 32,
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

        {/* Actions Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleActions();
          }}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 32,
            height: 32,
            background: showActions ? '#F3F4F6' : 'transparent',
            border: 'none',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          data-testid={`button-actions-${ad._id}`}
        >
          <MoreVertical size={18} color="#6B7280" />
        </button>
      </div>

      {/* Actions Menu */}
      {showActions && (
        <div 
          style={{
            position: 'absolute',
            top: 48,
            right: 12,
            background: '#fff',
            borderRadius: 12,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            zIndex: 100,
            overflow: 'hidden',
            minWidth: 180,
          }}
        >
          {/* Edit button for rejected ads */}
          {isRejected && (
            <Link
              to={`/ads/${ad._id}/edit`}
              onClick={(e) => e.stopPropagation()}
              style={{
                display: 'flex',
                width: '100%',
                padding: '12px 16px',
                background: 'transparent',
                textDecoration: 'none',
                alignItems: 'center',
                gap: 10,
                fontSize: 14,
                color: '#3A7BFF',
              }}
              data-testid={`button-edit-${ad._id}`}
            >
              <Edit size={18} color="#3A7BFF" />
              Редактировать
            </Link>
          )}
          
          {ad.status === 'active' ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleStatus('hidden');
              }}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'transparent',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
                fontSize: 14,
                color: '#374151',
              }}
              data-testid={`button-hide-${ad._id}`}
            >
              <EyeOff size={18} color="#6B7280" />
              Скрыть объявление
            </button>
          ) : ad.status === 'hidden' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleStatus('active');
              }}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'transparent',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
                fontSize: 14,
                color: '#374151',
              }}
              data-testid={`button-activate-${ad._id}`}
            >
              <Play size={18} color="#22C55E" />
              Активировать
            </button>
          )}
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              borderTop: '1px solid #F3F4F6',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
              fontSize: 14,
              color: '#DC2626',
            }}
            data-testid={`button-delete-${ad._id}`}
          >
            <Trash2 size={18} color="#DC2626" />
            Удалить
          </button>
        </div>
      )}
    </div>
  );
}
