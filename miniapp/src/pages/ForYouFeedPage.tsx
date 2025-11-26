import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { 
  Heart, MessageCircle, Share2, MapPin, ChevronDown, 
  ChevronUp, Sparkles, X, Filter, RefreshCw, Grid, Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserStore } from '@/store/useUserStore';
import FavoriteButton from '@/components/FavoriteButton';
import LazyImage from '@/components/LazyImage';

interface Ad {
  _id: string;
  title: string;
  price: number;
  photos?: string[];
  categoryId?: string;
  location?: { lat: number; lng: number; address?: string };
  description?: string;
  sellerTelegramId?: number;
  viewsCount?: number;
}

interface AdScore {
  adId: string;
  score: number;
  reasons: string[];
}

interface AiInsight {
  type: string;
  icon: string;
  text: string;
}

interface FeedResponse {
  success: boolean;
  items: Ad[];
  scores: AdScore[];
  cursor: number;
  hasMore: boolean;
  aiInsights?: AiInsight[];
  total: number;
}

export default function ForYouFeedPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useUserStore((state) => state.user);
  const telegramId = user?.telegramId;

  const [items, setItems] = useState<Ad[]>([]);
  const [scores, setScores] = useState<AdScore[]>([]);
  const [aiInsights, setAiInsights] = useState<AiInsight[]>([]);
  const [cursor, setCursor] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'swipe' | 'grid'>('swipe');
  const [geoLocation, setGeoLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showInsight, setShowInsight] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const radiusKm = parseFloat(searchParams.get('radius') || '10');

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGeoLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          setGeoLocation({ lat: 52.0975, lng: 23.6877 });
        }
      );
    } else {
      setGeoLocation({ lat: 52.0975, lng: 23.6877 });
    }
  }, []);

  const fetchFeed = useCallback(async (reset = false) => {
    if (!geoLocation) return;
    
    try {
      if (reset) {
        setLoading(true);
        setCursor(0);
      } else {
        setLoadingMore(true);
      }

      const params = new URLSearchParams({
        lat: String(geoLocation.lat),
        lng: String(geoLocation.lng),
        radiusKm: String(radiusKm),
        cursor: String(reset ? 0 : cursor),
        limit: '20',
      });

      const response = await fetch(`/api/recommendations/feed?${params}`, {
        headers: telegramId ? { 'x-telegram-id': String(telegramId) } : {},
      });

      const data: FeedResponse = await response.json();

      if (data.success) {
        if (reset) {
          setItems(data.items);
          setScores(data.scores);
          setCurrentIndex(0);
        } else {
          setItems(prev => [...prev, ...data.items]);
          setScores(prev => [...prev, ...data.scores]);
        }
        setCursor(data.cursor);
        setHasMore(data.hasMore);
        if (data.aiInsights) {
          setAiInsights(data.aiInsights);
        }
      }
    } catch (error) {
      console.error('Feed fetch error:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [geoLocation, cursor, radiusKm, telegramId]);

  useEffect(() => {
    if (geoLocation) {
      fetchFeed(true);
    }
  }, [geoLocation]);

  const handleSwipe = (direction: 'up' | 'down') => {
    if (direction === 'up' && currentIndex < items.length - 1) {
      setCurrentIndex(prev => prev + 1);
      
      if (currentIndex >= items.length - 5 && hasMore && !loadingMore) {
        fetchFeed(false);
      }
    } else if (direction === 'down' && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y < -50) {
      handleSwipe('up');
    } else if (info.offset.y > 50) {
      handleSwipe('down');
    }
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      handleSwipe('down');
    } else if (e.key === 'ArrowDown') {
      handleSwipe('up');
    }
  }, [currentIndex, items.length]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const trackView = async (adId: string, categoryId?: string) => {
    try {
      await fetch('/api/recommendations/track', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(telegramId ? { 'x-telegram-id': String(telegramId) } : {}),
        },
        body: JSON.stringify({
          telegramId,
          action: 'view',
          adId,
          categoryId,
        }),
      });
    } catch (error) {
      console.error('Track view error:', error);
    }
  };

  useEffect(() => {
    if (items[currentIndex]) {
      trackView(items[currentIndex]._id, items[currentIndex].categoryId);
    }
  }, [currentIndex, items]);

  const currentAd = items[currentIndex];
  const currentScore = scores.find(s => s.adId === currentAd?._id);
  const currentInsight = aiInsights[currentIndex % aiInsights.length];

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
          <p className="text-white/60">Подбираем товары для вас...</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <header className="flex items-center justify-between p-4 border-b">
          <h1 className="text-lg font-bold">For You</h1>
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <X className="w-5 h-5" />
          </Button>
        </header>
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-4">
            <Sparkles className="w-16 h-16 mx-auto text-muted-foreground" />
            <p className="font-medium">Нет товаров для показа</p>
            <p className="text-sm text-muted-foreground">Попробуйте изменить радиус поиска</p>
            <Button onClick={() => fetchFeed(true)}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Обновить
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === 'grid') {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
          <div className="flex items-center justify-between p-4">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              For You
            </h1>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setViewMode('swipe')}
                data-testid="button-view-swipe"
              >
                <Layers className="w-5 h-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate(-1)}
                data-testid="button-close"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </header>

        {aiInsights.length > 0 && showInsight && (
          <div className="p-4">
            <div className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 rounded-xl p-3 flex items-center gap-3">
              <span className="text-2xl">{currentInsight?.icon}</span>
              <p className="text-sm flex-1">{currentInsight?.text}</p>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                onClick={() => setShowInsight(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 p-2">
          {items.map((ad, index) => (
            <motion.div
              key={ad._id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="relative aspect-square rounded-xl overflow-hidden bg-muted cursor-pointer"
              onClick={() => {
                setCurrentIndex(index);
                setViewMode('swipe');
              }}
              data-testid={`card-ad-${ad._id}`}
            >
              {ad.photos?.[0] ? (
                <LazyImage
                  src={ad.photos[0]}
                  alt={ad.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-gray-400" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="text-white font-bold text-lg">{ad.price} руб.</p>
                <p className="text-white/80 text-xs truncate">{ad.title}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {hasMore && (
          <div className="p-4 flex justify-center">
            <Button 
              variant="outline" 
              onClick={() => fetchFeed(false)}
              disabled={loadingMore}
            >
              {loadingMore ? 'Загрузка...' : 'Показать ещё'}
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 bg-black overflow-hidden"
      data-testid="foryou-feed"
    >
      <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-white/20 text-white border-0">
            <Sparkles className="w-3 h-3 mr-1" />
            For You
          </Badge>
          <Badge variant="secondary" className="bg-white/20 text-white border-0">
            {currentIndex + 1} / {items.length}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20"
            onClick={() => setViewMode('grid')}
            data-testid="button-view-grid"
          >
            <Grid className="w-5 h-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20"
            onClick={() => navigate(-1)}
            data-testid="button-close-feed"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {currentIndex > 0 && (
        <button
          className="absolute top-20 left-1/2 -translate-x-1/2 z-20 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white"
          onClick={() => handleSwipe('down')}
          data-testid="button-prev"
        >
          <ChevronUp className="w-6 h-6" />
        </button>
      )}

      <AnimatePresence mode="wait">
        {currentAd && (
          <motion.div
            key={currentAd._id}
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -100 }}
            transition={{ type: 'spring', damping: 25 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            onDragEnd={handleDragEnd}
            className="absolute inset-0"
          >
            <div className="relative h-full w-full">
              {currentAd.photos?.[0] ? (
                <img
                  src={currentAd.photos[0]}
                  alt={currentAd.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                  <Sparkles className="w-20 h-20 text-gray-600" />
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              <div className="absolute bottom-0 left-0 right-16 p-6 pb-24">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <h2 className="text-white text-xl font-bold mb-2">{currentAd.title}</h2>
                  
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-white text-2xl font-bold">{currentAd.price} руб.</span>
                    {currentScore && currentScore.reasons.length > 0 && (
                      <Badge className="bg-violet-500/80 text-white border-0">
                        {currentScore.reasons[0]}
                      </Badge>
                    )}
                  </div>

                  {currentAd.location?.address && (
                    <div className="flex items-center gap-2 text-white/70 text-sm mb-3">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">{currentAd.location.address}</span>
                    </div>
                  )}

                  {currentAd.description && (
                    <p className="text-white/80 text-sm line-clamp-2 mb-4">
                      {currentAd.description}
                    </p>
                  )}

                  <Button 
                    className="w-full"
                    onClick={() => navigate(`/ad/${currentAd._id}`)}
                    data-testid="button-view-ad"
                  >
                    Подробнее
                  </Button>
                </motion.div>
              </div>

              <div className="absolute right-4 bottom-32 flex flex-col gap-4 items-center">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-col items-center gap-1"
                >
                  <FavoriteButton 
                    adId={currentAd._id}
                    className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center"
                    iconClassName="w-6 h-6 text-white"
                  />
                  <span className="text-white text-xs">Избранное</span>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex flex-col items-center gap-1"
                >
                  <button 
                    className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center"
                    onClick={() => navigate(`/ad/${currentAd._id}`)}
                    data-testid="button-contact"
                  >
                    <MessageCircle className="w-6 h-6 text-white" />
                  </button>
                  <span className="text-white text-xs">Контакт</span>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex flex-col items-center gap-1"
                >
                  <button 
                    className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center"
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: currentAd.title,
                          url: `${window.location.origin}/ad/${currentAd._id}`,
                        });
                      }
                    }}
                    data-testid="button-share"
                  >
                    <Share2 className="w-6 h-6 text-white" />
                  </button>
                  <span className="text-white text-xs">Поделиться</span>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {currentIndex < items.length - 1 && (
        <button
          className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white animate-bounce"
          onClick={() => handleSwipe('up')}
          data-testid="button-next"
        >
          <ChevronDown className="w-6 h-6" />
        </button>
      )}

      {loadingMore && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
          <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {currentInsight && showInsight && currentIndex === 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-20 left-4 right-4 z-20"
        >
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-3 flex items-center gap-3">
            <span className="text-2xl">{currentInsight.icon}</span>
            <p className="text-white text-sm flex-1">{currentInsight.text}</p>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 text-white hover:bg-white/20"
              onClick={() => setShowInsight(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
