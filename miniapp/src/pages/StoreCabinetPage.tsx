import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, PlusCircle, BarChart3, ArrowLeft, 
  Eye, MessageCircle, Heart, ChevronRight,
  Store, Bell, Crown, Star, Check, Settings,
  Clock, AlertCircle, CheckCircle, XCircle, Sparkles,
  Trash2, MoreVertical, EyeOff, Play, Loader2, AlertTriangle, Archive
} from 'lucide-react';
import http from '@/api/http';
import { useUserStore } from '@/store/useUserStore';
import { usePlatform } from '@/platform/PlatformProvider';

interface DashboardAd {
  _id: string;
  title: string;
  price: number;
  currency: string;
  photos: string[];
  status: string;
  createdAt: string;
  viewsTotal?: number;
  favoritesCount?: number;
  contactClicks?: number;
}

interface ShopRequest {
  _id: string;
  name: string;
  shopType: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: string;
}

interface SellerProfile {
  _id: string;
  name: string;
  slug: string;
  avatar?: string;
  description?: string;
  phone?: string;
  showPhone: boolean;
  isVerified: boolean;
  productsCount: number;
}

interface StoreStats {
  totalAds: number;
  activeAds: number;
  hiddenAds: number;
  viewsLast7Days: number;
  contactClicksLast7Days: number;
}

type TabType = 'products' | 'stats' | 'settings';
type StatusFilter = 'all' | 'active' | 'hidden';

const TABS: { key: TabType; label: string; icon: any; color: string }[] = [
  { key: 'products', label: 'Товары', icon: Package, color: '#3B73FC' },
  { key: 'stats', label: 'Статистика', icon: BarChart3, color: '#8B5CF6' },
  { key: 'settings', label: 'Настройки', icon: Settings, color: '#6B7280' },
];

