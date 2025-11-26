import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useUserStore } from '@/store/useUserStore';
import AuthScreen from '@/components/AuthScreen';
import PageLoader from '@/components/PageLoader';
import { 
  TrendingUp, 
  TrendingDown,
  ArrowLeft,
  DollarSign,
  BarChart3,
  Zap,
  Clock,
  Users,
  Sun,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';

interface PriceRecommendation {
  adId: string;
  currentPrice: number;
  recommendedPrice: number;
  priceChange: number;
  percentChange: number;
  action: 'raise' | 'lower' | 'keep';
  confidence: number;
  reasoning: string;
  factors: {
    demand: { score: number; label: string; description: string };
    competition: { score: number; label: string; description: string };
    seasonality: { score: number; label: string; description: string };
    timing: { score: number; label: string; description: string };
    buyerActivity: { score: number; label: string; description: string };
  };
  marketPosition: 'below_market' | 'fair_price' | 'above_market';
  potentialBuyers: number;
  urgency: 'low' | 'medium' | 'high';
  validUntil: string;
}

interface AdInfo {
  _id: string;
  title: string;
  price: number;
  photos?: string[];
  categoryId?: string;
  views?: number;
  favoritesCount?: number;
}

export default function DynamicPricingPage() {
  const user = useUserStore((state) => state.user);
  const navigate = useNavigate();
  const { adId } = useParams<{ adId?: string }>();
  const [recommendation, setRecommendation] = useState<PriceRecommendation | null>(null);
  const [ads, setAds] = useState<AdInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAdId, setSelectedAdId] = useState<string | null>(adId || null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (user?.telegramId) {
      fetchMyAds();
    }
  }, [user?.telegramId]);

  useEffect(() => {
    if (selectedAdId) {
      fetchPricing(selectedAdId);
    }
  }, [selectedAdId]);

  const fetchMyAds = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/dynamic-price/my-ads`, {
        headers: { 'x-telegram-id': String(user?.telegramId) },
      });
      if (!response.ok) throw new Error('Failed to fetch ads');
      const data = await response.json();
      const activeAds = (data.ads || []).map((ad: any) => ({
        _id: ad.adId,
        title: ad.title,
        price: ad.currentPrice,
        photos: ad.photo ? [ad.photo] : [],
      }));
      setAds(activeAds);
      if (adId && !selectedAdId) {
        setSelectedAdId(adId);
      } else if (activeAds.length > 0 && !selectedAdId) {
        setSelectedAdId(activeAds[0]._id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fetchPricing = async (id: string) => {
    try {
      setAnalyzing(true);
      setError(null);
      const response = await fetch(`/api/dynamic-price/analyze/${id}`, {
        headers: { 'x-telegram-id': String(user?.telegramId) },
      });
      if (!response.ok) throw new Error('Failed to analyze price');
      const data = await response.json();
      setRecommendation(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setAnalyzing(false);
    }
  };

  const applyPrice = async () => {
    if (!recommendation || !selectedAdId) return;
    try {
      setApplying(true);
      const response = await fetch(`/api/dynamic-price/apply/${selectedAdId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-id': String(user?.telegramId),
        },
        body: JSON.stringify({ newPrice: recommendation.recommendedPrice }),
      });
      if (!response.ok) throw new Error('Failed to apply price');
      fetchPricing(selectedAdId);
      fetchMyAds();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setApplying(false);
    }
  };

  if (!user) return <AuthScreen />;
  if (loading && ads.length === 0) return <PageLoader />;

  const selectedAd = ads.find(a => a._id === selectedAdId);

  const getActionColor = (action: string) => {
    switch (action) {
      case 'raise': return 'text-green-500';
      case 'lower': return 'text-orange-500';
      default: return 'text-blue-500';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'raise': return <TrendingUp className="w-5 h-5" />;
      case 'lower': return <TrendingDown className="w-5 h-5" />;
      default: return <CheckCircle className="w-5 h-5" />;
    }
  };

  const getMarketPositionLabel = (position: string) => {
    switch (position) {
      case 'below_market': return { label: 'Ниже рынка', color: 'bg-green-100 text-green-700' };
      case 'above_market': return { label: 'Выше рынка', color: 'bg-red-100 text-red-700' };
      default: return { label: 'Справедливая цена', color: 'bg-blue-100 text-blue-700' };
    }
  };

  const getUrgencyLabel = (urgency: string) => {
    switch (urgency) {
      case 'high': return { label: 'Срочно', color: 'bg-red-500' };
      case 'medium': return { label: 'Рекомендуется', color: 'bg-yellow-500' };
      default: return { label: 'Можно подождать', color: 'bg-gray-400' };
    }
  };

  const getFactorIcon = (factor: string) => {
    switch (factor) {
      case 'demand': return <TrendingUp className="w-4 h-4" />;
      case 'competition': return <Users className="w-4 h-4" />;
      case 'seasonality': return <Sun className="w-4 h-4" />;
      case 'timing': return <Clock className="w-4 h-4" />;
      case 'buyerActivity': return <Zap className="w-4 h-4" />;
      default: return <BarChart3 className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" data-testid="page-dynamic-pricing">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center p-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 -ml-2"
            data-testid="button-back"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="ml-2">
            <h1 className="text-lg font-bold">AI Динамическое ценообразование</h1>
            <p className="text-xs text-gray-500">Оптимизация цен на основе рынка</p>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {ads.length === 0 ? (
          <div className="bg-white rounded-xl p-6 text-center">
            <BarChart3 className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <h3 className="font-medium text-gray-700 mb-1">Нет активных объявлений</h3>
            <p className="text-sm text-gray-500 mb-4">
              Создайте объявление, чтобы получить рекомендации по цене
            </p>
            <Link 
              to="/create-ad"
              className="inline-block bg-blue-500 text-white px-4 py-2 rounded-lg"
              data-testid="link-create-ad"
            >
              Создать объявление
            </Link>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl p-4">
              <label className="text-sm text-gray-500 block mb-2">Выберите объявление</label>
              <select 
                value={selectedAdId || ''}
                onChange={(e) => setSelectedAdId(e.target.value)}
                className="w-full p-3 border rounded-lg bg-gray-50"
                data-testid="select-ad"
              >
                {ads.map(ad => (
                  <option key={ad._id} value={ad._id}>
                    {ad.title} — {ad.price?.toLocaleString()} руб.
                  </option>
                ))}
              </select>
            </div>

            {analyzing ? (
              <div className="bg-white rounded-xl p-6 text-center">
                <RefreshCw className="w-10 h-10 mx-auto text-blue-500 animate-spin mb-3" />
                <h3 className="font-medium text-gray-700">Анализ рынка...</h3>
                <p className="text-sm text-gray-500">
                  AI изучает спрос, конкурентов и сезонность
                </p>
              </div>
            ) : error ? (
              <div className="bg-red-50 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-red-700">Ошибка анализа</h3>
                  <p className="text-sm text-red-600">{error}</p>
                  <button 
                    onClick={() => selectedAdId && fetchPricing(selectedAdId)}
                    className="text-sm text-red-700 underline mt-2"
                    data-testid="button-retry"
                  >
                    Попробовать снова
                  </button>
                </div>
              </div>
            ) : recommendation ? (
              <>
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-4 text-white">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm opacity-80">Рекомендация AI</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${getUrgencyLabel(recommendation.urgency).color}`}>
                      {getUrgencyLabel(recommendation.urgency).label}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex-1">
                      <p className="text-xs opacity-70">Текущая цена</p>
                      <p className="text-xl font-bold">{recommendation.currentPrice.toLocaleString()} руб.</p>
                    </div>
                    <div className={`flex items-center ${getActionColor(recommendation.action)}`}>
                      {getActionIcon(recommendation.action)}
                    </div>
                    <div className="flex-1 text-right">
                      <p className="text-xs opacity-70">Рекомендуемая</p>
                      <p className="text-2xl font-bold">{recommendation.recommendedPrice.toLocaleString()} руб.</p>
                    </div>
                  </div>

                  {recommendation.action !== 'keep' && (
                    <div className="flex items-center justify-center gap-2 text-sm mb-4">
                      <span className={recommendation.priceChange > 0 ? 'text-green-200' : 'text-orange-200'}>
                        {recommendation.priceChange > 0 ? '+' : ''}{recommendation.priceChange.toLocaleString()} руб.
                      </span>
                      <span className="opacity-70">
                        ({recommendation.percentChange > 0 ? '+' : ''}{recommendation.percentChange.toFixed(1)}%)
                      </span>
                    </div>
                  )}

                  <p className="text-sm opacity-90 mb-4">{recommendation.reasoning}</p>

                  <div className="flex gap-3">
                    <button
                      onClick={applyPrice}
                      disabled={applying || recommendation.action === 'keep'}
                      className={`flex-1 py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${
                        recommendation.action === 'keep' 
                          ? 'bg-white/20 cursor-default' 
                          : 'bg-white text-blue-600 active:bg-gray-100'
                      }`}
                      data-testid="button-apply-price"
                    >
                      {applying ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : recommendation.action === 'keep' ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Цена оптимальна
                        </>
                      ) : (
                        <>
                          <DollarSign className="w-4 h-4" />
                          Применить цену
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => selectedAdId && fetchPricing(selectedAdId)}
                      className="p-3 bg-white/20 rounded-lg"
                      data-testid="button-refresh"
                    >
                      <RefreshCw className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">Позиция на рынке</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${getMarketPositionLabel(recommendation.marketPosition).color}`}>
                      {getMarketPositionLabel(recommendation.marketPosition).label}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Потенциальные покупатели</p>
                      <p className="text-lg font-bold text-blue-600">~{recommendation.potentialBuyers}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Уверенность AI</p>
                      <p className="text-lg font-bold text-green-600">{Math.round(recommendation.confidence * 100)}%</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-4">
                  <h3 className="font-medium mb-3">Факторы анализа</h3>
                  <div className="space-y-3">
                    {Object.entries(recommendation.factors).map(([key, factor]) => (
                      <div key={key} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                          {getFactorIcon(key)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{factor.label}</span>
                            <span className="text-xs text-gray-500">{Math.round(factor.score * 100)}%</span>
                          </div>
                          <p className="text-xs text-gray-500">{factor.description}</p>
                          <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 rounded-full transition-all"
                              style={{ width: `${factor.score * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-blue-50 rounded-xl p-4 flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-blue-700 text-sm">Как это работает?</h3>
                    <p className="text-xs text-blue-600 mt-1">
                      AI анализирует спрос в вашем регионе, цены конкурентов, сезонность, 
                      время суток и активность покупателей, чтобы предложить оптимальную цену 
                      для быстрой продажи с максимальной выгодой.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl p-6 text-center">
                <BarChart3 className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <h3 className="font-medium text-gray-700">Выберите объявление</h3>
                <p className="text-sm text-gray-500">
                  Для анализа цены и получения рекомендаций
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
