import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, TrendingDown, Eye, MessageCircle, BarChart3, Calendar } from 'lucide-react';
import http from '@/api/http';
import { useUserStore } from '@/store/useUserStore';

interface SeasonAnalytics {
  categoryId: string;
  city: string;
  from: string;
  to: string;
  period: string;
  totalAds: number;
  activeAds: number;
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  viewsTotal: number;
  contactClicksTotal: number;
  conversion: number;
  trend: {
    prevPeriodAveragePrice: number;
    priceChangePercent: number;
    prevPeriodAds: number;
    adsChangePercent: number;
  };
}

interface MyAnalytics {
  period: string;
  from: string;
  to: string;
  categories: Array<{
    subcategoryId: string;
    myAdsCount: number;
    myAvgPrice: number;
    myViews: number;
    myClicks: number;
    marketAvgPrice: number;
    marketAdsCount: number;
    priceDiffPercent: number;
    priceStatus: 'above' | 'below' | 'market';
  }>;
  totalMyAds: number;
  totalViews: number;
  totalClicks: number;
}

const PERIODS = [
  { value: 'week', label: '7 дней' },
  { value: 'month', label: '30 дней' },
  { value: 'season', label: 'Сезон' },
];

const CATEGORY_NAMES: Record<string, string> = {
  'farmer-vegetables': 'Овощи',
  'farmer-fruits': 'Фрукты',
  'farmer-berries': 'Ягоды',
  'farmer-greens': 'Зелень',
  'farmer-potato': 'Картофель',
  'farmer-canning': 'Консервация',
  'farmer-honey': 'Мёд',
  'farmer-dairy': 'Молочка',
  'farmer-meat': 'Мясо',
  'farmer-plants': 'Рассада',
  'farmer-feed': 'Корма',
  'farmer-other': 'Другое',
};

