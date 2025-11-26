import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Eye, Users, Phone, TrendingUp, TrendingDown, Heart,
  ChevronRight, Package, ArrowLeft, MapPin, Lightbulb,
  AlertTriangle, DollarSign, BarChart3, Clock, Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePlatform } from '@/platform/PlatformProvider';

interface AnalyticsOverview {
  period: { days: number; startDate: string; endDate: string };
  views: { total: number; product: number; store: number; change: number };
  contacts: { total: number; change: number };
  favorites: { added: number; removed: number; net: number };
  messages: number;
  searchHits: number;
  subscribers: number;
  productsCount: number;
  rating: number;
  reviewsCount: number;
  topProducts: Array<{
    id: string;
    title: string;
    price?: number;
    photo?: string;
    views: number;
    uniqueViews: number;
  }>;
}

interface ViewsDataPoint {
  date: string;
  views: number;
  storeViews: number;
}

interface CategoryPerformance {
  categoryId: string;
  name: string;
  icon?: string;
  productsCount: number;
  views: number;
  contacts: number;
  favorites: number;
  conversionRate: number;
  sellerAvgPrice: number;
  marketAvgPrice: number;
  pricePosition: number;
  recommendation?: string;
}

interface PriceItem {
  adId: string;
  title: string;
  photo?: string;
  price: number;
  marketAvg: number;
  marketMin: number;
  diff: number;
  status: 'best_price' | 'overpriced' | 'underpriced' | 'normal';
  recommendation?: string;
}

interface Suggestion {
  type: string;
  priority: 'high' | 'medium' | 'low';
  icon: string;
  title: string;
  message: string;
  action?: { type: string; target: string };
}

interface Warning {
  type: string;
  severity: 'warning' | 'alert';
  icon: string;
  message: string;
}

interface Hotspot {
  lat: number;
  lng: number;
  totalEvents: number;
  views: number;
  contacts: number;
  favorites: number;
  intensity: number;
}

const PERIODS = [
  { value: 7, label: '7 дней' },
  { value: 14, label: '14 дней' },
  { value: 30, label: '30 дней' },
];

