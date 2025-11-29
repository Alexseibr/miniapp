import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, PlusCircle, BarChart3, TrendingUp, ArrowLeft, 
  Eye, MessageCircle, Heart, Clock, AlertCircle, ChevronRight,
  Leaf, MapPin, Bell, Crown, Calendar, Star, Zap, Check, Gift,
  Store, Camera, Palette, Tractor, ClipboardList, Truck, Navigation, Phone
} from 'lucide-react';
import http from '@/api/http';
import { fetchShopOrders, fetchDeliveryRoutePlan } from '@/api/orders';
import { useUserStore } from '@/store/useUserStore';
import useGeoStore from '@/store/useGeoStore';
import { usePlatform } from '@/platform/PlatformProvider';
import ScreenLayout from '@/components/layout/ScreenLayout';
import ProTrendsWidget from '@/components/ProTrendsWidget';

type ShopRole = 'SHOP' | 'FARMER' | 'BLOGGER' | 'ARTISAN';

interface SellerProfile {
  _id: string;
  name: string;
  slug?: string;
  avatar?: string;
  isFarmer?: boolean;
  shopRole?: ShopRole;
}

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

interface FarmerSubscription {
  tier: 'FREE' | 'PRO' | 'MAX';
  maxAdsPerDay: number;
  usedToday: number;
  featuresEnabled: string[];
  expiresAt: string | null;
  isPremiumActive: boolean;
}

interface SeasonEvent {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  description: string;
  color: string;
  bannerGradient: string;
  isActive: boolean;
  status: 'active' | 'upcoming' | 'ended';
  daysUntilStart: number | null;
  daysRemaining: number | null;
}

interface TierInfo {
  name: string;
  price: number | string;
  color: string;
  gradient: string;
  icon: any;
  features: string[];
  maxAds: string;
  analytics: boolean;
  premiumCards: boolean;
  priority: boolean;
}

interface RoleConfig {
  title: string;
  subtitle: string;
  icon: any;
  gradient: string;
  iconBgColor: string;
}

interface ShopOrder {
  _id: string;
  adId: string;
  ad?: {
    title: string;
    price: number;
    photos: string[];
  };
  buyerId?: string;
  buyerTelegramId?: number;
  buyerName?: string;
  buyerUsername?: string;
  buyerPhone?: string;
  buyer?: {
    username: string;
    firstName: string;
    phone?: string;
  };
  items?: {
    adId: string;
    title: string;
    quantity: number;
    price: number;
  }[];
  quantity?: number;
  totalPrice: number;
  deliveryRequired: boolean;
  deliveryAddress?: string;
  deliveryLocation?: { lat: number; lng: number };
  status: 'new' | 'confirmed' | 'delivering' | 'completed' | 'cancelled';
  createdAt?: string;
  distanceKmFromPrev?: number;
}

interface RoutePlanResult {
  totalDistance: number;
  estimatedTime: number;
  route: Array<{
    order: ShopOrder;
    distance: number;
    estimatedArrival: number;
    sequence: number;
  }>;
}

type TabType = 'products' | 'create' | 'stats' | 'demand' | 'subscription' | 'fairs' | 'orders';

interface TabConfig {
  key: TabType;
  label: string;
  icon: any;
  color: string;
}

const ALL_TABS: TabConfig[] = [
  { key: 'products', label: 'Товары', icon: Package, color: '#10B981' },
  { key: 'orders', label: 'Заказы', icon: ClipboardList, color: '#F97316' },
  { key: 'create', label: 'Подача', icon: PlusCircle, color: '#F59E0B' },
  { key: 'stats', label: 'Статистика', icon: BarChart3, color: '#3B73FC' },
  { key: 'demand', label: 'Спрос', icon: TrendingUp, color: '#8B5CF6' },
  { key: 'subscription', label: 'PRO', icon: Crown, color: '#F59E0B' },
  { key: 'fairs', label: 'Ярмарки', icon: Calendar, color: '#EC4899' },
];

const ROLE_TABS: Record<ShopRole, TabType[]> = {
  FARMER: ['products', 'orders', 'create', 'stats', 'demand', 'subscription', 'fairs'],
  SHOP: ['products', 'orders', 'create', 'stats', 'demand', 'subscription', 'fairs'],
  BLOGGER: ['products', 'orders', 'create', 'stats', 'demand', 'subscription', 'fairs'],
  ARTISAN: ['products', 'orders', 'create', 'stats', 'demand', 'subscription', 'fairs'],
};

