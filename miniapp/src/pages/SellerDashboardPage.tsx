import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Store, Eye, Users, Package, Phone, TrendingUp, 
  Plus, Settings, Star, BarChart3, MessageCircle,
  ChevronRight, Sparkles, Lightbulb, Edit, DollarSign, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { usePlatform } from '@/platform/PlatformProvider';

interface SellerAnalytics {
  storeViews: number;
  productViews: number;
  subscribersCount: number;
  productsCount: number;
  contactOpens: number;
  avgPrice: number;
  rating: number;
  reviewsCount: number;
  period: number;
  recentSubscribers: Array<{
    userId: { firstName?: string; lastName?: string; username?: string };
    createdAt: string;
  }>;
}

interface SellerProfile {
  _id: string;
  name: string;
  slug: string;
  avatar?: string;
  banner?: string;
  description?: string;
  isFarmer: boolean;
  subscribersCount: number;
  productsCount: number;
  ratings: { score: number; count: number };
  isVerified: boolean;
}

export default function SellerDashboardPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getAuthToken } = usePlatform();
  const [period, setPeriod] = useState(7);

  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['/api/seller-profile/my'],
    queryFn: async () => {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');
      
      const res = await fetch('/api/seller-profile/my', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load profile');
      return res.json();
    },
  });

  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['/api/seller-profile/my/analytics', period],
    queryFn: async () => {
      const token = await getAuthToken();
      if (!token || !profileData?.profile?._id) return null;
      
      const res = await fetch(`/api/seller-profile/${profileData.profile._id}/analytics?days=${period}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load analytics');
      return res.json();
    },
    enabled: !!profileData?.profile?._id,
  });

  const { data: aiTipsData } = useQuery({
    queryKey: ['/api/ai/seller-tips'],
    queryFn: async () => {
      const token = await getAuthToken();
      if (!token) return null;
      
      const res = await fetch('/api/ai/seller-tips', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!profileData?.hasStore,
  });

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-4">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!profileData?.hasStore) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 text-center">
            <Store className="w-16 h-16 mx-auto text-primary mb-4" />
            <h2 className="text-xl font-bold mb-2">Создайте свой магазин</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Объедините все ваши товары в одном месте, получайте подписчиков и продавайте больше
            </p>
            <Button 
              size="lg" 
              className="w-full"
              onClick={() => navigate('/profile')}
              data-testid="button-create-store"
            >
              <Plus className="w-5 h-5 mr-2" />
              Создать магазин
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const profile: SellerProfile = profileData.profile;
  const analytics: SellerAnalytics | null = analyticsData?.analytics || null;
  const tips = aiTipsData?.tips || [];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-card overflow-hidden shadow-md">
            {profile.avatar ? (
              <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary/10">
                <Store className="w-8 h-8 text-primary" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold" data-testid="text-store-name">
                {profile.name}
              </h1>
              {profile.isFarmer && (
                <Badge variant="secondary" className="text-xs">Фермер</Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {profile.subscribersCount}
              </span>
              <span className="flex items-center gap-1">
                <Package className="w-3.5 h-3.5" />
                {profile.productsCount}
              </span>
              {profile.ratings.count > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                  {profile.ratings.score}
                </span>
              )}
            </div>
          </div>
          <Button 
            size="icon" 
            variant="ghost"
            onClick={() => navigate('/profile')}
            data-testid="button-edit-store"
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex gap-2 mt-4">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => navigate(`/store/${profile.slug}`)}
            data-testid="button-view-store"
          >
            <Eye className="w-4 h-4 mr-2" />
            Витрина
          </Button>
          <Button 
            className="flex-1"
            onClick={() => navigate('/ads/create')}
            data-testid="button-add-product"
          >
            <Plus className="w-4 h-4 mr-2" />
            Добавить товар
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Статистика</h2>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {[7, 30].map(d => (
                <Button
                  key={d}
                  size="sm"
                  variant={period === d ? 'default' : 'outline'}
                  onClick={() => setPeriod(d)}
                  data-testid={`button-period-${d}`}
                >
                  {d} дней
                </Button>
              ))}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/seller/analytics')}
              data-testid="button-mega-analytics"
            >
              <BarChart3 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {analyticsLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : analytics ? (
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Eye className="w-4 h-4" />
                  <span className="text-xs">Просмотры</span>
                </div>
                <div className="text-2xl font-bold" data-testid="text-views">
                  {analytics.storeViews + analytics.productViews}
                </div>
                <div className="text-xs text-muted-foreground">
                  магазин: {analytics.storeViews}, товары: {analytics.productViews}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Users className="w-4 h-4" />
                  <span className="text-xs">Подписчики</span>
                </div>
                <div className="text-2xl font-bold" data-testid="text-subscribers">
                  {analytics.subscribersCount}
                </div>
                <div className="text-xs text-muted-foreground">
                  следят за вами
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Phone className="w-4 h-4" />
                  <span className="text-xs">Контакты</span>
                </div>
                <div className="text-2xl font-bold" data-testid="text-contacts">
                  {analytics.contactOpens}
                </div>
                <div className="text-xs text-muted-foreground">
                  открытий контактов
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Star className="w-4 h-4" />
                  <span className="text-xs">Рейтинг</span>
                </div>
                <div className="text-2xl font-bold" data-testid="text-rating">
                  {analytics.rating || '-'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {analytics.reviewsCount} отзывов
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {analytics?.recentSubscribers && analytics.recentSubscribers.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="w-4 h-4" />
                Новые подписчики
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {analytics.recentSubscribers.slice(0, 5).map((sub, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span>
                      {sub.userId?.firstName || sub.userId?.username || 'Пользователь'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(sub.createdAt).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {tips.length > 0 && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                AI-рекомендации
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {tips.map((tip: any, i: number) => (
                  <div key={i} className="flex items-start gap-3">
                    <Lightbulb className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm">{tip.text}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card 
          className="hover-elevate cursor-pointer bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-200" 
          onClick={() => navigate('/dynamic-pricing')}
          data-testid="card-dynamic-pricing"
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-medium flex items-center gap-2">
                  AI Ценообразование
                  <Badge variant="secondary" className="text-xs">NEW</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Оптимизируйте цены для быстрой продажи
                </div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card className="hover-elevate cursor-pointer" onClick={() => navigate('/my-ads')}>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-primary" />
              <div>
                <div className="font-medium">Мои товары</div>
                <div className="text-xs text-muted-foreground">
                  {profile.productsCount} активных
                </div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card className="hover-elevate cursor-pointer" onClick={() => navigate('/conversations')}>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-5 h-5 text-primary" />
              <div>
                <div className="font-medium">Сообщения</div>
                <div className="text-xs text-muted-foreground">
                  Чаты с покупателями
                </div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