export default function FarmerAnalyticsPage() {
  const navigate = useNavigate();
  const user = useUserStore((state) => state.user);
  const [period, setPeriod] = useState('month');
  const [seasonData, setSeasonData] = useState<SeasonAnalytics | null>(null);
  const [myData, setMyData] = useState<MyAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'market' | 'my'>('market');

  useEffect(() => {
    loadData();
  }, [period, user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [seasonRes, myRes] = await Promise.all([
        http.get(`/api/farmer/season-analytics?period=${period}`),
        user?.telegramId 
          ? http.get(`/api/farmer/my-analytics?period=${period}&sellerTelegramId=${user.telegramId}`)
          : Promise.resolve({ data: { success: false } }),
      ]);

      if (seasonRes.data.success) {
        setSeasonData(seasonRes.data.data);
      }
      if (myRes.data.success) {
        setMyData(myRes.data.data);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return `${price.toFixed(2)} BYN`;
  };

  const formatPercent = (value: number) => {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const getTrendColor = (value: number) => {
    if (value > 0) return '#10B981';
    if (value < 0) return '#EF4444';
    return '#6B7280';
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #3B73FC 0%, #2563EB 100%)',
        padding: '16px 20px 24px',
        color: '#FFFFFF',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
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
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
            Аналитика рынка
          </h1>
        </div>

        {/* Period Selector */}
        <div style={{ display: 'flex', gap: 8 }}>
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: 12,
                border: 'none',
                background: period === p.value ? '#FFFFFF' : 'rgba(255, 255, 255, 0.2)',
                color: period === p.value ? '#3B73FC' : '#FFFFFF',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              data-testid={`button-period-${p.value}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: '0 20px', marginTop: -12 }}>
        <div style={{
          display: 'flex',
          background: '#FFFFFF',
          borderRadius: 16,
          padding: 4,
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
        }}>
          <button
            onClick={() => setActiveTab('market')}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: 12,
              border: 'none',
              background: activeTab === 'market' ? '#3B73FC' : 'transparent',
              color: activeTab === 'market' ? '#FFFFFF' : '#6B7280',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
            data-testid="tab-market"
          >
            Рынок
          </button>
          <button
            onClick={() => setActiveTab('my')}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: 12,
              border: 'none',
              background: activeTab === 'my' ? '#3B73FC' : 'transparent',
              color: activeTab === 'my' ? '#FFFFFF' : '#6B7280',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
            data-testid="tab-my"
          >
            Мои товары
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: 20 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{
              width: 40,
              height: 40,
              border: '3px solid #E5E7EB',
              borderTopColor: '#3B73FC',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto',
            }} />
          </div>
        ) : activeTab === 'market' && seasonData ? (
          <>
            {/* Average Price Card */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: 20,
              padding: 20,
              marginBottom: 16,
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <BarChart3 size={20} color="#3B73FC" />
                <span style={{ fontSize: 14, color: '#6B7280', fontWeight: 500 }}>Средняя цена</span>
              </div>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
                {formatPrice(seasonData.averagePrice)} / кг
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {seasonData.trend.priceChangePercent !== 0 && (
                  <>
                    {seasonData.trend.priceChangePercent > 0 ? (
                      <TrendingUp size={18} color={getTrendColor(seasonData.trend.priceChangePercent)} />
                    ) : (
                      <TrendingDown size={18} color={getTrendColor(seasonData.trend.priceChangePercent)} />
                    )}
                    <span style={{ 
                      fontSize: 14, 
                      fontWeight: 600,
                      color: getTrendColor(seasonData.trend.priceChangePercent),
                    }}>
                      {formatPercent(seasonData.trend.priceChangePercent)} к прошлому периоду
                    </span>
                  </>
                )}
              </div>
              <div style={{ 
                marginTop: 16, 
                padding: '12px 16px', 
                background: '#F3F4F6', 
                borderRadius: 12,
                display: 'flex',
                justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>Мин.</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#10B981' }}>
                    {formatPrice(seasonData.minPrice)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>Макс.</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#EF4444' }}>
                    {formatPrice(seasonData.maxPrice)}
                  </div>
                </div>
              </div>
            </div>

            {/* Ads Count Card */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: 20,
              padding: 20,
              marginBottom: 16,
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Calendar size={20} color="#3B73FC" />
                <span style={{ fontSize: 14, color: '#6B7280', fontWeight: 500 }}>Объявления за период</span>
              </div>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
                {seasonData.totalAds}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, color: '#6B7280' }}>
                  Было {seasonData.trend.prevPeriodAds}
                </span>
                {seasonData.trend.adsChangePercent !== 0 && (
                  <span style={{ 
                    fontSize: 14, 
                    fontWeight: 600,
                    color: getTrendColor(seasonData.trend.adsChangePercent),
                  }}>
                    ({formatPercent(seasonData.trend.adsChangePercent)})
                  </span>
                )}
              </div>
            </div>

            {/* Views & Clicks Card */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: 20,
              padding: 20,
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Eye size={20} color="#3B73FC" />
                <span style={{ fontSize: 14, color: '#6B7280', fontWeight: 500 }}>Просмотры и интерес</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>
                    {seasonData.viewsTotal.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>Просмотры</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>
                    {seasonData.contactClicksTotal.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>Контакты</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#10B981' }}>
                    {seasonData.conversion}%
                  </div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>Конверсия</div>
                </div>
              </div>
            </div>
          </>
        ) : activeTab === 'my' && myData ? (
          <>
            {/* My Summary */}
            <div style={{
              background: 'linear-gradient(135deg, #3B73FC 0%, #2563EB 100%)',
              borderRadius: 20,
              padding: 20,
              marginBottom: 16,
              color: '#FFFFFF',
            }}>
              <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 8 }}>Ваши объявления</div>
              <div style={{ fontSize: 36, fontWeight: 700, marginBottom: 16 }}>
                {myData.totalMyAds}
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 600 }}>{myData.totalViews}</div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>просмотров</div>
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 600 }}>{myData.totalClicks}</div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>контактов</div>
                </div>
              </div>
            </div>

            {/* Categories Comparison */}
            <div style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 12 }}>
              Сравнение с рынком
            </div>
            {myData.categories.length === 0 ? (
              <div style={{
                background: '#FFFFFF',
                borderRadius: 20,
                padding: 32,
                textAlign: 'center',
                boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
              }}>
                <MessageCircle size={40} color="#9CA3AF" style={{ marginBottom: 12 }} />
                <div style={{ fontSize: 16, color: '#6B7280' }}>
                  У вас пока нет объявлений в этот период
                </div>
              </div>
            ) : (
              myData.categories.map((cat, index) => (
                <div
                  key={index}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 12,
                    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
                  }}
                >
                  <div style={{ 
                    fontSize: 15, 
                    fontWeight: 600, 
                    color: '#111827',
                    marginBottom: 12,
                  }}>
                    {CATEGORY_NAMES[cat.subcategoryId] || cat.subcategoryId}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 12, color: '#6B7280' }}>Ваша цена</div>
                      <div style={{ fontSize: 18, fontWeight: 600, color: '#111827' }}>
                        {formatPrice(cat.myAvgPrice)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, color: '#6B7280' }}>Средняя по рынку</div>
                      <div style={{ fontSize: 18, fontWeight: 600, color: '#6B7280' }}>
                        {formatPrice(cat.marketAvgPrice)}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: 10,
                    background: cat.priceStatus === 'below' ? '#ECFDF5' : 
                               cat.priceStatus === 'above' ? '#FEF2F2' : '#F3F4F6',
                    color: cat.priceStatus === 'below' ? '#059669' : 
                           cat.priceStatus === 'above' ? '#DC2626' : '#6B7280',
                    fontSize: 13,
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}>
                    {cat.priceStatus === 'below' && <TrendingDown size={16} />}
                    {cat.priceStatus === 'above' && <TrendingUp size={16} />}
                    {cat.priceStatus === 'below' && `Ниже рынка на ${Math.abs(cat.priceDiffPercent)}%`}
                    {cat.priceStatus === 'above' && `Выше рынка на ${cat.priceDiffPercent}%`}
                    {cat.priceStatus === 'market' && 'Цена в рынке'}
                  </div>
                </div>
              ))
            )}
          </>
        ) : (
          <div style={{
            background: '#FFFFFF',
            borderRadius: 20,
            padding: 32,
            textAlign: 'center',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
          }}>
            <BarChart3 size={40} color="#9CA3AF" style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 16, color: '#6B7280' }}>
              Нет данных для отображения
            </div>
          </div>
        )}
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
