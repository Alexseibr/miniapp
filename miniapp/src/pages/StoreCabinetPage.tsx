import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Store, Eye, Package, Phone, Plus, Settings, ChevronRight, 
  Heart, EyeOff, Pencil, Camera, Upload, TrendingUp, 
  MapPin, Send, Check, X, Loader2, ExternalLink, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { usePlatform } from '@/platform/PlatformProvider';
import { getThumbnailUrl, NO_PHOTO_PLACEHOLDER } from '@/constants/placeholders';

const inputClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
const textareaClass = "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
const labelClass = "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70";

interface SellerProfile {
  _id: string;
  name: string;
  slug: string;
  avatar?: string;
  banner?: string;
  description?: string;
  isFarmer: boolean;
  phone?: string;
  telegramUsername?: string;
  city?: string;
  region?: string;
  showPhone: boolean;
  subscribersCount: number;
  productsCount: number;
  ratings: { score: number; count: number };
  isVerified: boolean;
}

interface StoreStats {
  totalAds: number;
  activeAds: number;
  hiddenAds: number;
  viewsLast7Days: number;
  contactClicksLast7Days: number;
  topAds: Array<{
    _id: string;
    title: string;
    viewsCount: number;
    photo?: string;
  }>;
}

interface StoreAd {
  _id: string;
  title: string;
  price: number;
  currency: string;
  photos: string[];
  status: string;
  viewsTotal?: number;
  favoritesCount?: number;
  createdAt: string;
  unitType?: string;
  isFarmerAd?: boolean;
  categoryId?: string;
}

type TabType = 'products' | 'stats' | 'settings';