export default function StoreCabinetPage() {
  const navigate = useNavigate();
  const user = useUserStore((state) => state.user);
  const { getAuthToken } = usePlatform();
  
  const [activeTab, setActiveTab] = useState<TabType>('products');
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  
  const [shopRequest, setShopRequest] = useState<ShopRequest | null>(null);
  const [hasApprovedShop, setHasApprovedShop] = useState(false);
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [stats, setStats] = useState<StoreStats | null>(null);
  const [ads, setAds] = useState<DashboardAd[]>([]);
  const [allAds, setAllAds] = useState<DashboardAd[]>([]);
  const [statusCounts, setStatusCounts] = useState({ active: 0, hidden: 0 });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; ad: DashboardAd | null; deleting: boolean }>({
    open: false,
    ad: null,
    deleting: false,
  });
  const [actionMenu, setActionMenu] = useState<string | null>(null);

  useEffect(() => {
    checkShopStatus();
  }, [user]);

  useEffect(() => {
    if (statusFilter === 'all') {
      setAds(allAds);
    } else {
      setAds(allAds.filter(ad => ad.status === statusFilter));
    }
  }, [statusFilter, allAds]);

  const checkShopStatus = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const token = await getAuthToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const headers = { 'Authorization': `Bearer ${token}` };

      // Check shop request status
      const requestRes = await fetch('/api/seller-profile/my/shop-request', { headers });
      const requestData = await requestRes.json();

      if (requestData.request) {
        setShopRequest(requestData.request);
        
        if (requestData.request.status === 'approved') {
          setHasApprovedShop(true);
          await loadCabinetData(headers);
        }
      }
    } catch (error) {
      console.error('Error checking shop status:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCabinetData = async (headers: Record<string, string>) => {
    try {
      // Load profile
      const profileRes = await fetch('/api/seller-profile/my', { headers });
      const profileData = await profileRes.json();
      if (profileData.profile) {
        setProfile(profileData.profile);
      }

      // Load stats
      const statsRes = await fetch('/api/seller-profile/my/stats', { headers });
      const statsData = await statsRes.json();
      if (statsData.stats) {
        setStats(statsData.stats);
      }

      // Load ads
      const adsRes = await fetch('/api/seller-profile/my/ads', { headers });
      const adsData = await adsRes.json();
      if (adsData.items) {
        setAllAds(adsData.items);
        setAds(adsData.items);
        
        const active = adsData.items.filter((ad: DashboardAd) => ad.status === 'active').length;
        const hidden = adsData.items.filter((ad: DashboardAd) => ad.status === 'hidden').length;
        setStatusCounts({ active, hidden });
      }
    } catch (error) {
      console.error('Error loading cabinet data:', error);
    }
  };

  const handleDeleteAd = async (permanent: boolean) => {
    if (!deleteModal.ad || !user?.telegramId) return;
    
    setDeleteModal(prev => ({ ...prev, deleting: true }));
    try {
      await http.delete(`/api/ads/${deleteModal.ad._id}?permanent=${permanent}&sellerTelegramId=${user.telegramId}`);
      const newAllAds = allAds.filter(ad => ad._id !== deleteModal.ad?._id);
      setAllAds(newAllAds);
      setAds(newAllAds.filter(ad => statusFilter === 'all' || ad.status === statusFilter));
      
      const active = newAllAds.filter(ad => ad.status === 'active').length;
      const hidden = newAllAds.filter(ad => ad.status === 'hidden').length;
      setStatusCounts({ active, hidden });
      
      setDeleteModal({ open: false, ad: null, deleting: false });
    } catch (err: any) {
      console.error('Error deleting ad:', err);
      alert(err.response?.data?.message || 'Не удалось удалить товар');
      setDeleteModal(prev => ({ ...prev, deleting: false }));
    }
  };

  const handleToggleStatus = async (ad: DashboardAd, newStatus: 'active' | 'hidden') => {
    if (!user?.telegramId) return;
    try {
      await http.patch(`/api/ads/${ad._id}/status`, { status: newStatus });
      const newAllAds = allAds.map(a => a._id === ad._id ? { ...a, status: newStatus } : a);
      setAllAds(newAllAds);
      setAds(newAllAds.filter(a => statusFilter === 'all' || a.status === statusFilter));
      
      const active = newAllAds.filter(a => a.status === 'active').length;
      const hidden = newAllAds.filter(a => a.status === 'hidden').length;
      setStatusCounts({ active, hidden });
      
      setActionMenu(null);
    } catch (err: any) {
      console.error('Error updating status:', err);
      alert('Не удалось изменить статус');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: '#F8FAFC',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          width: 40,
          height: 40,
          border: '4px solid #E5E7EB',
          borderTopColor: '#3B73FC',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // No shop request - show apply screen
  if (!shopRequest) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8FAFC' }}>
        <div style={{
          background: 'linear-gradient(135deg, #3B73FC 0%, #2563EB 100%)',
          padding: '16px 20px 60px',
          color: '#fff',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => navigate(-1)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: 12,
                padding: 10,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              data-testid="button-back"
            >
              <ArrowLeft size={20} color="#fff" />
            </button>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
                Мой магазин
              </h1>
            </div>
            <Store size={28} />
          </div>
        </div>

        <div style={{ 
          margin: '0 16px',
          marginTop: -40,
          background: '#fff',
          borderRadius: 20,
          padding: 24,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          textAlign: 'center',
        }}>
          <div style={{
            width: 80,
            height: 80,
            background: 'linear-gradient(135deg, #3B73FC 0%, #2563EB 100%)',
            borderRadius: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <Store size={40} color="#fff" />
          </div>
          
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
            Создайте свой магазин
          </h2>
          <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 24, lineHeight: 1.5 }}>
            Подайте заявку на создание официального магазина и получите доступ к расширенным возможностям продаж
          </p>

          <div style={{ 
            background: '#F0F7FF', 
            borderRadius: 16, 
            padding: 16,
            marginBottom: 24,
            textAlign: 'left',
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1E40AF', marginBottom: 12 }}>
              Преимущества магазина:
            </div>
            {[
              'Верифицированный статус продавца',
              'Персональная страница магазина',
              'Расширенная статистика',
              'Приоритет в поиске',
              'Продвинутые инструменты',
            ].map((feature, idx) => (
              <div key={idx} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 10, 
                marginBottom: 8,
                fontSize: 13,
                color: '#374151',
              }}>
                <Check size={16} color="#3B73FC" />
                {feature}
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate('/create-shop')}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #3B73FC 0%, #2563EB 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: 14,
              padding: '16px 24px',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
            data-testid="button-create-shop"
          >
            <Sparkles size={20} />
            Подать заявку
          </button>
        </div>
      </div>
    );
  }

  // Shop request pending
  if (shopRequest.status === 'pending') {
    return (
      <div style={{ minHeight: '100vh', background: '#F8FAFC' }}>
        <div style={{
          background: 'linear-gradient(135deg, #3B73FC 0%, #2563EB 100%)',
          padding: '16px 20px 60px',
          color: '#fff',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => navigate(-1)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: 12,
                padding: 10,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              data-testid="button-back"
            >
              <ArrowLeft size={20} color="#fff" />
            </button>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
                Мой магазин
              </h1>
            </div>
            <Store size={28} />
          </div>
        </div>

        <div style={{ 
          margin: '0 16px',
          marginTop: -40,
          background: '#fff',
          borderRadius: 20,
          padding: 24,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          textAlign: 'center',
        }}>
          <div style={{
            width: 80,
            height: 80,
            background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
            borderRadius: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <Clock size={40} color="#fff" />
          </div>
          
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
            Заявка на модерации
          </h2>
          <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 20, lineHeight: 1.5 }}>
            Ваша заявка на создание магазина «{shopRequest.name}» находится на рассмотрении. Обычно это занимает до 24 часов.
          </p>

          <div style={{
            background: '#FEF3C7',
            borderRadius: 14,
            padding: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <AlertCircle size={24} color="#F59E0B" />
            <div style={{ textAlign: 'left', flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#92400E' }}>
                Ожидайте уведомление
              </div>
              <div style={{ fontSize: 12, color: '#B45309' }}>
                Мы сообщим вам о решении в Telegram
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Shop request rejected
  if (shopRequest.status === 'rejected') {
    return (
      <div style={{ minHeight: '100vh', background: '#F8FAFC' }}>
        <div style={{
          background: 'linear-gradient(135deg, #3B73FC 0%, #2563EB 100%)',
          padding: '16px 20px 60px',
          color: '#fff',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => navigate(-1)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: 12,
                padding: 10,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              data-testid="button-back"
            >
              <ArrowLeft size={20} color="#fff" />
            </button>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
                Мой магазин
              </h1>
            </div>
            <Store size={28} />
          </div>
        </div>

        <div style={{ 
          margin: '0 16px',
          marginTop: -40,
          background: '#fff',
          borderRadius: 20,
          padding: 24,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          textAlign: 'center',
        }}>
          <div style={{
            width: 80,
            height: 80,
            background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
            borderRadius: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <XCircle size={40} color="#fff" />
          </div>
          
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
            Заявка отклонена
          </h2>
          <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 20, lineHeight: 1.5 }}>
            К сожалению, ваша заявка на магазин «{shopRequest.name}» была отклонена.
          </p>

          {shopRequest.rejectionReason && (
            <div style={{
              background: '#FEE2E2',
              borderRadius: 14,
              padding: 16,
              marginBottom: 20,
              textAlign: 'left',
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#991B1B', marginBottom: 4 }}>
                Причина отклонения:
              </div>
              <div style={{ fontSize: 13, color: '#B91C1C' }}>
                {shopRequest.rejectionReason}
              </div>
            </div>
          )}

          <button
            onClick={() => navigate('/create-shop')}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #3B73FC 0%, #2563EB 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: 14,
              padding: '16px 24px',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
            }}
            data-testid="button-reapply"
          >
            Подать заявку повторно
          </button>
        </div>
      </div>
    );
  }

  // Approved shop - show full cabinet
  const renderProductsTab = () => (
    <div style={{ padding: 16 }}>
      <button
        onClick={() => navigate('/ads/create')}
        style={{
          width: '100%',
          background: 'linear-gradient(135deg, #3B73FC 0%, #2563EB 100%)',
          color: '#fff',
          border: 'none',
          borderRadius: 14,
          padding: '14px 24px',
          fontSize: 15,
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginBottom: 16,
        }}
        data-testid="button-add-product"
      >
        <PlusCircle size={20} />
        Добавить товар
      </button>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto' }}>
        {[
          { key: 'all' as StatusFilter, label: 'Все', count: statusCounts.active + statusCounts.hidden },
          { key: 'active' as StatusFilter, label: 'Активные', count: statusCounts.active },
          { key: 'hidden' as StatusFilter, label: 'Скрытые', count: statusCounts.hidden },
        ].map((filter) => (
          <button
            key={filter.key}
            onClick={() => setStatusFilter(filter.key)}
            style={{
              padding: '8px 14px',
              background: statusFilter === filter.key ? '#3B73FC' : '#F3F4F6',
              borderRadius: 20,
              color: statusFilter === filter.key ? '#fff' : '#374151',
              fontSize: 13,
              fontWeight: 500,
              whiteSpace: 'nowrap',
              border: 'none',
              cursor: 'pointer',
            }}
            data-testid={`filter-${filter.key}`}
          >
            {filter.label} ({filter.count})
          </button>
        ))}
      </div>

      {ads.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Package size={48} color="#9CA3AF" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 16, color: '#6B7280', marginBottom: 16 }}>
            У вас пока нет товаров
          </div>
          <button
            onClick={() => navigate('/ads/create')}
            style={{
              background: '#3B73FC',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              padding: '12px 24px',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
            data-testid="button-add-first-product"
          >
            Добавить первый товар
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {ads.map((ad) => (
            <div
              key={ad._id}
              style={{ position: 'relative' }}
            >
              <div
                onClick={() => navigate(`/ads/${ad._id}`)}
                style={{
                  background: '#fff',
                  borderRadius: 16,
                  padding: 12,
                  display: 'flex',
                  gap: 12,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  cursor: 'pointer',
                }}
                data-testid={`card-store-ad-${ad._id}`}
              >
                <div style={{
                  width: 72,
                  height: 72,
                  borderRadius: 12,
                  background: ad.photos?.[0] 
                    ? `url(/api/media/proxy/${encodeURIComponent(ad.photos[0])}) center/cover`
                    : '#E5E7EB',
                  flexShrink: 0,
                }} />
                <div style={{ flex: 1, minWidth: 0, paddingRight: 28 }}>
                  <div style={{ 
                    fontSize: 15, 
                    fontWeight: 600, 
                    color: '#111827',
                    marginBottom: 4,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {ad.title}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#3B73FC', marginBottom: 6 }}>
                    {ad.price} {ad.currency || 'руб.'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: ad.status === 'active' ? '#10B981' : '#6B7280',
                      background: ad.status === 'active' ? '#D1FAE5' : '#F3F4F6',
                      padding: '3px 8px',
                      borderRadius: 6,
                    }}>
                      {ad.status === 'active' ? 'Активно' : 'Скрыто'}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#6B7280' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Eye size={14} /> {ad.viewsTotal || 0}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Heart size={14} /> {ad.favoritesCount || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActionMenu(actionMenu === ad._id ? null : ad._id);
                  }}
                  style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    width: 28,
                    height: 28,
                    background: actionMenu === ad._id ? '#F3F4F6' : 'transparent',
                    border: 'none',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  data-testid={`button-actions-${ad._id}`}
                >
                  <MoreVertical size={16} color="#6B7280" />
                </button>
              </div>

              {/* Actions Menu */}
              {actionMenu === ad._id && (
                <div 
                  style={{
                    position: 'absolute',
                    top: 44,
                    right: 12,
                    background: '#fff',
                    borderRadius: 12,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                    zIndex: 100,
                    overflow: 'hidden',
                    minWidth: 170,
                  }}
                >
                  {ad.status === 'active' ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStatus(ad, 'hidden');
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
                      Скрыть
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStatus(ad, 'active');
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
                      setDeleteModal({ open: true, ad, deleting: false });
                      setActionMenu(null);
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
          ))}
        </div>
      )}
    </div>
  );

  const renderStatsTab = () => (
    <div style={{ padding: 16 }}>
      <div style={{
        background: 'linear-gradient(135deg, #3B73FC 0%, #2563EB 100%)',
        borderRadius: 20,
        padding: 20,
        color: '#fff',
        marginBottom: 16,
      }}>
        <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 4 }}>Всего просмотров за 7 дней</div>
        <div style={{ fontSize: 32, fontWeight: 700 }}>{stats?.viewsLast7Days || 0}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div style={{
          background: '#fff',
          borderRadius: 16,
          padding: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: '#DBEAFE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Package size={18} color="#3B73FC" />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>{stats?.activeAds || 0}</div>
          <div style={{ fontSize: 12, color: '#6B7280' }}>Активных товаров</div>
        </div>
        
        <div style={{
          background: '#fff',
          borderRadius: 16,
          padding: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: '#D1FAE5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <MessageCircle size={18} color="#10B981" />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>{stats?.contactClicksLast7Days || 0}</div>
          <div style={{ fontSize: 12, color: '#6B7280' }}>Контактов за неделю</div>
        </div>
      </div>

      <button
        onClick={() => navigate('/seller/cabinet/pro-analytics')}
        style={{
          width: '100%',
          background: '#fff',
          border: '2px solid #3B73FC',
          borderRadius: 14,
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          cursor: 'pointer',
        }}
        data-testid="button-pro-analytics"
      >
        <Crown size={20} color="#3B73FC" />
        <span style={{ fontSize: 15, fontWeight: 600, color: '#3B73FC' }}>PRO Аналитика</span>
        <ChevronRight size={18} color="#3B73FC" />
      </button>
    </div>
  );

  const renderSettingsTab = () => (
    <div style={{ padding: 16 }}>
      <div style={{
        background: '#fff',
        borderRadius: 20,
        padding: 20,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: profile?.avatar 
              ? `url(/api/media/proxy/${encodeURIComponent(profile.avatar)}) center/cover`
              : 'linear-gradient(135deg, #3B73FC 0%, #2563EB 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {!profile?.avatar && <Store size={28} color="#fff" />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>
              {profile?.name || 'Мой магазин'}
            </div>
            {profile?.isVerified && (
              <div style={{ 
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: '#DBEAFE',
                color: '#1D4ED8',
                padding: '4px 10px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                marginTop: 4,
              }}>
                <CheckCircle size={14} />
                Верифицирован
              </div>
            )}
          </div>
        </div>

        {profile?.description && (
          <div style={{ 
            fontSize: 14, 
            color: '#6B7280', 
            lineHeight: 1.5,
            marginBottom: 16,
          }}>
            {profile.description}
          </div>
        )}

        <button
          onClick={() => navigate(`/store/${profile?.slug}`)}
          style={{
            width: '100%',
            background: '#F3F4F6',
            border: 'none',
            borderRadius: 12,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 500,
            color: '#374151',
          }}
          data-testid="button-view-store"
        >
          <Eye size={18} />
          Посмотреть страницу магазина
        </button>
      </div>

      <div style={{
        background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
        borderRadius: 16,
        padding: 16,
        color: '#fff',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Star size={20} />
          <span style={{ fontSize: 15, fontWeight: 600 }}>PRO преимущества</span>
        </div>
        <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 12 }}>
          Получите приоритет в выдаче и расширенную аналитику
        </div>
        <button
          style={{
            background: '#fff',
            color: '#7C3AED',
            border: 'none',
            borderRadius: 10,
            padding: '10px 20px',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Подробнее о PRO
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      <div style={{
        background: 'linear-gradient(135deg, #3B73FC 0%, #2563EB 100%)',
        padding: '16px 20px 24px',
        color: '#fff',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: 12,
              padding: 10,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            data-testid="button-back"
          >
            <ArrowLeft size={20} color="#fff" />
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
              Кабинет магазина
            </h1>
            <div style={{ fontSize: 14, opacity: 0.9 }}>
              Управляйте товарами и следите за продажами
            </div>
          </div>
          <Store size={28} />
        </div>
      </div>

      <div style={{ 
        display: 'flex', 
        gap: 4, 
        padding: '0 16px', 
        marginTop: -16,
        background: '#fff',
        borderRadius: '16px 16px 0 0',
        paddingTop: 8,
        paddingBottom: 8,
        boxShadow: '0 -4px 12px rgba(0,0,0,0.05)',
      }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1,
              padding: '10px 8px',
              background: activeTab === tab.key ? tab.color : 'transparent',
              border: 'none',
              borderRadius: 12,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            data-testid={`tab-${tab.key}`}
          >
            <tab.icon 
              size={20} 
              color={activeTab === tab.key ? '#fff' : '#6B7280'} 
            />
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              color: activeTab === tab.key ? '#fff' : '#6B7280',
            }}>
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      <div style={{ background: '#fff', minHeight: 'calc(100vh - 180px)', paddingBottom: 100 }}>
        {activeTab === 'products' && renderProductsTab()}
        {activeTab === 'stats' && renderStatsTab()}
        {activeTab === 'settings' && renderSettingsTab()}
      </div>

      {/* Delete Confirmation Modal */}
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
              Удалить товар?
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
                data-testid="button-archive-product"
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
                data-testid="button-delete-product-permanent"
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
                data-testid="button-cancel-delete-product"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
