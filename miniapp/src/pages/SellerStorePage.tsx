import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Store, MapPin, Star, Users, Package, Phone, MessageCircle, 
  Bell, BellOff, ChevronRight, ExternalLink, Share2, Clock,
  Truck, Leaf, Instagram, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { usePlatform } from '@/platform/PlatformProvider';
import LazyImage from '@/components/LazyImage';

interface SellerProfile {
  _id: string;
  slug: string;
  name: string;
  avatar?: string;
  banner?: string;
  description?: string;
  isFarmer: boolean;
  phone?: string;
  telegramUsername?: string;
  instagram?: string;
  address?: string;
  city?: string;
  ratings: {
    score: number;
    count: number;
  };
  subscribersCount: number;
  productsCount: number;
  isVerified: boolean;
  workingHours?: string;
  deliveryInfo?: string;
  analytics?: {
    totalViews: number;
  };
}

interface SellerItem {
  _id: string;
  title: string;
  price: number;
  currency: string;
  photos: string[];
  unitType?: string;
  isFarmerAd?: boolean;
}

export default function SellerStorePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { getAuthToken, platformType } = usePlatform();
  const [activeTab, setActiveTab] = useState('products');

  const { data: storeData, isLoading: storeLoading } = useQuery({
    queryKey: ['/api/seller-profile', id],
    queryFn: async () => {
      const token = await getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const res = await fetch(`/api/seller-profile/${id}`, { headers });
      if (!res.ok) throw new Error('Store not found');
      return res.json();
    },
    enabled: !!id,
  });

  const { data: itemsData, isLoading: itemsLoading } = useQuery({
    queryKey: ['/api/seller-profile', id, 'items'],
    queryFn: async () => {
      const res = await fetch(`/api/seller-profile/${id}/items?limit=50`);
      if (!res.ok) throw new Error('Failed to load items');
      return res.json();
    },
    enabled: !!id,
  });

  const { data: reviewsData } = useQuery({
    queryKey: ['/api/seller', id, 'reviews'],
    queryFn: async () => {
      const token = await getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const res = await fetch(`/api/seller/${id}/reviews`, { headers });
      if (!res.ok) throw new Error('Failed to load reviews');
      return res.json();
    },
    enabled: !!id,
  });

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');
      
      const res = await fetch(`/api/seller/subscribe/${id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error('Subscribe failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/seller-profile', id] });
      toast({ title: 'Вы подписались на магазин' });
    },
  });

  const unsubscribeMutation = useMutation({
    mutationFn: async () => {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');
      
      const res = await fetch(`/api/seller/subscribe/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Unsubscribe failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/seller-profile', id] });
      toast({ title: 'Вы отписались от магазина' });
    },
  });

  const handleContact = async () => {
    const token = await getAuthToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    await fetch(`/api/seller-profile/${id}/contact`, { 
      method: 'POST',
      headers,
    });
  };

  const handleShare = () => {
    const url = `https://t.me/KetmarM_bot/app?startapp=store_${profile?.slug || id}`;
    if (navigator.share) {
      navigator.share({ title: profile?.name, url });
    } else {
      navigator.clipboard.writeText(url);
      toast({ title: 'Ссылка скопирована' });
    }
  };

  if (storeLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Skeleton className="h-48 w-full" />
        <div className="p-4 space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const profile: SellerProfile | undefined = storeData?.profile;
  const isSubscribed = storeData?.isSubscribed;
  const isOwner = storeData?.isOwner;
  const items: SellerItem[] = itemsData?.items || [];
  const reviews = reviewsData?.reviews || [];
  const reviewStats = reviewsData?.stats;

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 text-center">
            <Store className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">Магазин не найден</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Возможно, он был удален или ссылка неверна
            </p>
            <Button onClick={() => navigate('/')} data-testid="button-go-home">
              На главную
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="relative h-48 bg-gradient-to-br from-primary/20 to-primary/5">
        {profile.banner ? (
          <LazyImage
            src={profile.banner}
            alt={profile.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Store className="w-16 h-16 text-primary/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        <button 
          onClick={handleShare}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/20 backdrop-blur-sm"
          data-testid="button-share-store"
        >
          <Share2 className="w-5 h-5 text-white" />
        </button>
      </div>

      <div className="relative px-4 -mt-12">
        <div className="flex items-end gap-4">
          <div className="w-24 h-24 rounded-2xl bg-card border-4 border-background overflow-hidden shadow-lg flex-shrink-0">
            {profile.avatar ? (
              <LazyImage
                src={profile.avatar}
                alt={profile.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary/10">
                <Store className="w-10 h-10 text-primary" />
              </div>
            )}
          </div>
          
          <div className="flex-1 pb-2">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground" data-testid="text-store-name">
                {profile.name}
              </h1>
              {profile.isVerified && (
                <Check className="w-5 h-5 text-primary" />
              )}
            </div>
            
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              {profile.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {profile.city}
                </span>
              )}
              {profile.ratings.count > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                  {profile.ratings.score}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4">
        <div className="flex items-center gap-2">
          {profile.isFarmer && (
            <Badge variant="secondary" className="gap-1" data-testid="badge-farmer">
              <Leaf className="w-3 h-3" />
              Фермер
            </Badge>
          )}
          <Badge variant="outline" className="gap-1">
            <Users className="w-3 h-3" />
            {profile.subscribersCount} подписчиков
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Package className="w-3 h-3" />
            {profile.productsCount} товаров
          </Badge>
        </div>

        {profile.description && (
          <p className="mt-3 text-sm text-muted-foreground" data-testid="text-store-description">
            {profile.description}
          </p>
        )}

        <div className="flex gap-2 mt-4">
          {!isOwner && (
            <Button
              className="flex-1"
              variant={isSubscribed ? 'outline' : 'default'}
              onClick={() => isSubscribed ? unsubscribeMutation.mutate() : subscribeMutation.mutate()}
              disabled={subscribeMutation.isPending || unsubscribeMutation.isPending}
              data-testid="button-subscribe"
            >
              {isSubscribed ? (
                <>
                  <BellOff className="w-4 h-4 mr-2" />
                  Отписаться
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4 mr-2" />
                  Подписаться
                </>
              )}
            </Button>
          )}
          
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleContact}
            data-testid="button-contact"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Связаться
          </Button>
        </div>

        {(profile.phone || profile.telegramUsername || profile.instagram) && (
          <Card className="mt-4">
            <CardContent className="p-3 space-y-2">
              {profile.phone && (
                <a 
                  href={`tel:${profile.phone}`}
                  className="flex items-center gap-3 text-sm hover-elevate p-2 rounded-lg"
                  onClick={handleContact}
                  data-testid="link-phone"
                >
                  <Phone className="w-4 h-4 text-primary" />
                  <span>{profile.phone}</span>
                </a>
              )}
              {profile.telegramUsername && (
                <a 
                  href={`https://t.me/${profile.telegramUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-sm hover-elevate p-2 rounded-lg"
                  onClick={handleContact}
                  data-testid="link-telegram"
                >
                  <MessageCircle className="w-4 h-4 text-primary" />
                  <span>@{profile.telegramUsername}</span>
                  <ExternalLink className="w-3 h-3 ml-auto text-muted-foreground" />
                </a>
              )}
              {profile.instagram && (
                <a 
                  href={`https://instagram.com/${profile.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-sm hover-elevate p-2 rounded-lg"
                  onClick={handleContact}
                  data-testid="link-instagram"
                >
                  <Instagram className="w-4 h-4 text-pink-500" />
                  <span>@{profile.instagram}</span>
                  <ExternalLink className="w-3 h-3 ml-auto text-muted-foreground" />
                </a>
              )}
            </CardContent>
          </Card>
        )}

        {(profile.workingHours || profile.deliveryInfo) && (
          <Card className="mt-3">
            <CardContent className="p-3 space-y-2">
              {profile.workingHours && (
                <div className="flex items-start gap-3 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <span>{profile.workingHours}</span>
                </div>
              )}
              {profile.deliveryInfo && (
                <div className="flex items-start gap-3 text-sm">
                  <Truck className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <span>{profile.deliveryInfo}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="mt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full px-4 justify-start gap-2 bg-transparent">
            <TabsTrigger value="products" className="flex-1" data-testid="tab-products">
              Товары ({profile.productsCount})
            </TabsTrigger>
            <TabsTrigger value="reviews" className="flex-1" data-testid="tab-reviews">
              Отзывы ({profile.ratings.count})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="px-4 mt-4">
            {itemsLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="h-48 rounded-xl" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Пока нет товаров</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {items.map(item => (
                  <Card 
                    key={item._id}
                    className="overflow-hidden cursor-pointer hover-elevate"
                    onClick={() => navigate(`/ad/${item._id}`)}
                    data-testid={`product-card-${item._id}`}
                  >
                    <div className="aspect-square relative bg-muted">
                      {item.photos?.[0] ? (
                        <LazyImage
                          src={item.photos[0]}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      {item.isFarmerAd && (
                        <Badge 
                          className="absolute top-2 left-2 text-xs" 
                          variant="secondary"
                        >
                          <Leaf className="w-3 h-3 mr-1" />
                          Фермер
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-3">
                      <h3 className="font-medium text-sm line-clamp-2">{item.title}</h3>
                      <div className="mt-1 font-bold text-primary">
                        {item.price} {item.currency}
                        {item.unitType && (
                          <span className="text-xs font-normal text-muted-foreground">
                            /{item.unitType === 'kg' ? 'кг' : item.unitType === 'piece' ? 'шт' : item.unitType}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reviews" className="px-4 mt-4">
            {reviewStats && reviewStats.totalReviews > 0 && (
              <Card className="mb-4">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold">{reviewStats.avgRating}</div>
                      <div className="flex items-center justify-center mt-1">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star
                            key={s}
                            className={`w-4 h-4 ${s <= Math.round(reviewStats.avgRating) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
                          />
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {reviewStats.totalReviews} отзывов
                      </div>
                    </div>
                    <div className="flex-1 space-y-1">
                      {[5, 4, 3, 2, 1].map(rating => (
                        <div key={rating} className="flex items-center gap-2">
                          <span className="text-xs w-3">{rating}</span>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-yellow-400"
                              style={{
                                width: `${(reviewStats.distribution[rating] / reviewStats.totalReviews) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-6">
                            {reviewStats.distribution[rating]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {reviews.length === 0 ? (
              <div className="text-center py-12">
                <Star className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Пока нет отзывов</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((review: any) => (
                  <Card key={review._id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium text-sm">
                            {review.userId?.firstName || 'Покупатель'}
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            {[1, 2, 3, 4, 5].map(s => (
                              <Star
                                key={s}
                                className={`w-3 h-3 ${s <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
                              />
                            ))}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(review.createdAt).toLocaleDateString('ru-RU')}
                        </span>
                      </div>
                      {review.text && (
                        <p className="text-sm mt-2">{review.text}</p>
                      )}
                      {review.sellerReply && (
                        <div className="mt-3 pl-3 border-l-2 border-primary/30">
                          <div className="text-xs text-muted-foreground mb-1">
                            Ответ продавца
                          </div>
                          <p className="text-sm">{review.sellerReply.text}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