export default function StoreCabinetPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { getAuthToken } = usePlatform();
  const [activeTab, setActiveTab] = useState<TabType>('products');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'hidden'>('all');
  
  const [formData, setFormData] = useState<Partial<SellerProfile>>({});
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    staleTime: 30000,
  });

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/seller-profile/my/stats'],
    queryFn: async () => {
      const token = await getAuthToken();
      if (!token) return null;
      
      const res = await fetch('/api/seller-profile/my/stats', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load stats');
      return res.json();
    },
    enabled: !!profileData?.profile,
    staleTime: 60000,
  });

  const { data: adsData, isLoading: adsLoading } = useQuery({
    queryKey: ['/api/seller-profile/my/ads', statusFilter],
    queryFn: async () => {
      const token = await getAuthToken();
      if (!token) return null;
      
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      
      const res = await fetch(`/api/seller-profile/my/ads?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load ads');
      return res.json();
    },
    enabled: !!profileData?.profile,
    staleTime: 30000,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<SellerProfile>) => {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');
      
      const res = await fetch('/api/seller-profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update profile');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/seller-profile/my'] });
      toast({ title: 'Настройки сохранены' });
      setIsFormDirty(false);
    },
    onError: () => {
      toast({ title: 'Ошибка сохранения', variant: 'destructive' });
    },
  });

  const toggleAdStatusMutation = useMutation({
    mutationFn: async ({ adId, newStatus }: { adId: string; newStatus: string }) => {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');
      
      const res = await fetch(`/api/ads/${adId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/seller-profile/my/ads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/seller-profile/my/stats'] });
    },
  });

  const handleSaveSettings = () => {
    if (Object.keys(formData).length === 0) return;
    updateProfileMutation.mutate(formData);
  };

  const handleFormChange = (field: keyof SellerProfile, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsFormDirty(true);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Файл слишком большой (макс. 5MB)', variant: 'destructive' });
      return;
    }
    
    setUploading(true);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');
      
      const formData = new FormData();
      formData.append('photo', file);
      
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      
      if (!res.ok) throw new Error('Upload failed');
      
      const { url } = await res.json();
      handleFormChange('avatar', url);
      toast({ title: 'Логотип загружен' });
    } catch (error) {
      toast({ title: 'Ошибка загрузки', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1 rounded-lg" />
          <Skeleton className="h-10 flex-1 rounded-lg" />
          <Skeleton className="h-10 flex-1 rounded-lg" />
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  const profile: SellerProfile | null = profileData?.profile || null;
  const stats: StoreStats | null = statsData?.stats || null;
  const ads: StoreAd[] = adsData?.items || [];

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 text-center">
            <Store className="w-16 h-16 mx-auto text-primary mb-4" />
            <h2 className="text-xl font-bold mb-2">Создание магазина...</h2>
            <p className="text-sm text-muted-foreground">
              Пожалуйста, подождите
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentFormData = { ...profile, ...formData };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Store Header */}
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-card overflow-hidden shadow-md flex-shrink-0">
            {(currentFormData.avatar || profile.avatar) ? (
              <img 
                src={getThumbnailUrl(currentFormData.avatar || profile.avatar)} 
                alt={profile.name} 
                className="w-full h-full object-cover" 
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary/10">
                <Store className="w-8 h-8 text-primary" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate" data-testid="text-store-name">
              {profile.name}
            </h1>
            {(profile.city || profile.region) && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                <MapPin className="w-3.5 h-3.5" />
                <span>{[profile.city, profile.region].filter(Boolean).join(', ')}</span>
              </div>
            )}
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                <Package className="w-3 h-3 mr-1" />
                {stats?.activeAds || profile.productsCount} товаров
              </Badge>
            </div>
          </div>
          <Button 
            size="sm"
            variant="outline"
            onClick={() => navigate(`/store/${profile.slug}`)}
            data-testid="button-view-store"
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b bg-card sticky top-0 z-10">
        {[
          { id: 'products' as TabType, label: 'Товары', icon: Package },
          { id: 'stats' as TabType, label: 'Статистика', icon: TrendingUp },
          { id: 'settings' as TabType, label: 'Настройки', icon: Settings },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
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

      {/* Tab Content */}
      <div className="p-4">
        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            <Button 
              className="w-full"
              onClick={() => navigate('/ads/create')}
              data-testid="button-add-product"
            >
              <Plus className="w-4 h-4 mr-2" />
              Добавить товар
            </Button>

            {/* Status Filter */}
            <div className="flex gap-2">
              {[
                { id: 'all' as const, label: 'Все' },
                { id: 'active' as const, label: 'Активные' },
                { id: 'hidden' as const, label: 'Скрытые' },
              ].map(filter => (
                <Button
                  key={filter.id}
                  size="sm"
                  variant={statusFilter === filter.id ? 'default' : 'outline'}
                  onClick={() => setStatusFilter(filter.id)}
                  data-testid={`filter-${filter.id}`}
                >
                  {filter.label}
                </Button>
              ))}
            </div>

            {/* Ads List */}
            {adsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
              </div>
            ) : ads.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Package className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Нет товаров</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {ads.map(ad => (
                  <Card key={ad._id} className="overflow-hidden" data-testid={`card-ad-${ad._id}`}>
                    <CardContent className="p-3 flex gap-3">
                      {/* Photo */}
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        <img
                          src={ad.photos?.[0] ? getThumbnailUrl(ad.photos[0]) : NO_PHOTO_PLACEHOLDER}
                          alt={ad.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">{ad.title}</h3>
                        <p className="text-primary font-bold mt-0.5">
                          {ad.price.toLocaleString()} {ad.currency}
                          {ad.unitType && <span className="text-xs text-muted-foreground">/{ad.unitType}</span>}
                        </p>
                        
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {ad.viewsTotal || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3" />
                            {ad.favoritesCount || 0}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                          <Badge 
                            variant={ad.status === 'active' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {ad.status === 'active' ? 'Активно' : 'Скрыто'}
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex flex-col gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => navigate(`/ads/edit/${ad._id}`)}
                          data-testid={`button-edit-${ad._id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            const newStatus = ad.status === 'active' ? 'hidden' : 'active';
                            toggleAdStatusMutation.mutate({ adId: ad._id, newStatus });
                          }}
                          data-testid={`button-toggle-${ad._id}`}
                        >
                          {ad.status === 'active' ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <div className="space-y-4">
            {/* PRO Analytics Banner */}
            <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-sm">PRO Аналитика</h3>
                    <p className="text-xs text-muted-foreground">
                      Детальные графики, воронки и аналитика по географии
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => navigate('/seller/cabinet/pro-analytics')}
                    data-testid="button-pro-analytics"
                  >
                    Открыть
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            {statsLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
              </div>
            ) : stats ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <Package className="w-4 h-4" />
                        <span className="text-xs">Всего товаров</span>
                      </div>
                      <div className="text-2xl font-bold" data-testid="stat-total-ads">
                        {stats.totalAds}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <Check className="w-4 h-4" />
                        <span className="text-xs">Активных</span>
                      </div>
                      <div className="text-2xl font-bold text-green-600" data-testid="stat-active-ads">
                        {stats.activeAds}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <Eye className="w-4 h-4" />
                        <span className="text-xs">Просмотры (7д)</span>
                      </div>
                      <div className="text-2xl font-bold" data-testid="stat-views">
                        {stats.viewsLast7Days}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <Phone className="w-4 h-4" />
                        <span className="text-xs">Контакты (7д)</span>
                      </div>
                      <div className="text-2xl font-bold" data-testid="stat-contacts">
                        {stats.contactClicksLast7Days}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Top Products */}
                {stats.topAds && stats.topAds.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        ТОП-3 товара по просмотрам
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {stats.topAds.map((ad, i) => (
                          <div 
                            key={ad._id} 
                            className="flex items-center gap-3 p-2 rounded-lg hover-elevate cursor-pointer"
                            onClick={() => navigate(`/ads/${ad._id}`)}
                            data-testid={`top-ad-${i}`}
                          >
                            <div className="w-8 h-8 rounded bg-muted overflow-hidden flex-shrink-0">
                              {ad.photo && (
                                <img 
                                  src={getThumbnailUrl(ad.photo)} 
                                  alt="" 
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                            <span className="flex-1 text-sm truncate">{ad.title}</span>
                            <span className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Eye className="w-3 h-3" />
                              {ad.viewsCount}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Статистика пока недоступна</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-4 space-y-4">
                {/* Logo Upload */}
                <div>
                  <label className={labelClass}>Логотип магазина</label>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="w-16 h-16 rounded-xl bg-muted overflow-hidden flex-shrink-0">
                      {(currentFormData.avatar) ? (
                        <img 
                          src={getThumbnailUrl(currentFormData.avatar)} 
                          alt="Logo" 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Store className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      data-testid="button-upload-logo"
                    >
                      {uploading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      Загрузить
                    </Button>
                  </div>
                </div>

                {/* Store Name */}
                <div>
                  <label htmlFor="name" className={labelClass}>
                    Название магазина *
                  </label>
                  <input
                    id="name"
                    value={currentFormData.name || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFormChange('name', e.target.value)}
                    placeholder="Например: Фермерский дом"
                    className={`${inputClass} mt-1.5`}
                    data-testid="input-name"
                  />
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" className={labelClass}>
                    Описание
                  </label>
                  <textarea
                    id="description"
                    value={currentFormData.description || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleFormChange('description', e.target.value)}
                    placeholder="Расскажите о вашем магазине..."
                    rows={3}
                    className={`${textareaClass} mt-1.5 resize-none`}
                    data-testid="input-description"
                  />
                </div>

                {/* City & Region */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="city" className={labelClass}>
                      Город
                    </label>
                    <input
                      id="city"
                      value={currentFormData.city || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFormChange('city', e.target.value)}
                      placeholder="Москва"
                      className={`${inputClass} mt-1.5`}
                      data-testid="input-city"
                    />
                  </div>
                  <div>
                    <label htmlFor="region" className={labelClass}>
                      Район
                    </label>
                    <input
                      id="region"
                      value={currentFormData.region || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFormChange('region', e.target.value)}
                      placeholder="Центральный"
                      className={`${inputClass} mt-1.5`}
                      data-testid="input-region"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="phone" className={labelClass}>
                    Телефон для связи
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={currentFormData.phone || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFormChange('phone', e.target.value)}
                    placeholder="+7 (999) 123-45-67"
                    className={`${inputClass} mt-1.5`}
                    data-testid="input-phone"
                  />
                </div>

                {/* Telegram Username */}
                <div>
                  <label htmlFor="telegram" className={labelClass}>
                    Telegram username
                  </label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                    <input
                      id="telegram"
                      value={currentFormData.telegramUsername || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFormChange('telegramUsername', e.target.value.replace('@', ''))}
                      placeholder="username"
                      className={`${inputClass} pl-8`}
                      data-testid="input-telegram"
                    />
                  </div>
                </div>

                {/* Show Phone Toggle */}
                <div className="flex items-center justify-between py-2">
                  <div>
                    <span className={labelClass}>
                      Показывать телефон в объявлениях
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Ваш телефон будет виден покупателям
                    </p>
                  </div>
                  <Switch
                    checked={currentFormData.showPhone ?? true}
                    onCheckedChange={(checked) => handleFormChange('showPhone', checked)}
                    data-testid="switch-show-phone"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <Button
              className="w-full"
              onClick={handleSaveSettings}
              disabled={!isFormDirty || updateProfileMutation.isPending}
              data-testid="button-save-settings"
            >
              {updateProfileMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Сохранить
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