const ROLE_BADGES: Record<ShopRole, { label: string; emoji: string; color: string; bgColor: string }> = {
  FARMER: { label: 'Фермер', emoji: '🌾', color: '#047857', bgColor: '#D1FAE5' },
  SHOP: { label: 'Магазин', emoji: '🏪', color: '#1D4ED8', bgColor: '#DBEAFE' },
  BLOGGER: { label: 'Блогер', emoji: '📸', color: '#BE185D', bgColor: '#FCE7F3' },
  ARTISAN: { label: 'Ремесленник', emoji: '🎨', color: '#6D28D9', bgColor: '#EDE9FE' },
};

const ROLE_CONFIGS: Record<ShopRole, RoleConfig> = {
  FARMER: {
    title: 'Кабинет продавца',
    subtitle: 'Товары, аналитика, спрос и ярмарки',
    icon: Tractor,
    gradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    iconBgColor: '#059669',
  },
  SHOP: {
    title: 'Кабинет продавца',
    subtitle: 'Товары, аналитика, спрос и ярмарки',
    icon: Store,
    gradient: 'linear-gradient(135deg, #3B73FC 0%, #2563EB 100%)',
    iconBgColor: '#3B73FC',
  },
  BLOGGER: {
    title: 'Кабинет продавца',
    subtitle: 'Товары, аналитика, спрос и ярмарки',
    icon: Camera,
    gradient: 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)',
    iconBgColor: '#EC4899',
  },
  ARTISAN: {
    title: 'Кабинет продавца',
    subtitle: 'Товары, аналитика, спрос и ярмарки',
    icon: Palette,
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
    iconBgColor: '#8B5CF6',
  },
};

const SUBSCRIPTION_TIERS: Record<string, TierInfo> = {
  FREE: {
    name: 'Бесплатный',
    price: 'Бесплатно',
    color: '#6B7280',
    gradient: 'linear-gradient(135deg, #9CA3AF 0%, #6B7280 100%)',
    icon: Leaf,
    features: ['До 3 объявлений в день', 'Базовая видимость'],
    maxAds: '3',
    analytics: false,
    premiumCards: false,
    priority: false,
  },
  PRO: {
    name: 'PRO',
    price: 9.90,
    color: '#F59E0B',
    gradient: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)',
    icon: Star,
    features: ['До 15 объявлений в день', 'Расширенная аналитика', 'Приоритет в выдаче'],
    maxAds: '15',
    analytics: true,
    premiumCards: false,
    priority: true,
  },
  MAX: {
    name: 'MAX',
    price: 24.90,
    color: '#8B5CF6',
    gradient: 'linear-gradient(135deg, #A78BFA 0%, #8B5CF6 100%)',
    icon: Zap,
    features: ['Безлимитные объявления', 'Полная аналитика', 'Премиум-карточки', 'Максимальный приоритет', 'Персональная поддержка'],
    maxAds: 'Безлимит',
    analytics: true,
    premiumCards: true,
    priority: true,
  },
};

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

