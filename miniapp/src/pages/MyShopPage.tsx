import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  BadgePercent,
  CheckCircle2,
  Package,
  Plus,
  Sparkles,
  Store,
  TrendingUp,
  UserRound,
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
  const [showProModal, setShowProModal] = useState(false);
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
              <TabsTrigger value="products">Товары</TabsTrigger>
              <TabsTrigger value="stats">Статистика</TabsTrigger>
              <TabsTrigger value="profile">Профиль магазина</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      <main className="px-4 pt-4">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
          <TabsContent value="products" className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold">Мои товары</h2>
              <Button size="sm" onClick={() => navigate('/ads/create')}>
                <Plus className="h-4 w-4 mr-1" />
                Добавить
              </Button>
            </div>

            <div className="flex gap-2 overflow-x-auto">
              {(
                [
                  { id: 'active', label: `Активные (${counts.active})` },
                  { id: 'draft', label: `Черновики (${counts.draft})` },
                  { id: 'expired', label: `Истекшие (${counts.expired})` },
                ] as const
              ).map((filter) => (
                <Button
                  key={filter.id}
                  size="sm"
                  variant={statusFilter === filter.id ? 'default' : 'outline'}
                  onClick={() => setStatusFilter(filter.id)}
                >
                  {filter.label}
                </Button>
              ))}
            </div>

            {productsQuery.isLoading ? (
              <div className="grid gap-3">
                {[1, 2, 3].map((item) => (
                  <Card key={item} className="p-4 animate-pulse bg-muted" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  Пока нет товаров в этом статусе
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {products.map((product) => (
                  <Card key={product.id} className="shadow-sm">
                    <CardContent className="flex gap-3 p-4">
                      <div className="h-20 w-20 overflow-hidden rounded-lg bg-muted">
                        <img
                          src={product.preview ? getThumbnailUrl(product.preview) : NO_PHOTO_PLACEHOLDER}
                          alt={product.title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm font-semibold leading-tight line-clamp-2">
                            {product.title}
                          </h3>
                          <Badge className={statusLabels[product.status].color}>
                            {statusLabels[product.status].label}
                          </Badge>
                        </div>
                        <p className="mt-1 text-primary font-semibold">
                          {product.price.toLocaleString()} {product.currency || '₽'}
                        </p>
                        {product.description && (
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                            {product.description}
                          </p>
                        )}
                        <div className="mt-2 text-xs text-muted-foreground">
                          Обновлено: {product.createdAt ? new Date(product.createdAt).toLocaleDateString() : '—'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <Button
              className="fixed bottom-24 right-4 h-14 w-14 rounded-full shadow-lg"
              onClick={() => navigate('/ads/create')}
              aria-label="Добавить объявление"
            >
              <Plus className="h-6 w-6" />
            </Button>
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Мои показатели</p>
                <h2 className="text-lg font-semibold">Статистика товаров</h2>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowProModal(true)}>
                <Sparkles className="h-4 w-4 mr-1" />
                PRO-аналитика (скоро)
              </Button>
            </div>

            {statsQuery.isLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((item) => (
                  <Card key={item} className="h-24 animate-pulse bg-muted" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  title="Товаров всего"
                  value={stats?.totalProducts ?? 0}
                  icon={<Package className="h-4 w-4 text-primary" />}
                />
                <StatCard
                  title="Активные"
                  value={stats?.activeProducts ?? 0}
                  icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                />
                <StatCard
                  title="Истекшие"
                  value={stats?.expiredProducts ?? 0}
                  icon={<BadgePercent className="h-4 w-4 text-amber-600" />}
                />
                <StatCard
                  title="Просмотры"
                  value={stats?.totalViews ?? 0}
                  icon={<TrendingUp className="h-4 w-4 text-blue-600" />}
                />
                <StatCard
                  title="В избранном"
                  value={stats?.totalFavorites ?? 0}
                  icon={<Sparkles className="h-4 w-4 text-purple-600" />}
                />
              </div>
            )}

            {showProModal && (
              <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 px-4">
                <Card className="max-w-sm w-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      PRO-кабинет в разработке
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Скоро здесь появится расширенная аналитика по рынку, конкурентам и рекомендации.
                    </p>
                    <Button className="w-full" onClick={() => setShowProModal(false)}>
                      Понятно
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="profile" className="space-y-4">
            <div className="flex items-center gap-3">
              <UserRound className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Основная информация</p>
                <h2 className="text-lg font-semibold">Профиль магазина</h2>
              </div>
            </div>

            <Card>
              <CardContent className="space-y-4 p-4">
                <div className="grid gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="shop-name">Название магазина</Label>
                    <Input
                      id="shop-name"
                      value={profileForm.name || ''}
                      onChange={(e) => handleProfileChange('name', e.target.value)}
                      placeholder="Ваше название"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="shop-description">Описание магазина</Label>
                    <Textarea
                      id="shop-description"
                      value={profileForm.description || ''}
                      onChange={(e) => handleProfileChange('description', e.target.value)}
                      placeholder="Расскажите о товарах и преимуществах"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="shop-address">Адрес</Label>
                    <Input
                      id="shop-address"
                      value={profileForm.address || ''}
                      onChange={(e) => handleProfileChange('address', e.target.value)}
                      placeholder="Город, улица, дом"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="shop-instagram">Instagram</Label>
                    <Input
                      id="shop-instagram"
                      value={profileForm.instagram || ''}
                      onChange={(e) => handleProfileChange('instagram', e.target.value)}
                      placeholder="@username или ссылка"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="shop-phone">Телефон</Label>
                    <Input
                      id="shop-phone"
                      value={profileForm.phone || ''}
                      onChange={(e) => handleProfileChange('phone', e.target.value)}
                      placeholder="+7 (999) 123-45-67"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="shop-telegram">Telegram</Label>
                    <Input
                      id="shop-telegram"
                      value={profileForm.messengers?.telegram || ''}
                      onChange={(e) => handleMessengerChange('telegram', e.target.value)}
                      placeholder="@username"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="shop-whatsapp">WhatsApp</Label>
                    <Input
                      id="shop-whatsapp"
                      value={profileForm.messengers?.whatsapp || ''}
                      onChange={(e) => handleMessengerChange('whatsapp', e.target.value)}
                      placeholder="Номер или ссылка"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="shop-viber">Viber</Label>
                    <Input
                      id="shop-viber"
                      value={profileForm.messengers?.viber || ''}
                      onChange={(e) => handleMessengerChange('viber', e.target.value)}
                      placeholder="Номер или ссылка"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Telegram username</Label>
                    <Input value={profile?.telegramUsername || ''} disabled />
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={handleSaveProfile}
                  disabled={updateProfileMutation.isPending || profileQuery.isLoading}
                >
                  {updateProfileMutation.isPending ? 'Сохранение…' : 'Сохранить'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number | string;
  icon: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <div className="text-2xl font-semibold mt-1">{value}</div>
          </div>
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
