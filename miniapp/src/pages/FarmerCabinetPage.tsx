import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, PlusCircle, BarChart3, TrendingUp, ArrowLeft, 
  Eye, MessageCircle, Heart, Clock, AlertCircle, ChevronRight,
  Leaf, MapPin, Bell
} from 'lucide-react';
import http from '@/api/http';
import { useUserStore } from '@/store/useUserStore';
import useGeoStore from '@/store/useGeoStore';

interface DashboardAd {
  _id: string;
  title: string;
  price: number;
  unitType: string;
  photos: string[];
  displayStatus: string;
  statusLabel: string;
  statusColor: string;
  createdAt: string;
  metrics: {
    views: number;
    contactClicks: number;
    favorites: number;
  };
}

interface DemandItem {
  query: string;
  count: number;
  category: string | null;
  categoryName: string | null;
}

interface Notification {
  type: string;
  icon: string;
  title: string;
  message: string;
  adId?: string;
  priority: number;
}

interface SeasonStats {
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  totalAds: number;
  viewsTotal: number;
  contactClicksTotal: number;
  trend: {
    priceChangePercent: number;
    adsChangePercent: number;
  };
}

type TabType = 'products' | 'create' | 'stats' | 'demand';

const TABS: { key: TabType; label: string; icon: any; color: string }[] = [
  { key: 'products', label: 'Товары', icon: Package, color: '#10B981' },
  { key: 'create', label: 'Подача', icon: PlusCircle, color: '#F59E0B' },
  { key: 'stats', label: 'Статистика', icon: BarChart3, color: '#3B73FC' },
  { key: 'demand', label: 'Спрос', icon: TrendingUp, color: '#8B5CF6' },
];

const UNIT_LABELS: Record<string, string> = {
  kg: 'кг',
  g: 'г',
  piece: 'шт',
  liter: 'л',
  pack: 'уп',
  jar: 'банка',
  bunch: 'пучок',
  bag: 'мешок',
};