export default function ShopCabinetPage() {
  const navigate = useNavigate();
  const user = useUserStore((state) => state.user);
  const coords = useGeoStore((state) => state.coords);
  const requestLocation = useGeoStore((state) => state.requestLocation);
  const geoStatus = useGeoStore((state) => state.status);
  const { getAuthToken } = usePlatform();
  
  const [shopRole, setShopRole] = useState<ShopRole>('SHOP');
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  
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
  
  const [subscription, setSubscription] = useState<FarmerSubscription | null>(null);
  const [seasonEvents, setSeasonEvents] = useState<{ active: SeasonEvent[]; upcoming: SeasonEvent[] }>({ active: [], upcoming: [] });
  const [upgrading, setUpgrading] = useState(false);
  
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [routePlan, setRoutePlan] = useState<RoutePlanResult | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | 'new' | 'confirmed' | 'delivering'>('all');

  useEffect(() => {
    loadSellerProfile();
  }, [user]);

  useEffect(() => {
    if (user?.telegramId && !profileLoading) {
      loadData();
    }
  }, [user, activeTab, coords?.lat, profileLoading]);

  useEffect(() => {
    if (statusFilter === 'all') {
      setAds(allAds);
    } else {
      setAds(allAds.filter(ad => ad.displayStatus === statusFilter));
    }
  }, [statusFilter, allAds]);

  const loadSellerProfile = async () => {
    if (!user) {
      setProfileLoading(false);
      return;
    }

    try {
      const token = await getAuthToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await http.get('/api/seller-profile/my', { headers });
      
      if (res.data?.profile) {
        const profile = res.data.profile;
        setSellerProfile(profile);
        
        if (profile.shopRole) {
          setShopRole(profile.shopRole as ShopRole);
        } else if (profile.isFarmer) {
          setShopRole('FARMER');
        } else {
          setShopRole('SHOP');
        }
      }
    } catch (error) {
      console.error('Failed to load seller profile:', error);
      setShopRole('SHOP');
    } finally {
      setProfileLoading(false);
    }
  };

  const getRoleTabs = (): TabConfig[] => {
    const allowedTabs = ROLE_TABS[shopRole];
    return ALL_TABS.filter(tab => allowedTabs.includes(tab.key));
  };

  const getRoleConfig = (): RoleConfig => {
    return ROLE_CONFIGS[shopRole];
  };

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
      } else if (activeTab === 'subscription') {
        try {
          const res = await http.get(`/api/farmer/subscriptions?telegramId=${user.telegramId}`);
          if (res.data.success) {
            setSubscription(res.data.data);
          }
        } catch (err) {
          setSubscription({
            tier: 'FREE',
            maxAdsPerDay: 3,
            usedToday: 0,
            featuresEnabled: ['basic_listing'],
            expiresAt: null,
            isPremiumActive: false,
          });
        }
      } else if (activeTab === 'fairs') {
        const res = await http.get('/api/farmer/season-events');
        if (res.data.success) {
          setSeasonEvents({
            active: res.data.data.active || [],
            upcoming: res.data.data.upcoming || [],
          });
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

  const handleUpgrade = async (tier: 'PRO' | 'MAX') => {
    if (!user?.telegramId) return;
    
    setUpgrading(true);
    try {
      const res = await http.post('/api/farmer/subscriptions/upgrade', {
        telegramId: user.telegramId,
        tier,
      });
      
      if (res.data.success) {
        setSubscription(res.data.data);
      }
    } catch (error) {
      console.error('Upgrade failed:', error);
    } finally {
      setUpgrading(false);
    }
  };

  const loadOrders = async () => {
    if (!user?.telegramId) return;
    setOrdersLoading(true);
    setOrdersError(null);
    try {
      const data = await fetchShopOrders('today', user.telegramId);
      setOrders((data.items || []).map(order => ({
        ...order,
        status: (order.status?.toLowerCase() || 'new') as ShopOrder['status'],
      })));
    } catch (error: any) {
      console.error('Failed to load orders:', error);
      const errorMessage = error?.response?.data?.message || 'Не удалось загрузить заказы';
      setOrdersError(errorMessage);
    } finally {
      setOrdersLoading(false);
    }
  };

  const loadRoutePlan = async () => {
    if (!user?.telegramId) return;
    setRouteLoading(true);
    try {
      const data = await fetchDeliveryRoutePlan('today', user.telegramId);
      if (data.items && data.items.length > 0) {
        let totalDist = 0;
        const route = data.items.map((order, idx) => {
          totalDist += order.distanceKmFromPrev || 0;
          return {
            order: {
              ...order,
              status: (order.status?.toLowerCase() || 'new') as ShopOrder['status'],
            },
            distance: order.distanceKmFromPrev || 0,
            estimatedArrival: (idx + 1) * 10,
            sequence: idx + 1,
          };
        });
        setRoutePlan({
          totalDistance: totalDist,
          estimatedTime: route.length * 10,
          route,
        });
      }
    } catch (error) {
      console.error('Failed to load route plan:', error);
    } finally {
      setRouteLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'orders') {
      loadOrders();
    }
  }, [activeTab]);

  const filteredOrders = orders.filter(order => {
    if (orderStatusFilter === 'all') return true;
    return order.status === orderStatusFilter;
  });

  const newOrdersCount = orders.filter(o => o.status === 'new').length;
  const deliveryOrdersCount = orders.filter(o => o.deliveryRequired && ['new', 'confirmed'].includes(o.status)).length;

  const getOrderStatusLabel = (status: string) => {
    switch (status) {
      case 'new': return { label: 'Новый', color: '#3B73FC', bg: '#DBEAFE' };
      case 'confirmed': return { label: 'Подтвержден', color: '#F59E0B', bg: '#FEF3C7' };
      case 'delivering': return { label: 'Доставляется', color: '#8B5CF6', bg: '#EDE9FE' };
      case 'completed': return { label: 'Завершен', color: '#10B981', bg: '#D1FAE5' };
      case 'cancelled': return { label: 'Отменен', color: '#EF4444', bg: '#FEE2E2' };
      default: return { label: status, color: '#6B7280', bg: '#F3F4F6' };
    }
  };

  const formatOrderDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
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
              data-testid={`card-shop-ad-${ad._id}`}
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
                  {ad.price} руб. / {UNIT_LABELS[ad.unitType] || ad.unitType}
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

  const renderOrdersTab = () => (
    <div style={{ padding: 16 }}>
      {/* Orders summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 12,
        marginBottom: 20,
      }}>
        <div style={{
          background: '#DBEAFE',
          borderRadius: 16,
          padding: 16,
          textAlign: 'center',
        }}>
          <ClipboardList size={24} color="#3B73FC" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 24, fontWeight: 700, color: '#1E40AF' }}>{newOrdersCount}</div>
          <div style={{ fontSize: 13, color: '#3B82F6' }}>Новых заказов</div>
        </div>
        <div style={{
          background: '#EDE9FE',
          borderRadius: 16,
          padding: 16,
          textAlign: 'center',
        }}>
          <Truck size={24} color="#8B5CF6" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 24, fontWeight: 700, color: '#5B21B6' }}>{deliveryOrdersCount}</div>
          <div style={{ fontSize: 13, color: '#7C3AED' }}>С доставкой</div>
        </div>
      </div>

      {/* Route planning button */}
      {deliveryOrdersCount > 0 && (
        <button
          onClick={loadRoutePlan}
          disabled={routeLoading || !coords}
          style={{
            width: '100%',
            padding: 16,
            background: routeLoading ? '#9CA3AF' : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: 14,
            fontSize: 15,
            fontWeight: 600,
            cursor: routeLoading || !coords ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            marginBottom: 16,
          }}
          data-testid="button-plan-route"
        >
          <Navigation size={20} />
          {routeLoading ? 'Планируем маршрут...' : 'Спланировать маршрут доставки'}
        </button>
      )}

      {/* Route plan result */}
      {routePlan && routePlan.route.length > 0 && (
        <div style={{
          background: '#fff',
          borderRadius: 16,
          padding: 16,
          marginBottom: 20,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: '#D1FAE5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Navigation size={20} color="#10B981" />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>Оптимальный маршрут</div>
              <div style={{ fontSize: 13, color: '#6B7280' }}>
                {routePlan.totalDistance.toFixed(1)} км ~ {Math.round(routePlan.estimatedTime)} мин
              </div>
            </div>
          </div>
          
          <div style={{ borderLeft: '2px dashed #10B981', marginLeft: 19, paddingLeft: 20 }}>
            {routePlan.route.map((stop, idx) => (
              <div
                key={stop.order._id}
                style={{
                  position: 'relative',
                  paddingBottom: idx < routePlan.route.length - 1 ? 16 : 0,
                }}
              >
                <div style={{
                  position: 'absolute',
                  left: -27,
                  top: 0,
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: '#10B981',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {stop.sequence}
                </div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>
                  {stop.order.ad?.title || 'Заказ'}
                </div>
                <div style={{ fontSize: 12, color: '#6B7280' }}>
                  {stop.order.deliveryAddress}
                </div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                  +{stop.distance.toFixed(1)} км
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto' }}>
        {[
          { key: 'all' as const, label: 'Все', count: orders.length },
          { key: 'new' as const, label: 'Новые', count: newOrdersCount },
          { key: 'confirmed' as const, label: 'В работе', count: orders.filter(o => o.status === 'confirmed').length },
          { key: 'delivering' as const, label: 'Доставка', count: orders.filter(o => o.status === 'delivering').length },
        ].map((filter) => (
          <button
            key={filter.key}
            onClick={() => setOrderStatusFilter(filter.key)}
            style={{
              padding: '8px 14px',
              background: orderStatusFilter === filter.key ? '#F97316' : '#F3F4F6',
              borderRadius: 20,
              color: orderStatusFilter === filter.key ? '#fff' : '#374151',
              fontSize: 13,
              fontWeight: 500,
              whiteSpace: 'nowrap',
              border: 'none',
              cursor: 'pointer',
            }}
            data-testid={`filter-orders-${filter.key}`}
          >
            {filter.label} ({filter.count})
          </button>
        ))}
      </div>

      {/* Orders list */}
      {ordersLoading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{
            width: 32,
            height: 32,
            border: '3px solid #E5E7EB',
            borderTopColor: '#F97316',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto',
          }} />
        </div>
      ) : ordersError ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <AlertCircle size={48} color="#EF4444" style={{ marginBottom: 12 }} />
          <p style={{ color: '#EF4444', fontSize: 15, marginBottom: 16 }}>{ordersError}</p>
          <button
            onClick={loadOrders}
            style={{
              padding: '10px 20px',
              background: '#F97316',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
            data-testid="button-retry-orders"
          >
            Попробовать снова
          </button>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <ClipboardList size={48} color="#9CA3AF" style={{ marginBottom: 12 }} />
          <p style={{ color: '#6B7280', fontSize: 15 }}>Нет заказов</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredOrders.map((order) => {
            const statusInfo = getOrderStatusLabel(order.status);
            const orderTitle = order.items?.[0]?.title || order.ad?.title || 'Заказ';
            const orderQuantity = order.items?.[0]?.quantity || order.quantity || 1;
            const orderItemPrice = order.items?.[0]?.price || order.ad?.price || 0;
            const buyerPhone = order.buyerPhone || order.buyer?.phone;
            const buyerName = order.buyerName || order.buyer?.firstName || order.buyerUsername || 'Покупатель';
            
            return (
              <div
                key={order._id}
                style={{
                  background: '#fff',
                  borderRadius: 16,
                  padding: 16,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}
                data-testid={`order-card-${order._id}`}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 4 }}>
                      {orderTitle}
                    </div>
                    <div style={{ fontSize: 13, color: '#6B7280' }}>
                      {orderQuantity} x {orderItemPrice.toLocaleString('ru-RU')} = {order.totalPrice.toLocaleString('ru-RU')} руб.
                    </div>
                    <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
                      {buyerName}
                    </div>
                  </div>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: 20,
                    background: statusInfo.bg,
                    color: statusInfo.color,
                    fontSize: 12,
                    fontWeight: 500,
                  }}>
                    {statusInfo.label}
                  </span>
                </div>
                
                {order.createdAt && (
                  <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 8 }}>
                    <Clock size={14} style={{ display: 'inline', marginRight: 4 }} />
                    {formatOrderDate(order.createdAt)}
                  </div>
                )}
                
                {order.deliveryRequired && order.deliveryAddress && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    padding: 12,
                    background: '#F9FAFB',
                    borderRadius: 10,
                    marginBottom: 12,
                  }}>
                    <Truck size={16} color="#8B5CF6" style={{ marginTop: 2 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: '#8B5CF6', fontWeight: 500, marginBottom: 2 }}>Доставка</div>
                      <div style={{ fontSize: 13, color: '#374151' }}>{order.deliveryAddress}</div>
                    </div>
                  </div>
                )}
                
                <div style={{ display: 'flex', gap: 8 }}>
                  {buyerPhone && (
                    <button
                      onClick={() => {
                        window.location.href = `tel:${buyerPhone}`;
                      }}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        background: '#3B73FC',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 10,
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                      data-testid={`button-contact-buyer-${order._id}`}
                    >
                      <Phone size={16} />
                      Связаться
                    </button>
                  )}
                  {order.status === 'new' && (
                    <button
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        background: '#10B981',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 10,
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                      data-testid={`button-confirm-order-${order._id}`}
                    >
                      <Check size={16} />
                      Подтвердить
                    </button>
                  )}
                </div>
              </div>
            );
          })}
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
              Цена (руб.)
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
              background: getRoleConfig().gradient,
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
                  {seasonStats.averagePrice.toFixed(2)} руб.
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
                    {seasonStats.minPrice.toFixed(2)} руб.
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
                    {seasonStats.maxPrice.toFixed(2)} руб.
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
                    <TrendingUp size={24} color="#8B5CF6" />
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

  const renderSubscriptionTab = () => {
    const currentTier = subscription?.tier || 'FREE';
    const tierInfo = SUBSCRIPTION_TIERS[currentTier];

    return (
      <div style={{ padding: 16 }}>
        <div style={{
          background: tierInfo.gradient,
          borderRadius: 20,
          padding: 20,
          color: '#fff',
          marginBottom: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <tierInfo.icon size={24} />
            <div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>
                {tierInfo.name}
              </div>
              <div style={{ fontSize: 13, opacity: 0.9 }}>
                Ваш текущий план
              </div>
            </div>
          </div>
          
          <div style={{ 
            background: 'rgba(255,255,255,0.2)', 
            borderRadius: 12, 
            padding: 12,
            marginTop: 12,
          }}>
            <div style={{ fontSize: 13, marginBottom: 4 }}>
              Использовано сегодня
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {subscription?.usedToday || 0} / {tierInfo.maxAds}
            </div>
            <div style={{
              height: 6,
              background: 'rgba(255,255,255,0.3)',
              borderRadius: 3,
              marginTop: 8,
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min(((subscription?.usedToday || 0) / (subscription?.maxAdsPerDay || 3)) * 100, 100)}%`,
                background: '#fff',
                borderRadius: 3,
              }} />
            </div>
          </div>
        </div>

        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: '#111827' }}>
          Доступные планы
        </div>

        {(['FREE', 'PRO', 'MAX'] as const).map((tier) => {
          const info = SUBSCRIPTION_TIERS[tier];
          const isCurrentTier = tier === currentTier;
          const canUpgrade = tier !== 'FREE' && !isCurrentTier;

          return (
            <div
              key={tier}
              style={{
                background: isCurrentTier ? `${info.color}15` : '#fff',
                border: `2px solid ${isCurrentTier ? info.color : '#E5E7EB'}`,
                borderRadius: 16,
                padding: 16,
                marginBottom: 12,
              }}
              data-testid={`tier-card-${tier}`}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: info.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <info.icon size={20} color="#fff" />
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{info.name}</div>
                    <div style={{ fontSize: 14, color: info.color, fontWeight: 600 }}>
                      {typeof info.price === 'number' ? `${info.price} руб./мес` : info.price}
                    </div>
                  </div>
                </div>
                {isCurrentTier && (
                  <div style={{
                    background: info.color,
                    color: '#fff',
                    padding: '4px 10px',
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 600,
                  }}>
                    Текущий
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                {info.features.map((feature, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#374151' }}>
                    <Check size={14} color={info.color} />
                    {feature}
                  </div>
                ))}
              </div>

              {canUpgrade && (
                <button
                  onClick={() => handleUpgrade(tier)}
                  disabled={upgrading}
                  style={{
                    width: '100%',
                    background: info.gradient,
                    color: '#fff',
                    border: 'none',
                    borderRadius: 12,
                    padding: '12px',
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: 'pointer',
                    opacity: upgrading ? 0.7 : 1,
                  }}
                  data-testid={`upgrade-${tier}`}
                >
                  {upgrading ? 'Обработка...' : `Перейти на ${info.name}`}
                </button>
              )}
            </div>
          );
        })}

        <div style={{
          background: '#F0FDF4',
          borderRadius: 12,
          padding: 14,
          marginTop: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#15803D', fontSize: 13 }}>
            <Gift size={16} />
            <span style={{ fontWeight: 500 }}>Пробный период PRO - 7 дней бесплатно!</span>
          </div>
        </div>

        {(currentTier === 'PRO' || currentTier === 'MAX') && (
          <button
            data-testid="button-open-pro-analytics"
            onClick={() => navigate('/store-cabinet/pro-analytics')}
            style={{
              width: '100%',
              background: tierInfo.gradient,
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              padding: '14px 20px',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              marginTop: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <BarChart3 size={18} />
            Открыть PRO-аналитику
            <ChevronRight size={18} />
          </button>
        )}

        <ProTrendsWidget
          lat={coords?.lat}
          lng={coords?.lng}
          radiusKm={20}
          isPro={currentTier === 'PRO' || currentTier === 'MAX'}
          sellerType={shopRole}
          onAddProduct={(categorySlug) => navigate(`/create?category=${categorySlug}`)}
        />
      </div>
    );
  };

  const renderFairsTab = () => (
    <div style={{ padding: 16 }}>
      {seasonEvents.active.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 12 }}>
            Активные ярмарки
          </div>
          {seasonEvents.active.map((event) => (
            <div
              key={event.id}
              style={{
                background: event.bannerGradient,
                borderRadius: 20,
                padding: 20,
                color: '#fff',
                marginBottom: 12,
              }}
              data-testid={`fair-active-${event.id}`}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div style={{ fontSize: 32 }}>{event.emoji}</div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{event.name}</div>
                  <div style={{ fontSize: 14, opacity: 0.9 }}>{event.description}</div>
                </div>
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.2)',
                borderRadius: 12,
                padding: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontSize: 12, opacity: 0.9 }}>Осталось дней</div>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{event.daysRemaining}</div>
                </div>
                <button
                  onClick={() => navigate('/farmer/bulk-upload')}
                  style={{
                    background: '#fff',
                    color: event.color,
                    border: 'none',
                    borderRadius: 12,
                    padding: '10px 20px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Участвовать
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 12 }}>
          Предстоящие ярмарки
        </div>
        {seasonEvents.upcoming.length > 0 ? (
          seasonEvents.upcoming.map((event) => (
            <div
              key={event.id}
              style={{
                background: '#fff',
                border: `2px solid ${event.color}30`,
                borderRadius: 16,
                padding: 16,
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}
              data-testid={`fair-upcoming-${event.id}`}
            >
              <div style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: `${event.color}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
              }}>
                {event.emoji}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>{event.name}</div>
                <div style={{ fontSize: 13, color: '#6B7280' }}>{event.description}</div>
              </div>
              <div style={{
                background: '#F3F4F6',
                borderRadius: 10,
                padding: '6px 10px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 11, color: '#6B7280' }}>Через</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: event.color }}>{event.daysUntilStart}</div>
                <div style={{ fontSize: 10, color: '#9CA3AF' }}>дней</div>
              </div>
            </div>
          ))
        ) : (
          <div style={{
            textAlign: 'center',
            padding: 30,
            color: '#6B7280',
          }}>
            <Calendar size={40} style={{ marginBottom: 8, opacity: 0.5 }} />
            <div>Пока нет предстоящих ярмарок</div>
          </div>
        )}
      </div>

      <div style={{
        background: 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)',
        borderRadius: 16,
        padding: 16,
        color: '#fff',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Star size={18} />
          <span style={{ fontSize: 14, fontWeight: 600 }}>PRO преимущество</span>
        </div>
        <div style={{ fontSize: 13, opacity: 0.9 }}>
          Участники PRO и MAX получают приоритетное размещение на ярмарках и специальные бейджи
        </div>
      </div>
    </div>
  );

  if (profileLoading) {
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

  const roleConfig = getRoleConfig();
  const roleTabs = getRoleTabs();
  const RoleIcon = roleConfig.icon;
  const roleBadge = ROLE_BADGES[shopRole];

  const headerContent = (
    <div style={{ background: '#F8FAFC' }}>
      <div style={{
        background: roleConfig.gradient,
        padding: '16px 20px 24px',
        color: '#fff',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/profile')}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
                {roleConfig.title}
              </h1>
            </div>
            <div style={{ fontSize: 14, opacity: 0.9 }}>
              {roleConfig.subtitle}
            </div>
          </div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
          }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <RoleIcon size={24} />
            </div>
            <div style={{
              background: roleBadge.bgColor,
              color: roleBadge.color,
              padding: '3px 8px',
              borderRadius: 8,
              fontSize: 10,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              whiteSpace: 'nowrap',
            }} data-testid="role-badge">
              <span>{roleBadge.emoji}</span>
              <span>{roleBadge.label}</span>
            </div>
          </div>
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
        {roleTabs.map((tab) => (
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
    </div>
  );

  return (
    <ScreenLayout 
      header={headerContent}
      showBottomNav={false}
      noPadding
    >
      <div style={{ background: '#fff', minHeight: '100%' }}>
        {activeTab === 'products' && renderProductsTab()}
        {activeTab === 'orders' && renderOrdersTab()}
        {activeTab === 'create' && renderCreateTab()}
        {activeTab === 'stats' && renderStatsTab()}
        {activeTab === 'demand' && renderDemandTab()}
        {activeTab === 'subscription' && renderSubscriptionTab()}
        {activeTab === 'fairs' && renderFairsTab()}
      </div>
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </ScreenLayout>
  );
}
