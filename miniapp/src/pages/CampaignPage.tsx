import { useState, useMemo } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  MapPin,
  ArrowLeft,
  Flower2,
  Gift,
  Wheat,
  Store,
  ChevronRight,
} from 'lucide-react';

interface CampaignAd {
  adId: string;
  title: string;
  price: number;
  currency: string;
  mainPhotoUrl?: string;
  storeName?: string;
  storeSlug?: string;
  city?: string;
  distanceKm?: number;
}

interface CampaignData {
  ads: CampaignAd[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

interface Campaign {
  code: string;
  title: string;
  description?: string;
  type: 'store' | 'farmer' | 'both';
  startDate?: string;
  endDate?: string;
  isActive: boolean;
}

const CAMPAIGN_ICONS: Record<string, JSX.Element> = {
  march8_tulips: <Flower2 className="w-6 h-6 text-pink-500" />,
  newyear_fair: <Gift className="w-6 h-6 text-red-500" />,
  autumn_fair: <Wheat className="w-6 h-6 text-amber-600" />,
};

const CAMPAIGN_COLORS: Record<string, string> = {
  march8_tulips: 'from-pink-500/20 to-rose-500/20',
  newyear_fair: 'from-red-500/20 to-green-500/20',
  autumn_fair: 'from-amber-500/20 to-orange-500/20',
};

export default function CampaignPage() {
  const [, params] = useRoute('/campaigns/:campaignCode');
  const campaignCode = params?.campaignCode;
  const [, navigate] = useLocation();
  const [sort, setSort] = useState<string>('popular');
  const [page, setPage] = useState(1);

  const { data: campaignsData } = useQuery<{ success: boolean; data: Campaign[] }>({
    queryKey: ['/api/campaign-analytics/campaigns'],
  });

  const campaign = useMemo(() => {
    return campaignsData?.data?.find(c => c.code === campaignCode);
  }, [campaignsData, campaignCode]);

  const { data: adsData, isLoading } = useQuery<{ success: boolean; data: CampaignData }>({
    queryKey: ['/api/campaign-analytics/ads', { campaignCode, sort, page }],
    enabled: !!campaignCode,
  });

  const ads = adsData?.data?.ads || [];
  const hasMore = adsData?.data?.hasMore || false;
  const total = adsData?.data?.total || 0;

  const formatPrice = (price: number, currency: string) => {
    if (currency === 'RUB') {
      return `${price.toLocaleString('ru-RU')} ₽`;
    }
    return `${price.toLocaleString('ru-RU')} ${currency}`;
  };

  const campaignIcon = campaignCode ? CAMPAIGN_ICONS[campaignCode] : <Store className="w-6 h-6" />;
  const bgGradient = campaignCode ? CAMPAIGN_COLORS[campaignCode] : 'from-primary/20 to-primary/10';

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className={`bg-gradient-to-br ${bgGradient} p-4 pb-6`}>
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            {campaignIcon}
            <h1 className="text-xl font-bold" data-testid="text-campaign-title">
              {campaign?.title || campaignCode}
            </h1>
          </div>
        </div>

        {campaign?.description && (
          <p className="text-sm text-muted-foreground mb-4" data-testid="text-campaign-description">
            {campaign.description}
          </p>
        )}

        <div className="flex items-center gap-2">
          <Badge variant="secondary" data-testid="badge-total">
            {total} товаров
          </Badge>
          {campaign?.isActive && (
            <Badge variant="default" className="bg-green-500" data-testid="badge-active">
              Активна
            </Badge>
          )}
        </div>
      </div>

      <div className="p-4 border-b bg-card">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">Сортировка:</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2 rounded-md border bg-background text-sm"
            data-testid="select-sort"
          >
            <option value="popular">Популярные</option>
            <option value="price">Дешевле</option>
            <option value="newest">Новые</option>
          </select>
        </div>
      </div>

      <div className="flex-1 p-4">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <Skeleton className="aspect-square w-full" />
                <CardContent className="p-3">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-5 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : ads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              {campaignIcon}
            </div>
            <h3 className="font-medium mb-2">Пока нет товаров</h3>
            <p className="text-sm text-muted-foreground">
              В этой кампании ещё нет объявлений
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {ads.map((ad) => (
                <Card
                  key={ad.adId}
                  className="overflow-hidden hover-elevate cursor-pointer"
                  onClick={() => navigate(`/ads/${ad.adId}`)}
                  data-testid={`card-ad-${ad.adId}`}
                >
                  <div className="aspect-square bg-muted relative">
                    {ad.mainPhotoUrl ? (
                      <img
                        src={ad.mainPhotoUrl}
                        alt={ad.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Store className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    {ad.distanceKm && (
                      <Badge
                        variant="secondary"
                        className="absolute bottom-2 left-2 text-xs"
                      >
                        <MapPin className="w-3 h-3 mr-1" />
                        {ad.distanceKm} км
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <p className="text-sm line-clamp-2 mb-1" data-testid={`text-title-${ad.adId}`}>
                      {ad.title}
                    </p>
                    <p className="font-bold text-lg" data-testid={`text-price-${ad.adId}`}>
                      {formatPrice(ad.price, ad.currency)}
                    </p>
                    {ad.storeName && (
                      <div
                        className="flex items-center gap-1 text-xs text-muted-foreground mt-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (ad.storeSlug) navigate(`/store/${ad.storeSlug}`);
                        }}
                      >
                        <Store className="w-3 h-3" />
                        <span className="truncate">{ad.storeName}</span>
                        <ChevronRight className="w-3 h-3" />
                      </div>
                    )}
                    {ad.city && !ad.storeName && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {ad.city}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {hasMore && (
              <div className="mt-4 flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => setPage(p => p + 1)}
                  data-testid="button-load-more"
                >
                  Загрузить ещё
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
