import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  ArrowLeft, TrendingUp, Eye, Phone, Heart, Package, 
  MapPin, Calendar, Users, Download, ChevronRight,
  BarChart3, PieChart, Target, Sparkles, Clock, Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePlatform } from '@/platform/PlatformProvider';
import { getThumbnailUrl, NO_PHOTO_PLACEHOLDER } from '@/constants/placeholders';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from 'recharts';

type TabType = 'overview' | 'products' | 'geo' | 'campaigns';
type PeriodType = '7d' | '30d' | '90d';

interface DashboardData {
  totalViews: number;
  totalContacts: number;
  totalFavorites: number;
  totalProducts: number;
  viewsTrend: number;
  contactsTrend: number;
  favoritesTrend: number;
  conversionRate: number;
  avgTimeToContact: number;
}

interface TimeSeriesPoint {
  date: string;
  views: number;
  contacts: number;
  favorites: number;
}

interface TopProduct {
  adId: string;
  title: string;
  photo?: string;
  views: number;
  contacts: number;
  favorites: number;
  conversionRate: number;
}

interface GeoData {
  city: string;
  views: number;
  contacts: number;
  percentage: number;
}

interface CampaignData {
  seasonId: string;
  name: string;
  startDate: string;
  endDate: string;
  views: number;
  contacts: number;
  isActive: boolean;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function StoreProAnalyticsPage() {
  const navigate = useNavigate();
  const { getAuthToken } = usePlatform();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [period, setPeriod] = useState<PeriodType>('30d');

  const periodDays = useMemo(() => {
    switch (period) {
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      default: return 30;
    }
  }, [period]);

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['/api/store/pro-analytics/dashboard', period],
    queryFn: async () => {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');
      
      const res = await fetch(`/api/store/pro-analytics/dashboard?days=${periodDays}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load dashboard');
      return res.json();
    },
    staleTime: 60000,
  });

  const { data: timeSeriesData, isLoading: timeSeriesLoading } = useQuery({
    queryKey: ['/api/store/pro-analytics/time-series', period],
    queryFn: async () => {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');
      
      const res = await fetch(`/api/store/pro-analytics/time-series?days=${periodDays}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load time series');
      return res.json();
    },
    staleTime: 60000,
  });