function StatCard({ 
  icon: Icon, 
  title, 
  value, 
  change, 
  suffix = '',
  onClick 
}: { 
  icon: any; 
  title: string; 
  value: number | string; 
  change?: number;
  suffix?: string;
  onClick?: () => void;
}) {
  return (
    <Card 
      className={onClick ? 'cursor-pointer hover-elevate' : ''} 
      onClick={onClick}
      data-testid={`stat-card-${title.toLowerCase().replace(/\s/g, '-')}`}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">{title}</p>
            <p className="text-xl font-bold mt-0.5">{value}{suffix}</p>
            {change !== undefined && (
              <div className={`flex items-center gap-1 text-xs mt-1 ${
                change >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {change >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                <span>{change >= 0 ? '+' : ''}{change}%</span>
              </div>
            )}
          </div>
          <div className="p-2 bg-primary/10 rounded-lg shrink-0">
            <Icon className="w-4 h-4 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniChart({ data, height = 40 }: { data: ViewsDataPoint[]; height?: number }) {
  if (!data || data.length === 0) return null;
  
  const maxValue = Math.max(...data.map(d => d.views + d.storeViews), 1);
  const width = 100;
  
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d.views + d.storeViews) / maxValue) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-10">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-primary"
        points={points}
      />
    </svg>
  );
}

function OverviewTab({ 
  overview, 
  viewsData, 
  isLoading,
  period,
  onPeriodChange
}: { 
  overview?: AnalyticsOverview; 
  viewsData?: ViewsDataPoint[];
  isLoading: boolean;
  period: number;
  onPeriodChange: (p: number) => void;
}) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!overview) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Нет данных за выбранный период</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {PERIODS.map(p => (
          <Button
            key={p.value}
            size="sm"
            variant={period === p.value ? 'default' : 'outline'}
            onClick={() => onPeriodChange(p.value)}
            data-testid={`period-${p.value}`}
          >
            {p.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={Eye}
          title="Просмотры"
          value={overview.views.total}
          change={overview.views.change}
        />
        <StatCard
          icon={Phone}
          title="Контакты"
          value={overview.contacts.total}
          change={overview.contacts.change}
        />
        <StatCard
          icon={Heart}
          title="В избранном"
          value={overview.favorites.net >= 0 ? `+${overview.favorites.net}` : overview.favorites.net}
        />
        <StatCard
          icon={Users}
          title="Подписчики"
          value={overview.subscribers}
        />
      </div>

      {viewsData && viewsData.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Динамика просмотров
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <MiniChart data={viewsData} />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>{new Date(viewsData[0]?.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
              <span>{new Date(viewsData[viewsData.length - 1]?.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {overview.topProducts && overview.topProducts.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Star className="w-4 h-4" />
              Топ товары
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-3">
              {overview.topProducts.map((product, idx) => (
                <div 
                  key={product.id}
                  className="flex items-center gap-3 cursor-pointer hover-elevate p-2 rounded-lg -mx-2"
                  onClick={() => navigate(`/ad/${product.id}`)}
                  data-testid={`top-product-${idx}`}
                >
                  <span className="text-lg font-bold text-muted-foreground w-5">
                    {idx + 1}
                  </span>
                  {product.photo ? (
                    <img 
                      src={`/api/media/thumbnail/${product.photo}`}
                      alt=""
                      className="w-10 h-10 rounded object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                      <Package className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {product.views} просмотров
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PricesTab({ 
  prices, 
  isLoading 
}: { 
  prices?: PriceItem[]; 
  isLoading: boolean;
}) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  if (!prices || prices.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <DollarSign className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Нет товаров для анализа цен</p>
        </CardContent>
      </Card>
    );
  }

  const statusConfig = {
    best_price: { label: 'Лучшая цена', color: 'bg-green-500/10 text-green-700' },
    overpriced: { label: 'Выше рынка', color: 'bg-red-500/10 text-red-700' },
    underpriced: { label: 'Ниже рынка', color: 'bg-yellow-500/10 text-yellow-700' },
    normal: { label: 'В рынке', color: 'bg-blue-500/10 text-blue-700' },
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <Badge variant="outline" className="bg-green-500/10">
          Лучшая цена: {prices.filter(p => p.status === 'best_price').length}
        </Badge>
        <Badge variant="outline" className="bg-red-500/10">
          Выше рынка: {prices.filter(p => p.status === 'overpriced').length}
        </Badge>
        <Badge variant="outline" className="bg-yellow-500/10">
          Ниже рынка: {prices.filter(p => p.status === 'underpriced').length}
        </Badge>
      </div>

      {prices.map((item) => (
        <Card 
          key={item.adId}
          className="cursor-pointer hover-elevate"
          onClick={() => navigate(`/ad/${item.adId}`)}
          data-testid={`price-item-${item.adId}`}
        >
          <CardContent className="p-3">
            <div className="flex items-start gap-3">
              {item.photo ? (
                <img 
                  src={`/api/media/thumbnail/${item.photo}`}
                  alt=""
                  className="w-14 h-14 rounded object-cover"
                />
              ) : (
                <div className="w-14 h-14 rounded bg-muted flex items-center justify-center">
                  <Package className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-bold">{item.price.toLocaleString()} ₽</span>
                  <Badge className={statusConfig[item.status].color}>
                    {statusConfig[item.status].label}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Рынок: {item.marketMin.toLocaleString()} — {item.marketAvg.toLocaleString()} ₽
                </p>
                {item.recommendation && (
                  <p className="text-xs text-primary mt-1">{item.recommendation}</p>
                )}
              </div>
              <div className={`text-sm font-medium ${
                item.diff > 0 ? 'text-red-500' : item.diff < 0 ? 'text-green-500' : 'text-muted-foreground'
              }`}>
                {item.diff > 0 ? '+' : ''}{item.diff}%
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CategoriesTab({ 
  categories, 
  isLoading 
}: { 
  categories?: CategoryPerformance[]; 
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  if (!categories || categories.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Package className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Нет данных по категориям</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {categories.map((cat) => (
        <Card key={cat.categoryId} data-testid={`category-${cat.categoryId}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              {cat.icon && <span className="text-xl">{cat.icon}</span>}
              <h3 className="font-medium">{cat.name}</h3>
              <Badge variant="secondary" className="ml-auto">
                {cat.productsCount} товаров
              </Badge>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-center mb-3">
              <div>
                <p className="text-lg font-bold">{cat.views}</p>
                <p className="text-xs text-muted-foreground">Просмотров</p>
              </div>
              <div>
                <p className="text-lg font-bold">{cat.contacts}</p>
                <p className="text-xs text-muted-foreground">Контактов</p>
              </div>
              <div>
                <p className="text-lg font-bold text-primary">{cat.conversionRate}%</p>
                <p className="text-xs text-muted-foreground">Конверсия</p>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm border-t pt-3">
              <div>
                <p className="text-muted-foreground">Ваша цена</p>
                <p className="font-medium">{cat.sellerAvgPrice.toLocaleString()} ₽</p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground">Рынок</p>
                <p className="font-medium">{cat.marketAvgPrice.toLocaleString()} ₽</p>
              </div>
              <Badge className={
                cat.pricePosition > 10 ? 'bg-red-500/10 text-red-700' :
                cat.pricePosition < -10 ? 'bg-yellow-500/10 text-yellow-700' :
                'bg-green-500/10 text-green-700'
              }>
                {cat.pricePosition > 0 ? '+' : ''}{cat.pricePosition}%
              </Badge>
            </div>

            {cat.recommendation && (
              <div className="mt-3 p-2 bg-primary/5 rounded text-xs text-primary flex items-start gap-2">
                <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" />
                {cat.recommendation}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function GeoTab({ 
  hotspots, 
  isLoading 
}: { 
  hotspots?: Hotspot[]; 
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-48" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (!hotspots || hotspots.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Нет геоданных</p>
          <p className="text-xs text-muted-foreground mt-1">
            Данные появятся, когда покупатели начнут смотреть ваши товары
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Горячие точки спроса
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-xs text-muted-foreground mb-3">
            Откуда приходит больше всего покупателей
          </p>
          <div className="space-y-2">
            {hotspots.slice(0, 10).map((spot, idx) => (
              <div 
                key={idx}
                className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                data-testid={`hotspot-${idx}`}
              >
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">{idx + 1}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {spot.lat.toFixed(3)}, {spot.lng.toFixed(3)}
                  </p>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>{spot.views} просм.</span>
                    <span>{spot.contacts} контактов</span>
                    <span>{spot.favorites} в избр.</span>
                  </div>
                </div>
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ 
                    backgroundColor: `rgba(var(--primary-rgb), ${spot.intensity})` 
                  }}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium">Совет</p>
              <p className="text-xs text-muted-foreground mt-1">
                Размещайте товары с указанием районов, откуда приходит больше покупателей. 
                Это повысит ваши шансы на продажу.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SuggestionsTab({ 
  suggestions, 
  warnings,
  isLoading 
}: { 
  suggestions?: Suggestion[]; 
  warnings?: Warning[];
  isLoading: boolean;
}) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  const hasContent = (suggestions && suggestions.length > 0) || (warnings && warnings.length > 0);

  if (!hasContent) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Lightbulb className="w-12 h-12 mx-auto text-primary mb-3" />
          <p className="font-medium">Отлично!</p>
          <p className="text-sm text-muted-foreground mt-1">
            У вас нет рекомендаций. Продолжайте в том же духе!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {warnings && warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((warning, idx) => (
            <Card 
              key={idx}
              className={warning.severity === 'alert' ? 'border-red-500/50' : 'border-yellow-500/50'}
              data-testid={`warning-${idx}`}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <AlertTriangle className={`w-5 h-5 ${
                    warning.severity === 'alert' ? 'text-red-500' : 'text-yellow-500'
                  }`} />
                  <p className="text-sm">{warning.message}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {suggestions && suggestions.length > 0 && (
        <div className="space-y-3">
          {suggestions.map((suggestion, idx) => (
            <Card 
              key={idx}
              className={suggestion.action ? 'cursor-pointer hover-elevate' : ''}
              onClick={() => {
                if (suggestion.action?.type === 'navigate') {
                  navigate(suggestion.action.target);
                }
              }}
              data-testid={`suggestion-${idx}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{suggestion.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{suggestion.title}</p>
                      <Badge variant="secondary" className={
                        suggestion.priority === 'high' ? 'bg-red-500/10 text-red-700' :
                        suggestion.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-700' :
                        'bg-blue-500/10 text-blue-700'
                      }>
                        {suggestion.priority === 'high' ? 'Важно' : 
                         suggestion.priority === 'medium' ? 'Средне' : 'Низко'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{suggestion.message}</p>
                  </div>
                  {suggestion.action && (
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SellerAnalyticsPage() {
  const navigate = useNavigate();
  const { getAuthToken } = usePlatform();
  const [period, setPeriod] = useState(7);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchWithAuth = async (url: string) => {
    const token = await getAuthToken();
    if (!token) throw new Error('Not authenticated');
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
  };

  const { data: overviewData, isLoading: overviewLoading } = useQuery({
    queryKey: ['/api/seller-analytics/overview', period],
    queryFn: () => fetchWithAuth(`/api/seller-analytics/overview?period=${period}`),
  });

  const { data: viewsData, isLoading: viewsLoading } = useQuery({
    queryKey: ['/api/seller-analytics/views', period],
    queryFn: () => fetchWithAuth(`/api/seller-analytics/views?days=${period}`),
    enabled: activeTab === 'overview',
  });

  const { data: pricesData, isLoading: pricesLoading } = useQuery({
    queryKey: ['/api/seller-analytics/price-position'],
    queryFn: () => fetchWithAuth('/api/seller-analytics/price-position'),
    enabled: activeTab === 'prices',
  });

  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['/api/seller-analytics/category-performance', period],
    queryFn: () => fetchWithAuth(`/api/seller-analytics/category-performance?days=${period}`),
    enabled: activeTab === 'categories',
  });

  const { data: hotspotsData, isLoading: hotspotsLoading } = useQuery({
    queryKey: ['/api/seller-analytics/hotspots', period],
    queryFn: () => fetchWithAuth(`/api/seller-analytics/hotspots?days=${period}`),
    enabled: activeTab === 'geo',
  });

  const { data: suggestionsData, isLoading: suggestionsLoading } = useQuery({
    queryKey: ['/api/seller-analytics/suggestions'],
    queryFn: () => fetchWithAuth('/api/seller-analytics/suggestions'),
    enabled: activeTab === 'tips',
  });

  const { data: warningsData, isLoading: warningsLoading } = useQuery({
    queryKey: ['/api/seller-analytics/warnings'],
    queryFn: () => fetchWithAuth('/api/seller-analytics/warnings'),
    enabled: activeTab === 'tips',
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="flex items-center gap-3 p-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-bold">Аналитика продаж</h1>
            <p className="text-xs text-muted-foreground">MEGA-ANALYTICS 10.0</p>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Clock className="w-3 h-3" />
            {period} дней
          </Badge>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="p-3">
        <TabsList className="w-full grid grid-cols-5 h-auto">
          <TabsTrigger value="overview" className="text-xs py-2" data-testid="tab-overview">
            Обзор
          </TabsTrigger>
          <TabsTrigger value="prices" className="text-xs py-2" data-testid="tab-prices">
            Цены
          </TabsTrigger>
          <TabsTrigger value="categories" className="text-xs py-2" data-testid="tab-categories">
            Категории
          </TabsTrigger>
          <TabsTrigger value="geo" className="text-xs py-2" data-testid="tab-geo">
            Гео
          </TabsTrigger>
          <TabsTrigger value="tips" className="text-xs py-2" data-testid="tab-tips">
            Советы
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <TabsContent value="overview" className="mt-0">
            <OverviewTab 
              overview={overviewData?.overview}
              viewsData={viewsData?.timeline}
              isLoading={overviewLoading || viewsLoading}
              period={period}
              onPeriodChange={setPeriod}
            />
          </TabsContent>

          <TabsContent value="prices" className="mt-0">
            <PricesTab 
              prices={pricesData?.prices}
              isLoading={pricesLoading}
            />
          </TabsContent>

          <TabsContent value="categories" className="mt-0">
            <CategoriesTab 
              categories={categoriesData?.categories}
              isLoading={categoriesLoading}
            />
          </TabsContent>

          <TabsContent value="geo" className="mt-0">
            <GeoTab 
              hotspots={hotspotsData?.hotspots}
              isLoading={hotspotsLoading}
            />
          </TabsContent>

          <TabsContent value="tips" className="mt-0">
            <SuggestionsTab 
              suggestions={suggestionsData?.suggestions}
              warnings={warningsData?.warnings}
              isLoading={suggestionsLoading || warningsLoading}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
