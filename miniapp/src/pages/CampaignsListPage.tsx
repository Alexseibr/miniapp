import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Flower2,
  Gift,
  Wheat,
  Store,
  Calendar,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

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
  march8_tulips: <Flower2 className="w-8 h-8 text-pink-500" />,
  newyear_fair: <Gift className="w-8 h-8 text-red-500" />,
  autumn_fair: <Wheat className="w-8 h-8 text-amber-600" />,
};

const CAMPAIGN_BG: Record<string, string> = {
  march8_tulips: 'bg-gradient-to-br from-pink-500/10 to-rose-500/10',
  newyear_fair: 'bg-gradient-to-br from-red-500/10 to-green-500/10',
  autumn_fair: 'bg-gradient-to-br from-amber-500/10 to-orange-500/10',
};

export default function CampaignsListPage() {
  const [, navigate] = useLocation();

  const { data, isLoading } = useQuery<{ success: boolean; data: Campaign[] }>({
    queryKey: ['/api/campaign-analytics/campaigns'],
  });

  const campaigns = data?.data || [];
  const activeCampaigns = campaigns.filter(c => c.isActive);
  const pastCampaigns = campaigns.filter(c => !c.isActive);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
    });
  };

  const getCampaignIcon = (code: string) => {
    return CAMPAIGN_ICONS[code] || <Store className="w-8 h-8 text-primary" />;
  };

  const getCampaignBg = (code: string) => {
    return CAMPAIGN_BG[code] || 'bg-gradient-to-br from-primary/10 to-primary/5';
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'store': return 'Магазины';
      case 'farmer': return 'Фермеры';
      default: return 'Все';
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold">Ярмарки и акции</h1>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-6">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <Skeleton className="w-16 h-16 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-2">Нет активных кампаний</h3>
            <p className="text-sm text-muted-foreground">
              Сейчас нет доступных ярмарок и акций
            </p>
          </div>
        ) : (
          <>
            {activeCampaigns.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Активные
                </h2>
                <div className="space-y-3">
                  {activeCampaigns.map((campaign) => (
                    <Card
                      key={campaign.code}
                      className={`${getCampaignBg(campaign.code)} border-0 hover-elevate cursor-pointer`}
                      onClick={() => navigate(`/campaigns/${campaign.code}`)}
                      data-testid={`card-campaign-${campaign.code}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          <div className="w-16 h-16 rounded-lg bg-background/50 flex items-center justify-center">
                            {getCampaignIcon(campaign.code)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-semibold" data-testid={`text-title-${campaign.code}`}>
                                {campaign.title}
                              </h3>
                              <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                            </div>
                            {campaign.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                {campaign.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="secondary" className="text-xs">
                                {getTypeLabel(campaign.type)}
                              </Badge>
                              {campaign.startDate && campaign.endDate && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(campaign.startDate)} — {formatDate(campaign.endDate)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {pastCampaigns.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-3 text-muted-foreground">
                  Прошедшие
                </h2>
                <div className="space-y-3">
                  {pastCampaigns.map((campaign) => (
                    <Card
                      key={campaign.code}
                      className="opacity-60 cursor-pointer"
                      onClick={() => navigate(`/campaigns/${campaign.code}`)}
                      data-testid={`card-campaign-${campaign.code}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                            {getCampaignIcon(campaign.code)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h3 className="font-medium">{campaign.title}</h3>
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDate(campaign.startDate)} — {formatDate(campaign.endDate)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