  const { data: topProductsData, isLoading: topProductsLoading } = useQuery({
    queryKey: ['/api/store/pro-analytics/products/top', period],
    queryFn: async () => {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');
      
      const res = await fetch(`/api/store/pro-analytics/products/top?days=${periodDays}&limit=10`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load top products');
      return res.json();
    },
    staleTime: 60000,
    enabled: activeTab === 'overview' || activeTab === 'products',
  });

  const { data: geoData, isLoading: geoLoading } = useQuery({
    queryKey: ['/api/store/pro-analytics/geo', period],
    queryFn: async () => {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');
      
      const res = await fetch(`/api/store/pro-analytics/geo?days=${periodDays}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load geo data');
      return res.json();
    },
    staleTime: 120000,
    enabled: activeTab === 'geo',
  });

  const { data: campaignsData, isLoading: campaignsLoading } = useQuery({
    queryKey: ['/api/store/pro-analytics/campaigns', period],
    queryFn: async () => {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');
      
      const res = await fetch(`/api/store/pro-analytics/campaigns?days=${periodDays}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load campaigns');
      return res.json();
    },
    staleTime: 120000,
    enabled: activeTab === 'campaigns',
  });

  const { data: conversionData } = useQuery({
    queryKey: ['/api/store/pro-analytics/conversion', period],
    queryFn: async () => {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');
      
      const res = await fetch(`/api/store/pro-analytics/conversion?days=${periodDays}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load conversion');
      return res.json();
    },
    staleTime: 120000,
    enabled: activeTab === 'overview',
  });

  const dashboard: DashboardData | null = dashboardData?.data || null;
  const timeSeries: TimeSeriesPoint[] = timeSeriesData?.data || [];
  const topProducts: TopProduct[] = topProductsData?.data || [];
  const geoStats: GeoData[] = geoData?.data || [];
  const campaigns: CampaignData[] = campaignsData?.data || [];

  const formattedTimeSeries = useMemo(() => {
    return timeSeries.map(point => ({
      ...point,
      dateLabel: new Date(point.date).toLocaleDateString('ru-RU', { 
        day: 'numeric', 
        month: 'short' 
      }),
    }));
  }, [timeSeries]);

  const formatTrend = (value: number) => {
    if (value > 0) return `+${value.toFixed(1)}%`;
    if (value < 0) return `${value.toFixed(1)}%`;
    return '0%';
  };

  const getTrendColor = (value: number) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-500';
    return 'text-muted-foreground';
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background border-b">
        <div className="flex items-center gap-3 p-4">
          <Button 
            size="icon" 
            variant="ghost" 
            onClick={() => navigate('/store-cabinet')}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              PRO Аналитика
            </h1>
            <p className="text-xs text-muted-foreground">Детальная статистика магазина</p>
          </div>
          <Button size="sm" variant="outline" data-testid="button-export">
            <Download className="w-4 h-4" />
          </Button>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2 px-4 pb-3">
          {[
            { id: '7d' as PeriodType, label: '7 дней' },
            { id: '30d' as PeriodType, label: '30 дней' },
            { id: '90d' as PeriodType, label: '90 дней' },
          ].map(p => (
            <Button
              key={p.id}
              size="sm"
              variant={period === p.id ? 'default' : 'outline'}
              onClick={() => setPeriod(p.id)}
              data-testid={`period-${p.id}`}
            >
              {p.label}
            </Button>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-t bg-card">
          {[
            { id: 'overview' as TabType, label: 'Обзор', icon: BarChart3 },
            { id: 'products' as TabType, label: 'Товары', icon: Package },
            { id: 'geo' as TabType, label: 'География', icon: MapPin },
            { id: 'campaigns' as TabType, label: 'Кампании', icon: Calendar },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                data-testid={`tab-${tab.id}`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* KPI Cards */}
            {dashboardLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
              </div>
            ) : dashboard ? (
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Eye className="w-4 h-4" />
                      <span className="text-xs">Просмотры</span>
                    </div>
                    <div className="text-xl font-bold" data-testid="kpi-views">
                      {dashboard.totalViews.toLocaleString()}
                    </div>
                    <span className={`text-xs ${getTrendColor(dashboard.viewsTrend)}`}>
                      {formatTrend(dashboard.viewsTrend)}
                    </span>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Phone className="w-4 h-4" />
                      <span className="text-xs">Контакты</span>
                    </div>
                    <div className="text-xl font-bold" data-testid="kpi-contacts">
                      {dashboard.totalContacts.toLocaleString()}
                    </div>
                    <span className={`text-xs ${getTrendColor(dashboard.contactsTrend)}`}>
                      {formatTrend(dashboard.contactsTrend)}
                    </span>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Heart className="w-4 h-4" />
                      <span className="text-xs">В избранном</span>
                    </div>
                    <div className="text-xl font-bold" data-testid="kpi-favorites">
                      {dashboard.totalFavorites.toLocaleString()}
                    </div>
                    <span className={`text-xs ${getTrendColor(dashboard.favoritesTrend)}`}>
                      {formatTrend(dashboard.favoritesTrend)}
                    </span>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Target className="w-4 h-4" />
                      <span className="text-xs">Конверсия</span>
                    </div>
                    <div className="text-xl font-bold" data-testid="kpi-conversion">
                      {dashboard.conversionRate.toFixed(1)}%
                    </div>
                    <span className="text-xs text-muted-foreground">
                      просмотр → контакт
                    </span>
                  </CardContent>
                </Card>
              </div>
            ) : null}

            {/* Views Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Динамика просмотров
                </CardTitle>
              </CardHeader>
              <CardContent>
                {timeSeriesLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : formattedTimeSeries.length > 0 ? (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={formattedTimeSeries}>
                        <defs>
                          <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="dateLabel" 
                          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis 
                          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                          tickLine={false}
                          axisLine={false}
                          width={30}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="views" 
                          stroke="hsl(var(--primary))" 
                          fill="url(#viewsGradient)"
                          strokeWidth={2}
                          name="Просмотры"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center text-muted-foreground">
                    Нет данных за выбранный период
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Conversion Funnel */}
            {conversionData?.data && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-primary" />
                    Воронка конверсии
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { label: 'Просмотры', value: conversionData.data.views, percentage: 100 },
                      { label: 'Контакты', value: conversionData.data.contacts, percentage: conversionData.data.viewToContactRate },
                      { label: 'В избранном', value: conversionData.data.favorites, percentage: conversionData.data.viewToFavoriteRate },
                    ].map((step, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{step.label}</span>
                          <span className="font-medium">{step.value.toLocaleString()}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${step.percentage}%` }}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground text-right">
                          {step.percentage.toFixed(1)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Top Products Preview */}
            {topProducts.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Star className="w-4 h-4 text-primary" />
                      ТОП товары
                    </CardTitle>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => setActiveTab('products')}
                      data-testid="button-view-all-products"
                    >
                      Все <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {topProducts.slice(0, 3).map((product, i) => (
                      <div 
                        key={product.adId}
                        className="flex items-center gap-3 p-2 rounded-lg hover-elevate cursor-pointer"
                        onClick={() => navigate(`/ads/${product.adId}`)}
                        data-testid={`top-product-${i}`}
                      >
                        <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                          <img 
                            src={product.photo ? getThumbnailUrl(product.photo) : NO_PHOTO_PLACEHOLDER} 
                            alt="" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium truncate block">{product.title}</span>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {product.views}
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {product.contacts}
                            </span>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {product.conversionRate.toFixed(1)}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <>
            {topProductsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-20 rounded-xl" />
                ))}
              </div>
            ) : topProducts.length > 0 ? (
              <div className="space-y-3">
                {topProducts.map((product, i) => (
                  <Card key={product.adId} data-testid={`product-card-${i}`}>
                    <CardContent className="p-3 flex gap-3">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        <img
                          src={product.photo ? getThumbnailUrl(product.photo) : NO_PHOTO_PLACEHOLDER}
                          alt={product.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">{product.title}</h3>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          <div className="text-center">
                            <div className="text-sm font-bold">{product.views}</div>
                            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                              <Eye className="w-3 h-3" />
                              просмотров
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-bold">{product.contacts}</div>
                            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                              <Phone className="w-3 h-3" />
                              контактов
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-bold text-primary">{product.conversionRate.toFixed(1)}%</div>
                            <div className="text-xs text-muted-foreground">
                              конверсия
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <Package className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Нет данных о товарах</p>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Geo Tab */}
        {activeTab === 'geo' && (
          <>
            {geoLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-48 rounded-xl" />
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
            ) : geoStats.length > 0 ? (
              <>
                {/* Geo Pie Chart */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      География аудитории
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={geoStats.slice(0, 5)}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={70}
                            paddingAngle={2}
                            dataKey="views"
                            nameKey="city"
                          >
                            {geoStats.slice(0, 5).map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                              fontSize: '12px',
                            }}
                            formatter={(value: number) => [value.toLocaleString(), 'Просмотров']}
                          />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Cities List */}
                <div className="space-y-2">
                  {geoStats.map((geo, i) => (
                    <Card key={geo.city} data-testid={`geo-city-${i}`}>
                      <CardContent className="p-3 flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: COLORS[i % COLORS.length] }}
                        />
                        <div className="flex-1">
                          <span className="font-medium text-sm">{geo.city}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold">{geo.views.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">
                            {geo.percentage.toFixed(1)}%
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Нет данных о географии</p>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Campaigns Tab */}
        {activeTab === 'campaigns' && (
          <>
            {campaignsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
              </div>
            ) : campaigns.length > 0 ? (
              <div className="space-y-3">
                {campaigns.map((campaign, i) => (
                  <Card key={campaign.seasonId} data-testid={`campaign-card-${i}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-medium">{campaign.name}</h3>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <Clock className="w-3 h-3" />
                            {new Date(campaign.startDate).toLocaleDateString('ru-RU')} - {new Date(campaign.endDate).toLocaleDateString('ru-RU')}
                          </div>
                        </div>
                        <Badge variant={campaign.isActive ? 'default' : 'secondary'}>
                          {campaign.isActive ? 'Активна' : 'Завершена'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div className="bg-muted/50 rounded-lg p-2 text-center">
                          <div className="text-lg font-bold">{campaign.views.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">просмотров</div>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-2 text-center">
                          <div className="text-lg font-bold">{campaign.contacts.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">контактов</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Нет сезонных кампаний</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Участвуйте в сезонных ярмарках для увеличения продаж
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
