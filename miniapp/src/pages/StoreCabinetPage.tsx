import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Store, Eye, Package, Phone, Plus, Settings, ChevronRight,
  Heart, EyeOff, Pencil, Upload, TrendingUp,
  MapPin, Check, X, Loader2, ExternalLink, Sparkles,
  Pause, Play, CircleDollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { usePlatform } from '@/platform/PlatformProvider';
import { getThumbnailUrl, NO_PHOTO_PLACEHOLDER } from '@/constants/placeholders';
import { CreateProductWizard } from '@/components/seller/CreateProductWizard';
import { BaseLocationPrompt } from '@/components/seller/BaseLocationPrompt';
import { pauseProduct, publishProduct, updateBaseLocation, updateProductPricing } from '@/api/myShop';

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
  baseLocation?: {
    lat: number;
    lng: number;
    address?: string | null;
  };
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
  measureUnit?: string;
  stockQuantity?: number | null;
  quantity?: number | null;
  viewsTotal?: number;
  favoritesCount?: number;
  createdAt: string;
  unitType?: string;
  isFarmerAd?: boolean;
  categoryId?: string;
}

type TabType = 'products' | 'create' | 'stats' | 'demand' | 'pro' | 'fairs' | 'settings';

export default function StoreCabinetPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { getAuthToken } = usePlatform();
  const [activeTab, setActiveTab] = useState<TabType>('products');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'hidden' | 'draft' | 'paused'>('all');

  const [formData, setFormData] = useState<Partial<SellerProfile>>({});
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showBaseLocationPrompt, setShowBaseLocationPrompt] = useState(false);
  const [, setSavingLocation] = useState(false);
  const [pricingForms, setPricingForms] = useState<Record<string, { price: string; stock: string; measureUnit: string }>>({});
  const [expandedPricingId, setExpandedPricingId] = useState<string | null>(null);

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

  const pricingMutation = useMutation({
    mutationFn: async ({ adId, price, stockQuantity, measureUnit }: { adId: string; price?: number; stockQuantity?: number; measureUnit?: string }) => {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');
      return updateProductPricing(adId, { price, stockQuantity, measureUnit }, token);
    },
    onSuccess: () => {
      toast({ title: 'Сохранено' });
      setExpandedPricingId(null);
      queryClient.invalidateQueries({ queryKey: ['/api/seller-profile/my/ads'] });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Не удалось сохранить цену';
      toast({ title: message, variant: 'destructive' });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async ({ adId, measureUnit }: { adId: string; measureUnit?: string }) => {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');
      return publishProduct(adId, measureUnit, token);
    },
    onSuccess: () => {
      toast({ title: 'Товар опубликован' });
      setExpandedPricingId(null);
      queryClient.invalidateQueries({ queryKey: ['/api/seller-profile/my/ads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/seller-profile/my/stats'] });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Не удалось опубликовать товар';
      toast({ title: message, variant: 'destructive' });
    },
  });

  const pauseMutation = useMutation({
    mutationFn: async ({ adId }: { adId: string }) => {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');
      return pauseProduct(adId, token);
    },
    onSuccess: () => {
      toast({ title: 'Товар поставлен на паузу' });
      queryClient.invalidateQueries({ queryKey: ['/api/seller-profile/my/ads'] });
    },
    onError: () => {
      toast({ title: 'Не удалось поставить на паузу', variant: 'destructive' });
    },
  });

  const handleSaveSettings = () => {
    if (Object.keys(formData).length === 0) return;
    updateProfileMutation.mutate(formData);
  };

  const measureLabels: Record<string, string> = {
    kg: 'кг',
    pcs: 'шт',
    ltr: 'литр',
    pack: 'упаковка',
    portion: 'порция',
    piece: 'шт',
    liter: 'литр',
  };

  const mapUnitTypeToMeasure = (unitType?: string | null) => {
    if (!unitType) return undefined;
    if (unitType === 'piece') return 'pcs';
    if (unitType === 'liter') return 'ltr';
    return unitType;
  };

  const getMeasureLabel = (unit?: string | null) => measureLabels[unit || ''] || unit;

  const getPricingState = (ad: StoreAd) => ({
    price: ad.price > 0 ? String(ad.price) : '',
    stock: ad.stockQuantity != null ? String(ad.stockQuantity) : ad.quantity != null ? String(ad.quantity) : '',
    measureUnit: ad.measureUnit || mapUnitTypeToMeasure(ad.unitType) || 'kg',
  });

  const handleBaseLocationSubmit = async (data: { lat: number; lng: number; address?: string }) => {
    try {
      setSavingLocation(true);
      const token = await getAuthToken();
      await updateBaseLocation(data, token || undefined);
      toast({ title: 'Точка продажи сохранена' });
      queryClient.invalidateQueries({ queryKey: ['/api/seller-profile/my'] });
      setShowBaseLocationPrompt(false);
    } catch (error) {
      toast({ title: 'Не удалось сохранить точку', variant: 'destructive' });
    } finally {
      setSavingLocation(false);
    }
  };

  const handleOpenPricing = (ad: StoreAd) => {
    setExpandedPricingId(ad._id);
    setPricingForms(prev => ({ ...prev, [ad._id]: getPricingState(ad) }));
  };

  const handlePricingChange = (adId: string, field: 'price' | 'stock' | 'measureUnit', value: string) => {
    setPricingForms(prev => ({
      ...prev,
      [adId]: { ...(prev[adId] || {}), [field]: value },
    }));
  };

  const handleSavePricing = (ad: StoreAd) => {
    const form = pricingForms[ad._id] || getPricingState(ad);
    if (!form.price) {
      toast({ title: 'Укажите цену', variant: 'destructive' });
      return;
    }

    pricingMutation.mutate({
      adId: ad._id,
      price: Number(form.price),
      stockQuantity: form.stock ? Number(form.stock) : undefined,
      measureUnit: form.measureUnit,
    });
  };

  const handlePublish = (ad: StoreAd) => {
    const form = pricingForms[ad._id] || getPricingState(ad);
    const priceToUse = form.price || ad.price;
    if (!priceToUse) {
      toast({ title: 'Сначала укажите цену', variant: 'destructive' });
      return;
    }

    if (form.price && Number(form.price) !== ad.price) {
      pricingMutation.mutate(
        {
          adId: ad._id,
          price: Number(form.price),
          stockQuantity: form.stock ? Number(form.stock) : undefined,
          measureUnit: form.measureUnit,
        },
        {
          onSuccess: () => publishMutation.mutate({ adId: ad._id, measureUnit: form.measureUnit }),
        }
      );
      return;
    }

    publishMutation.mutate({ adId: ad._id, measureUnit: form.measureUnit });
  };

  const handlePause = (ad: StoreAd) => {
    pauseMutation.mutate({ adId: ad._id });
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

  useEffect(() => {
    if (profile && !profile.baseLocation) {
      setShowBaseLocationPrompt(true);
    }
  }, [profile]);

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
      <div className="flex border-b bg-card sticky top-0 z-10 overflow-x-auto">
        {[
          { id: 'products' as TabType, label: 'Товары', icon: Package },
          { id: 'create' as TabType, label: 'Создать товар', icon: Plus },
          { id: 'stats' as TabType, label: 'Статистика', icon: TrendingUp },
          { id: 'demand' as TabType, label: 'Спрос', icon: Eye },
          { id: 'pro' as TabType, label: 'PRO', icon: Sparkles },
          { id: 'fairs' as TabType, label: 'Ярмарки', icon: Store },
          { id: 'settings' as TabType, label: 'Настройки', icon: Settings },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                className="w-full"
                onClick={() => setActiveTab('create')}
                data-testid="button-add-product"
              >
                <Plus className="w-4 h-4 mr-2" />
                Создать товар
              </Button>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => navigate('/ads/create')}
              >
                <Pencil className="w-4 h-4 mr-2" />
                Расширенный режим
              </Button>
            </div>

            <Card className="border-dashed">
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Базовая точка продажи</p>
                  <p className="text-xs text-muted-foreground">
                    {profile.baseLocation
                      ? `${profile.baseLocation.lat.toFixed(4)}, ${profile.baseLocation.lng.toFixed(4)}`
                      : 'Не указана'}
                  </p>
                  {profile.baseLocation?.address && (
                    <p className="text-xs text-muted-foreground truncate">{profile.baseLocation.address}</p>
                  )}
                </div>
                <Button size="sm" variant="outline" onClick={() => setShowBaseLocationPrompt(true)}>
                  <MapPin className="w-4 h-4 mr-1" /> {profile.baseLocation ? 'Изменить' : 'Указать'}
                </Button>
              </CardContent>
            </Card>

            {/* Status Filter */}
            <div className="flex gap-2 flex-wrap">
              {[
                { id: 'all' as const, label: 'Все' },
                { id: 'draft' as const, label: 'Черновики' },
                { id: 'active' as const, label: 'Активные' },
                { id: 'paused' as const, label: 'На паузе' },
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
                {ads.map(ad => {
                  const unitLabel = getMeasureLabel(ad.measureUnit || mapUnitTypeToMeasure(ad.unitType));
                  const priceLabel = ad.price > 0 ? `${ad.price.toLocaleString()} ${ad.currency || 'BYN'}` : 'Цена не задана';
                  const isPricingOpen = expandedPricingId === ad._id;
                  const formState = pricingForms[ad._id] || getPricingState(ad);
                  const statusLabel =
                    ad.status === 'draft'
                      ? 'Черновик'
                      : ad.status === 'paused'
                        ? 'На паузе'
                        : ad.status === 'hidden'
                          ? 'Скрыто'
                          : ad.status === 'archived'
                            ? 'Архив'
                            : ad.status === 'expired'
                              ? 'Истёк'
                              : 'Активно';

                  return (
                    <Card key={ad._id} className="overflow-hidden" data-testid={`card-ad-${ad._id}`}>
                      <CardContent className="p-3 space-y-3">
                        <div className="flex gap-3">
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
                              {priceLabel}
                              {unitLabel && <span className="text-xs text-muted-foreground">/{unitLabel}</span>}
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

                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <Badge
                                variant={ad.status === 'active' ? 'default' : ad.status === 'draft' ? 'outline' : 'secondary'}
                                className="text-xs"
                              >
                                {statusLabel}
                              </Badge>
                              {(ad.stockQuantity != null || ad.quantity != null) && (
                                <Badge variant="outline" className="text-xs">
                                  Остаток: {ad.stockQuantity ?? ad.quantity}
                                </Badge>
                              )}
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
                        </div>

                        {ad.status === 'active' && (
                          <div className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs sm:text-sm">
                            <span>Чтобы изменить цену, поставьте товар на паузу.</span>
                            <Button size="sm" variant="outline" onClick={() => handlePause(ad)}>
                              <Pause className="w-4 h-4 mr-1" /> Пауза
                            </Button>
                          </div>
                        )}

                        {(ad.status === 'draft' || ad.status === 'paused') && !isPricingOpen && (
                          <Button variant="outline" size="sm" className="w-full" onClick={() => handleOpenPricing(ad)}>
                            <CircleDollarSign className="w-4 h-4 mr-2" /> Указать цену и остаток
                          </Button>
                        )}

                        {isPricingOpen && (
                          <div className="rounded-lg bg-slate-50 p-3 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <input
                                type="number"
                                min="0"
                                className="w-full rounded-lg border px-3 py-2 text-sm"
                                placeholder="Цена за единицу"
                                value={formState.price}
                                onChange={(e) => handlePricingChange(ad._id, 'price', e.target.value)}
                              />
                              <input
                                type="number"
                                min="0"
                                className="w-full rounded-lg border px-3 py-2 text-sm"
                                placeholder="Остаток"
                                value={formState.stock || ''}
                                onChange={(e) => handlePricingChange(ad._id, 'stock', e.target.value)}
                              />
                              <select
                                className="w-full rounded-lg border px-3 py-2 text-sm"
                                value={formState.measureUnit}
                                onChange={(e) => handlePricingChange(ad._id, 'measureUnit', e.target.value)}
                              >
                                <option value="kg">кг</option>
                                <option value="pcs">шт</option>
                                <option value="ltr">литр</option>
                                <option value="pack">упаковка</option>
                                <option value="portion">порция</option>
                              </select>
                            </div>
                            <div className="flex justify-end gap-2 flex-wrap">
                              <Button variant="ghost" size="sm" onClick={() => setExpandedPricingId(null)}>
                                Отмена
                              </Button>
                              <Button size="sm" onClick={() => handleSavePricing(ad)} disabled={pricingMutation.isPending}>
                                Сохранить
                              </Button>
                              {ad.status !== 'active' && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handlePublish(ad)}
                                  disabled={publishMutation.isPending}
                                >
                                  <Play className="w-4 h-4 mr-1" /> Опубликовать
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'create' && (
          <div className="space-y-4">
            <Card className="border-dashed">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">Базовая точка продажи</p>
                  <p className="text-xs text-muted-foreground">
                    {profile.baseLocation ? 'Мы подставим её автоматически' : 'Сначала сохраните точку, потом карточку товара'}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setShowBaseLocationPrompt(true)}>
                  {profile.baseLocation ? 'Поменять' : 'Указать'}
                </Button>
              </CardContent>
            </Card>

            <CreateProductWizard
              onCreated={() => {
                queryClient.invalidateQueries({ queryKey: ['/api/seller-profile/my/ads'] });
                setActiveTab('products');
              }}
            />
          </div>
        )}

        {activeTab === 'demand' && (
          <Card>
            <CardContent className="p-4 space-y-2">
              <CardTitle className="text-base">Спрос рядом с вами</CardTitle>
              <p className="text-sm text-muted-foreground">
                Здесь появятся подсказки, чего не хватает покупателям и что добавить в ассортимент.
              </p>
            </CardContent>
          </Card>
        )}

        {activeTab === 'pro' && (
          <Card>
            <CardContent className="p-4 space-y-2">
              <CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-4 h-4" />PRO</CardTitle>
              <p className="text-sm text-muted-foreground">
                Расширенная аналитика и рекомендации для роста продаж. Скоро добавим больше инструментов.
              </p>
              <Button size="sm" onClick={() => navigate('/seller/cabinet/pro-analytics')}>Открыть PRO-аналитику</Button>
            </CardContent>
          </Card>
        )}

        {activeTab === 'fairs' && (
          <Card>
            <CardContent className="p-4 space-y-2">
              <CardTitle className="text-base">Ярмарки и события</CardTitle>
              <p className="text-sm text-muted-foreground">
                Подборка ярмарок и точек продаж появится здесь. Следите за обновлениями.</p>
            </CardContent>
          </Card>
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
      <BaseLocationPrompt open={showBaseLocationPrompt} onSubmit={handleBaseLocationSubmit} />
    </div>
  );
}