export default function FarmerCabinetPage() {
  const navigate = useNavigate();
  const user = useUserStore((state) => state.user);
  const coords = useGeoStore((state) => state.coords);
  const [activeTab, setActiveTab] = useState<TabType>('products');
  const [loading, setLoading] = useState(true);
  
  const [ads, setAds] = useState<DashboardAd[]>([]);
  const [statusCounts, setStatusCounts] = useState({ active: 0, expired: 0, archived: 0 });
  const [demandItems, setDemandItems] = useState<DemandItem[]>([]);
  const [demandSummary, setDemandSummary] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [seasonStats, setSeasonStats] = useState<SeasonStats | null>(null);

  useEffect(() => {
    if (user?.telegramId) {
      loadData();
    }
  }, [user, activeTab]);

  const loadData = async () => {
    if (!user?.telegramId) return;
    setLoading(true);

    try {
      if (activeTab === 'products') {
        const [adsRes, notifRes] = await Promise.all([
          http.get(`/api/farmer/dashboard-ads?sellerTelegramId=${user.telegramId}`),
          http.get(`/api/farmer/notifications?sellerTelegramId=${user.telegramId}`),
        ]);
        
        if (adsRes.data.success) {
          setAds(adsRes.data.data.ads);
          setStatusCounts(adsRes.data.data.statusCounts);
        }
        if (notifRes.data.success) {
          setNotifications(notifRes.data.data.notifications);
        }
      } else if (activeTab === 'stats') {
        const res = await http.get('/api/farmer/season-analytics?period=month');
        if (res.data.success) {
          setSeasonStats(res.data.data);
        }
      } else if (activeTab === 'demand' && coords?.lat && coords?.lng) {
        const res = await http.get(`/api/farmer/local-demand?lat=${coords.lat}&lng=${coords.lng}&radiusKm=10`);
        if (res.data.success) {
          setDemandItems(res.data.data.items);
          setDemandSummary(res.data.data.summary);
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderProductsTab = () => (
    <div style={{ padding: 16 }}>
      {notifications.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {notifications.slice(0, 2).map((notif, idx) => (
            <div
              key={idx}
              style={{
                background: '#FEF3C7',
                borderRadius: 12,
                padding: 12,
                marginBottom: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <Bell size={18} color="#F59E0B" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#92400E' }}>{notif.title}</div>
                <div style={{ fontSize: 12, color: '#B45309' }}>{notif.message}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto' }}>
        {[
          { label: 'Все', count: statusCounts.active + statusCounts.expired + statusCounts.archived, color: '#6B7280' },
          { label: 'Активные', count: statusCounts.active, color: '#10B981' },
          { label: 'Истекшие', count: statusCounts.expired, color: '#EF4444' },
        ].map((filter, idx) => (
          <div
            key={idx}
            style={{
              padding: '8px 14px',
              background: idx === 0 ? '#3B73FC' : '#F3F4F6',
              borderRadius: 20,
              color: idx === 0 ? '#fff' : '#374151',
              fontSize: 13,
              fontWeight: 500,
              whiteSpace: 'nowrap',
            }}
          >
            {filter.label} ({filter.count})
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{
            width: 32,
            height: 32,
            border: '3px solid #E5E7EB',
            borderTopColor: '#3B73FC',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto',
          }} />
        </div>
      ) : ads.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Leaf size={48} color="#9CA3AF" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 16, color: '#6B7280', marginBottom: 16 }}>
            У вас пока нет товаров
          </div>
          <button
            onClick={() => setActiveTab('create')}
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
              data-testid={`card-farmer-ad-${ad._id}`}
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
              <div style={{ flex: 1, minWidth: 0 }}>
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
                  {ad.price} BYN / {UNIT_LABELS[ad.unitType] || ad.unitType}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: ad.statusColor,
                    background: `${ad.statusColor}15`,
                    padding: '3px 8px',
                    borderRadius: 6,
                  }}>
                    {ad.statusLabel}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#6B7280' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Eye size={14} /> {ad.metrics.views}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <MessageCircle size={14} /> {ad.metrics.contactClicks}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Heart size={14} /> {ad.metrics.favorites}
                    </span>
                  </div>
                </div>
              </div>
              <ChevronRight size={20} color="#9CA3AF" style={{ alignSelf: 'center' }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderCreateTab = () => (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 16 }}>
        Быстрая подача
      </div>
      
      <div
        onClick={() => navigate('/farmer/bulk-upload')}
        style={{
          background: 'linear-gradient(135deg, #3B73FC 0%, #2563EB 100%)',
          borderRadius: 20,
          padding: 24,
          color: '#fff',
          marginBottom: 16,
          cursor: 'pointer',
        }}
        data-testid="button-bulk-upload"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <PlusCircle size={28} />
          <div style={{ fontSize: 18, fontWeight: 700 }}>Добавить несколько товаров</div>
        </div>
        <div style={{ fontSize: 14, opacity: 0.9 }}>
          Создайте до 10 объявлений за раз с автоопределением категории
        </div>
      </div>

      <div
        onClick={() => navigate('/ads/create')}
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          cursor: 'pointer',
        }}
        data-testid="button-single-create"
      >
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: '#F3F4F6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Package size={24} color="#6B7280" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>
            Одно объявление
          </div>
          <div style={{ fontSize: 13, color: '#6B7280' }}>
            С фото и подробным описанием
          </div>
        </div>
        <ChevronRight size={20} color="#9CA3AF" />
      </div>
    </div>
  );

  const renderStatsTab = () => (
    <div style={{ padding: 16 }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{
            width: 32,
            height: 32,
            border: '3px solid #E5E7EB',
            borderTopColor: '#3B73FC',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto',
          }} />
        </div>
      ) : seasonStats ? (
        <>
          <div style={{
            background: 'linear-gradient(135deg, #3B73FC 0%, #2563EB 100%)',
            borderRadius: 20,
            padding: 20,
            color: '#fff',
            marginBottom: 16,
          }}>
            <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 4 }}>Средняя цена на рынке</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>
              {seasonStats.averagePrice.toFixed(2)} BYN
            </div>
            {seasonStats.trend.priceChangePercent !== 0 && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 6, 
                marginTop: 8,
                fontSize: 14,
              }}>
                <TrendingUp size={16} />
                <span>
                  {seasonStats.trend.priceChangePercent > 0 ? '+' : ''}
                  {seasonStats.trend.priceChangePercent}% к прошлому месяцу
                </span>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div style={{
              background: '#fff',
              borderRadius: 16,
              padding: 16,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}>
              <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Мин. цена</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#10B981' }}>
                {seasonStats.minPrice.toFixed(2)} BYN
              </div>
            </div>
            <div style={{
              background: '#fff',
              borderRadius: 16,
              padding: 16,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}>
              <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Макс. цена</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#EF4444' }}>
                {seasonStats.maxPrice.toFixed(2)} BYN
              </div>
            </div>
          </div>

          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: 16,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 12 }}>
              Активность за месяц
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>
                  {seasonStats.totalAds}
                </div>
                <div style={{ fontSize: 11, color: '#6B7280' }}>Объявлений</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>
                  {seasonStats.viewsTotal}
                </div>
                <div style={{ fontSize: 11, color: '#6B7280' }}>Просмотров</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>
                  {seasonStats.contactClicksTotal}
                </div>
                <div style={{ fontSize: 11, color: '#6B7280' }}>Контактов</div>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/farmer/analytics')}
            style={{
              width: '100%',
              marginTop: 16,
              background: '#F3F4F6',
              border: 'none',
              borderRadius: 12,
              padding: '14px 20px',
              fontSize: 15,
              fontWeight: 600,
              color: '#374151',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
            data-testid="button-detailed-analytics"
          >
            <BarChart3 size={18} />
            Подробная аналитика
          </button>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <BarChart3 size={48} color="#9CA3AF" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 16, color: '#6B7280' }}>
            Нет данных для отображения
          </div>
        </div>
      )}
    </div>
  );

  const renderDemandTab = () => (
    <div style={{ padding: 16 }}>
      {!coords?.lat || !coords?.lng ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <MapPin size={48} color="#9CA3AF" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 16, color: '#6B7280', marginBottom: 16 }}>
            Включите геолокацию, чтобы видеть спрос рядом
          </div>
        </div>
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{
            width: 32,
            height: 32,
            border: '3px solid #E5E7EB',
            borderTopColor: '#3B73FC',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto',
          }} />
        </div>
      ) : (
        <>
          {demandSummary && (
            <div style={{
              background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
              borderRadius: 20,
              padding: 20,
              color: '#fff',
              marginBottom: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <TrendingUp size={20} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>Спрос рядом</span>
              </div>
              <div style={{ fontSize: 16 }}>{demandSummary}</div>
            </div>
          )}

          {demandItems.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {demandItems.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => navigate('/farmer/bulk-upload')}
                  style={{
                    background: '#fff',
                    borderRadius: 16,
                    padding: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    cursor: 'pointer',
                  }}
                  data-testid={`demand-item-${idx}`}
                >
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: '#EDE9FE',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                  }}>
                    🔍
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>
                      {item.query}
                    </div>
                    <div style={{ fontSize: 13, color: '#6B7280' }}>
                      Искали {item.count} раз{item.categoryName && ` • ${item.categoryName}`}
                    </div>
                  </div>
                  <button
                    style={{
                      background: '#3B73FC',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 10,
                      padding: '8px 14px',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Добавить
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <TrendingUp size={48} color="#9CA3AF" style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 16, color: '#6B7280' }}>
                Пока нет активных запросов рядом
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      <div style={{
        background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
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
              Фермерский кабинет
            </h1>
            <div style={{ fontSize: 14, opacity: 0.9 }}>
              Управляйте товарами и следите за спросом
            </div>
          </div>
          <Leaf size={28} />
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

      <div style={{ background: '#fff', minHeight: 'calc(100vh - 180px)' }}>
        {activeTab === 'products' && renderProductsTab()}
        {activeTab === 'create' && renderCreateTab()}
        {activeTab === 'stats' && renderStatsTab()}
        {activeTab === 'demand' && renderDemandTab()}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
