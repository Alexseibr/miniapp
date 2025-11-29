import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Package,
  Plus,
  Store,
  TrendingUp,
  UserRound,
  Eye,
  Heart,
  CheckCircle2,
  Clock,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getThumbnailUrl, NO_PHOTO_PLACEHOLDER } from '@/constants/placeholders';
import {
  getMyShopProducts,
  getMyShopProfile,
  getMyShopStats,
  updateMyShopProfile,
} from '@/api/myShop';
import type { MyShopProduct, MyShopProfile } from '@/types/myShop';

const statusLabels: Record<MyShopProduct['status'], { label: string; color: string }> = {
  active: { label: 'Активно', color: 'bg-emerald-100 text-emerald-700' },
  draft: { label: 'Черновик', color: 'bg-amber-100 text-amber-700' },
  expired: { label: 'Истекло', color: 'bg-slate-100 text-slate-700' },
};

export default function MyShopPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'products' | 'stats' | 'profile'>('products');
  const [statusFilter, setStatusFilter] = useState<'active' | 'draft' | 'expired'>('active');
  const [profileForm, setProfileForm] = useState<Partial<MyShopProfile>>({});

  const productsQuery = useQuery({
    queryKey: ['my-shop-products', statusFilter],
    queryFn: () => getMyShopProducts(statusFilter),
  });

  const statsQuery = useQuery({
    queryKey: ['my-shop-stats'],
    queryFn: getMyShopStats,
  });

  const profileQuery = useQuery({
    queryKey: ['my-shop-profile'],
    queryFn: getMyShopProfile,
  });

  useEffect(() => {
    if (profileQuery.data?.profile) {
      setProfileForm(profileQuery.data.profile);
    }
  }, [profileQuery.data?.profile]);

  const updateProfileMutation = useMutation({
    mutationFn: updateMyShopProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-shop-profile'] });
      toast({ title: 'Изменения сохранены' });
    },
    onError: () => {
      toast({ title: 'Не удалось сохранить профиль', variant: 'destructive' });
    },
  });

  const counts = useMemo(
    () => productsQuery.data?.counts || { active: 0, draft: 0, expired: 0 },
    [productsQuery.data?.counts],
  );

  const products = productsQuery.data?.items || [];
  const stats = statsQuery.data?.stats;
  const profile = profileQuery.data?.profile;

  const handleProfileChange = (field: keyof MyShopProfile, value: string | null) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleMessengerChange = (field: 'telegram' | 'viber' | 'whatsapp', value: string) => {
    setProfileForm((prev) => ({
      ...prev,
      messengers: {
        ...(prev.messengers || {}),
        [field]: value,
      },
    }));
  };

  const handleSaveProfile = () => {
    updateProfileMutation.mutate(profileForm);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-20 bg-background/90 backdrop-blur border-b">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            aria-label="Назад"
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">Мой магазин</h1>
            </div>
            <p className="text-xs text-muted-foreground">Управление товарами и статистикой</p>
          </div>
        </div>
        <div className="px-4 pb-2 pt-1">
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as typeof activeTab)}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="products" className="gap-1" data-testid="tab-products">
                <Package className="h-4 w-4" />
                Товары
              </TabsTrigger>
              <TabsTrigger value="stats" className="gap-1" data-testid="tab-stats">
                <TrendingUp className="h-4 w-4" />
                Статистика
              </TabsTrigger>
              <TabsTrigger value="profile" className="gap-1" data-testid="tab-profile">
                <UserRound className="h-4 w-4" />
                Профиль
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      <main className="px-4 pt-4">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
          <TabsContent value="products" className="mt-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2">
                {(['active', 'draft', 'expired'] as const).map((status) => (
                  <Button
                    key={status}
                    variant={statusFilter === status ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter(status)}
                    data-testid={`filter-${status}`}
                  >
                    {statusLabels[status].label} ({counts[status]})
                  </Button>
                ))}
              </div>
            </div>

            <Button
              onClick={() => navigate('/create')}
              className="w-full mb-4"
              data-testid="button-add-product"
            >
              <Plus className="h-4 w-4 mr-2" />
              Добавить товар
            </Button>

            {productsQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : products.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    {statusFilter === 'active'
                      ? 'У вас пока нет активных товаров'
                      : statusFilter === 'draft'
                      ? 'Нет черновиков'
                      : 'Нет истёкших объявлений'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {products.map((product) => (
                  <Card
                    key={product.id}
                    className="overflow-hidden cursor-pointer hover-elevate"
                    onClick={() => navigate(`/ad/${product.id}`)}
                    data-testid={`product-card-${product.id}`}
                  >
                    <div className="flex gap-3 p-3">
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        <img
                          src={product.preview ? getThumbnailUrl(product.preview) : NO_PHOTO_PLACEHOLDER}
                          alt={product.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-medium text-sm line-clamp-2">{product.title}</h3>
                          <Badge className={statusLabels[product.status].color} variant="secondary">
                            {statusLabels[product.status].label}
                          </Badge>
                        </div>
                        <p className="text-lg font-bold text-primary mt-1">
                          {product.price} {product.currency || 'BYN'}
                        </p>
                        {product.expiresAt && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Clock className="h-3 w-3" />
                            До {new Date(product.expiresAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="stats" className="mt-0">
            {statsQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : stats ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Всего товаров
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{stats.totalProducts}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        Активных
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-emerald-600">{stats.activeProducts}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Просмотры
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{stats.totalViews || 0}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Heart className="h-4 w-4 text-rose-500" />
                        В избранном
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-rose-600">{stats.totalFavorites || 0}</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Сводка
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Истёкших объявлений</span>
                        <span className="font-medium">{stats.expiredProducts}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Конверсия в избранное</span>
                        <span className="font-medium">
                          {stats.totalViews && stats.totalViews > 0
                            ? ((stats.totalFavorites || 0) / stats.totalViews * 100).toFixed(1)
                            : 0}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Не удалось загрузить статистику
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="profile" className="mt-0">
            {profileQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Основная информация</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="name">Название магазина</Label>
                      <Input
                        id="name"
                        value={profileForm.name || ''}
                        onChange={(e) => handleProfileChange('name', e.target.value)}
                        placeholder="Мой магазин"
                        data-testid="input-name"
                      />
                    </div>

                    <div>
                      <Label htmlFor="description">Описание</Label>
                      <Textarea
                        id="description"
                        value={profileForm.description || ''}
                        onChange={(e) => handleProfileChange('description', e.target.value)}
                        placeholder="Расскажите о своём магазине"
                        rows={3}
                        data-testid="input-description"
                      />
                    </div>

                    <div>
                      <Label htmlFor="address">Адрес</Label>
                      <Input
                        id="address"
                        value={profileForm.address || ''}
                        onChange={(e) => handleProfileChange('address', e.target.value)}
                        placeholder="г. Минск, ул. Примерная, 1"
                        data-testid="input-address"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Контакты</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="phone">Телефон</Label>
                      <Input
                        id="phone"
                        value={profileForm.phone || ''}
                        onChange={(e) => handleProfileChange('phone', e.target.value)}
                        placeholder="+375 29 123 45 67"
                        data-testid="input-phone"
                      />
                    </div>

                    <div>
                      <Label htmlFor="instagram">Instagram</Label>
                      <Input
                        id="instagram"
                        value={profileForm.instagram || ''}
                        onChange={(e) => handleProfileChange('instagram', e.target.value)}
                        placeholder="@username"
                        data-testid="input-instagram"
                      />
                    </div>

                    <div>
                      <Label htmlFor="telegram">Telegram</Label>
                      <Input
                        id="telegram"
                        value={profileForm.messengers?.telegram || ''}
                        onChange={(e) => handleMessengerChange('telegram', e.target.value)}
                        placeholder="@username"
                        data-testid="input-telegram"
                      />
                    </div>

                    <div>
                      <Label htmlFor="viber">Viber</Label>
                      <Input
                        id="viber"
                        value={profileForm.messengers?.viber || ''}
                        onChange={(e) => handleMessengerChange('viber', e.target.value)}
                        placeholder="+375 29 123 45 67"
                        data-testid="input-viber"
                      />
                    </div>

                    <div>
                      <Label htmlFor="whatsapp">WhatsApp</Label>
                      <Input
                        id="whatsapp"
                        value={profileForm.messengers?.whatsapp || ''}
                        onChange={(e) => handleMessengerChange('whatsapp', e.target.value)}
                        placeholder="+375 29 123 45 67"
                        data-testid="input-whatsapp"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Button
                  onClick={handleSaveProfile}
                  className="w-full"
                  disabled={updateProfileMutation.isPending}
                  data-testid="button-save-profile"
                >
                  {updateProfileMutation.isPending ? 'Сохранение...' : 'Сохранить изменения'}
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
