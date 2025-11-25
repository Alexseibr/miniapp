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

type StatusFilter = 'all' | 'active' | 'expired' | 'archived';

interface MyAnalytics {
  myAds: number;
  myViews: number;
  myClicks: number;
  avgPrice: number;
  marketAvgPrice: number;
  priceDiff: number;
}

interface QuickFormData {
  title: string;
  price: string;
  unitType: string;
}

export default function FarmerCabinetPage() {
  const navigate = useNavigate();
  const user = useUserStore((state) => state.user);
  const coords = useGeoStore((state) => state.coords);
  const requestLocation = useGeoStore((state) => state.requestLocation);
  const geoStatus = useGeoStore((state) => state.status);
  const [activeTab, setActiveTab] = useState<TabType>('products');
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  
  const [allAds, setAllAds] = useState<DashboardAd[]>([]);
  const [ads, setAds] = useState<DashboardAd[]>([]);
  const [statusCounts, setStatusCounts] = useState({ active: 0, expired: 0, archived: 0, scheduled: 0 });
  const [demandItems, setDemandItems] = useState<DemandItem[]>([]);
  const [demandSummary, setDemandSummary] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [seasonStats, setSeasonStats] = useState<SeasonStats | null>(null);
  const [myAnalytics, setMyAnalytics] = useState<MyAnalytics | null>(null);
  
  const [quickForm, setQuickForm] = useState<QuickFormData>({ title: '', price: '', unitType: 'kg' });
  const [quickSubmitting, setQuickSubmitting] = useState(false);

  useEffect(() => {
    if (user?.telegramId) {
      loadData();
    }
  }, [user, activeTab, coords?.lat]);

  useEffect(() => {
    if (statusFilter === 'all') {
      setAds(allAds);
    } else {
      setAds(allAds.filter(ad => ad.displayStatus === statusFilter));
    }
  }, [statusFilter, allAds]);

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
          setAllAds(adsRes.data.data.ads);
          setAds(adsRes.data.data.ads);
          setStatusCounts(adsRes.data.data.statusCounts);
        }
        if (notifRes.data.success) {
          setNotifications(notifRes.data.data.notifications);
        }
      } else if (activeTab === 'stats') {
        const [seasonRes, myRes] = await Promise.all([
          http.get('/api/farmer/season-analytics?period=month'),
          http.get(`/api/farmer/my-analytics?sellerTelegramId=${user.telegramId}&period=month`),
        ]);
        if (seasonRes.data.success) {
          setSeasonStats(seasonRes.data.data);
        }
        if (myRes.data.success) {
          const data = myRes.data.data;
          setMyAnalytics({
            myAds: data.totalAds || 0,
            myViews: data.totalViews || 0,
            myClicks: data.totalClicks || 0,
            avgPrice: data.avgPrice || 0,
            marketAvgPrice: data.marketAvgPrice || 0,
            priceDiff: data.priceDiffPercent || 0,
          });
        }
      } else if (activeTab === 'demand') {
        if (coords?.lat && coords?.lng) {
          const res = await http.get(`/api/farmer/local-demand?lat=${coords.lat}&lng=${coords.lng}&radiusKm=10`);
          if (res.data.success) {
            setDemandItems(res.data.data.items);
            setDemandSummary(res.data.data.summary);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSubmit = async () => {
    if (!quickForm.title.trim() || !quickForm.price || !user?.telegramId) return;
    
    setQuickSubmitting(true);
    try {
      const res = await http.post('/api/farmer/quick-post', {
        title: quickForm.title.trim(),
        price: parseFloat(quickForm.price),
        unitType: quickForm.unitType,
        sellerTelegramId: user.telegramId,
        lat: coords?.lat,
        lng: coords?.lng,
      });
      
      if (res.data.success) {
        setQuickForm({ title: '', price: '', unitType: 'kg' });
        setActiveTab('products');
        loadData();
      }
    } catch (error) {
      console.error('Quick post failed:', error);
    } finally {
      setQuickSubmitting(false);
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
          { key: 'all' as StatusFilter, label: 'Все', count: statusCounts.active + statusCounts.expired + statusCounts.archived },
          { key: 'active' as StatusFilter, label: 'Активные', count: statusCounts.active },
          { key: 'expired' as StatusFilter, label: 'Истекшие', count: statusCounts.expired },
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
      
      <div style={{
        background: '#fff',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, color: '#6B7280', marginBottom: 6 }}>
            Название товара
          </label>
          <input
            type="text"
            value={quickForm.title}
            onChange={(e) => setQuickForm(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Например: Картофель молодой"
            style={{
              width: '100%',
              padding: '14px 16px',
              borderRadius: 12,
              border: '1.5px solid #E5E7EB',
              fontSize: 16,
              outline: 'none',
            }}
            data-testid="input-quick-title"
          />
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: '#6B7280', marginBottom: 6 }}>
              Цена (BYN)
            </label>
            <input
              type="number"
              value={quickForm.price}
              onChange={(e) => setQuickForm(prev => ({ ...prev, price: e.target.value }))}
              placeholder="0.00"
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: 12,
                border: '1.5px solid #E5E7EB',
                fontSize: 16,
                outline: 'none',
              }}
              data-testid="input-quick-price"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: '#6B7280', marginBottom: 6 }}>
              Единица
            </label>
            <select
              value={quickForm.unitType}
              onChange={(e) => setQuickForm(prev => ({ ...prev, unitType: e.target.value }))}
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: 12,
                border: '1.5px solid #E5E7EB',
                fontSize: 16,
                background: '#fff',
                outline: 'none',
              }}
              data-testid="select-quick-unit"
            >
              {Object.entries(UNIT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
        
        <button
          onClick={handleQuickSubmit}
          disabled={quickSubmitting || !quickForm.title.trim() || !quickForm.price}
          style={{
            width: '100%',
            padding: '16px',
            background: quickForm.title.trim() && quickForm.price ? '#3B73FC' : '#E5E7EB',
            color: quickForm.title.trim() && quickForm.price ? '#fff' : '#9CA3AF',
            border: 'none',
            borderRadius: 14,
            fontSize: 16,
            fontWeight: 600,
            cursor: quickForm.title.trim() && quickForm.price ? 'pointer' : 'default',
          }}
          data-testid="button-quick-submit"
        >
          {quickSubmitting ? 'Публикация...' : 'Опубликовать'}
        </button>
      </div>
      
      <div
        onClick={() => navigate('/farmer/bulk-upload')}
        style={{
          background: 'linear-gradient(135deg, #3B73FC 0%, #2563EB 100%)',
          borderRadius: 20,
          padding: 20,
          color: '#fff',
          marginBottom: 12,
          cursor: 'pointer',
        }}
        data-testid="button-bulk-upload"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <PlusCircle size={24} />
          <div style={{ fontSize: 16, fontWeight: 700 }}>Добавить несколько товаров</div>
        </div>
        <div style={{ fontSize: 13, opacity: 0.9 }}>
          До 10 объявлений за раз с автоопределением категории
        </div>
      </div>

      <div
        onClick={() => navigate('/ads/create')}
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          cursor: 'pointer',
        }}
        data-testid="button-single-create"
      >
        <div style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: '#F3F4F6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Package size={22} color="#6B7280" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>
            Одно объявление с фото
          </div>
          <div style={{ fontSize: 12, color: '#6B7280' }}>
            С подробным описанием
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
      ) : (seasonStats || myAnalytics) ? (
        <>
          {myAnalytics && (
            <div style={{
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              borderRadius: 20,
              padding: 20,
              color: '#fff',
              marginBottom: 16,
            }}>
              <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>Ваша статистика за месяц</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 700 }}>{myAnalytics.myAds}</div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>Товаров</div>
                </div>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 700 }}>{myAnalytics.myViews}</div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>Просмотров</div>
                </div>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 700 }}>{myAnalytics.myClicks}</div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>Контактов</div>
                </div>
              </div>
            </div>
          )}

          {seasonStats && (
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
                  Рынок за месяц
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
            </>
          )}

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
          <button
            onClick={requestLocation}
            disabled={geoStatus === 'loading'}
            style={{
              background: '#3B73FC',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              padding: '14px 28px',
              fontSize: 15,
              fontWeight: 600,
              cursor: geoStatus === 'loading' ? 'default' : 'pointer',
              opacity: geoStatus === 'loading' ? 0.7 : 1,
            }}
            data-testid="button-request-location"
          >
            {geoStatus === 'loading' ? 'Определение...' : 'Включить геолокацию'}
          </button>
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
