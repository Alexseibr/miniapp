import { useEffect, useState } from "react";
import { Heart } from "lucide-react";

import AdCard from "@/components/AdCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFavorites } from "./FavoritesContext";
import { fetchWithAuth, getAuthToken } from "@/lib/auth";
import type { Ad } from "@/types/ad";

export function FavoritesPage() {
  const { favorites, isFavorite, toggleFavorite, refreshFavorites } = useFavorites();
  const [ads, setAds] = useState<Ad[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasToken = Boolean(getAuthToken());

  useEffect(() => {
    if (!hasToken) return;

    const loadFavorites = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetchWithAuth("/api/favorites/my");
        if (!response.ok) {
          throw new Error("Не удалось загрузить избранное");
        }
        const data = await response.json();
        const adsData: Ad[] = Array.isArray(data)
          ? data.map((item: any) => item?.ad ?? item).filter(Boolean)
          : [];
        setAds(adsData);
        await refreshFavorites();
      } catch (requestError) {
        console.error(requestError);
        setError("Не удалось загрузить избранные объявления. Попробуйте снова.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadFavorites();
  }, [hasToken, refreshFavorites]);

  if (!hasToken) {
    return (
      <div className="container mx-auto px-4 py-10 space-y-6">
        <div className="flex items-center gap-3">
          <Heart className="h-8 w-8 text-pink-600" />
          <div>
            <h1 className="text-3xl font-bold">Избранные объявления</h1>
            <p className="text-muted-foreground">Войдите, чтобы просматривать избранное.</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6 text-muted-foreground">
            Войдите, чтобы просматривать избранные объявления.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center gap-3">
        <Heart className="h-8 w-8 text-pink-600" />
        <div>
          <h1 className="text-3xl font-bold">Избранные объявления</h1>
          <p className="text-muted-foreground">
            Объявления, которые вы сохранили для быстрого доступа
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ваш список</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && <p className="text-muted-foreground">Загрузка избранного…</p>}
          {error && <p className="text-red-600 text-sm">{error}</p>}

          {!isLoading && !ads.length && (
            <p className="text-muted-foreground">У вас пока нет избранных объявлений.</p>
          )}

          <div className="grid grid-cols-1 gap-4">
            {ads.map((ad) => (
              <AdCard
                key={ad._id}
                ad={ad}
                isFavorite={isFavorite(ad._id) || favorites.includes(ad._id)}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default FavoritesPage;
