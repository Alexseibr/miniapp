import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, MapPin, RefreshCw, Search } from "lucide-react";

import AdCard from "@/components/AdCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFavorites } from "@/features/favorites/FavoritesContext";
import { fetchWithAuth } from "@/lib/auth";
import type { Ad } from "@/types/ad";

interface Category {
  code: string;
  name: string;
  subcategories: { code: string; name: string }[];
}

const radiusOptions = [1, 3, 5, 10];

export default function AdsList() {
  const { isFavorite, toggleFavorite, refreshFavorites } = useFavorites();
  const [ads, setAds] = useState<Ad[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState(5);
  const [isNearbyMode, setIsNearbyMode] = useState(false);
  const [geoStatus, setGeoStatus] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filters, setFilters] = useState({
    category: "",
    subcategory: "",
    priceFrom: "",
    priceTo: "",
    q: "",
  });

  const subcategories = useMemo(() => {
    return categories.find((cat) => cat.code === filters.category)?.subcategories ?? [];
  }, [categories, filters.category]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetchWithAuth("/api/categories");
        if (!response.ok) {
          throw new Error("Не удалось загрузить категории");
        }
        const data = await response.json();
        setCategories(Array.isArray(data) ? data : []);
      } catch (requestError) {
        console.error(requestError);
      }
    };

    void loadCategories();
  }, []);

  const loadAllAds = useCallback(async () => {
    setError(null);
    setIsNearbyMode(false);
    setIsLoading(true);

    try {
      const params = new URLSearchParams();

      if (filters.category) params.append("category", filters.category);
      if (filters.subcategory) params.append("subcategory", filters.subcategory);
      if (filters.priceFrom) params.append("priceFrom", filters.priceFrom);
      if (filters.priceTo) params.append("priceTo", filters.priceTo);
      if (filters.q) params.append("q", filters.q);

      const query = params.toString();
      const response = await fetchWithAuth(query ? `/api/ads?${query}` : "/api/ads");
      if (!response.ok) {
        throw new Error("Не удалось загрузить объявления");
      }
      const data = await response.json();
      setAds(Array.isArray(data) ? data : data.items ?? []);
      await refreshFavorites();
    } catch (requestError) {
      console.error(requestError);
      setError("Ошибка при загрузке объявлений. Попробуйте ещё раз.");
    } finally {
      setIsLoading(false);
    }
  }, [filters, refreshFavorites]);

  const loadNearbyAds = useCallback(
    async (lat: number, lng: number) => {
      setError(null);
      setIsNearbyMode(true);
      setIsLoading(true);

      try {
        const params = new URLSearchParams({
          lat: String(lat),
          lng: String(lng),
          radiusKm: String(radiusKm),
        });

        const response = await fetchWithAuth(`/api/ads/nearby?${params.toString()}`);

        if (!response.ok) {
          throw new Error("Не удалось загрузить объявления рядом");
        }

        const data = await response.json();
        setAds(Array.isArray(data) ? data : data.items ?? []);
      } catch (requestError) {
        console.error(requestError);
        setError("Ошибка при загрузке объявлений рядом. Попробуйте ещё раз.");
      } finally {
        setIsLoading(false);
        setGeoStatus(null);
      }
    },
    [radiusKm],
  );

  const handleNearbyClick = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Браузер не поддерживает геолокацию");
      return;
    }

    setGeoStatus("Определяем местоположение…");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoStatus(null);
        void loadNearbyAds(position.coords.latitude, position.coords.longitude);
      },
      () => {
        setGeoStatus(null);
        setError("Не удалось получить геопозицию. Разрешите доступ к местоположению в браузере.");
      },
    );
  }, [loadNearbyAds]);

  useEffect(() => {
    void loadAllAds();
  }, [loadAllAds]);

  const hasAds = useMemo(() => ads.length > 0, [ads]);

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <MapPin className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">Объявления</h1>
          <p className="text-muted-foreground">
            Общий список и поиск объявлений рядом с вами
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Фильтры</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Категория</Label>
              <select
                className="w-full border rounded-md p-2"
                value={filters.category}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, category: e.target.value, subcategory: "" }))
                }
              >
                <option value="">Все категории</option>
                {categories.map((category) => (
                  <option key={category.code} value={category.code}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Подкатегория</Label>
              <select
                className="w-full border rounded-md p-2"
                value={filters.subcategory}
                onChange={(e) => setFilters((prev) => ({ ...prev, subcategory: e.target.value }))}
                disabled={!filters.category}
              >
                <option value="">Все подкатегории</option>
                {subcategories.map((sub) => (
                  <option key={sub.code} value={sub.code}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Цена от</Label>
              <Input
                type="number"
                min="0"
                value={filters.priceFrom}
                onChange={(e) => setFilters((prev) => ({ ...prev, priceFrom: e.target.value }))}
              />
            </div>
            <div>
              <Label>Цена до</Label>
              <Input
                type="number"
                min="0"
                value={filters.priceTo}
                onChange={(e) => setFilters((prev) => ({ ...prev, priceTo: e.target.value }))}
              />
            </div>
            <div>
              <Label>Поиск</Label>
              <Input
                placeholder="Название или описание"
                value={filters.q}
                onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={loadAllAds} className="gap-2">
              <Search className="h-4 w-4" />
              Применить фильтры
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setFilters({ category: "", subcategory: "", priceFrom: "", priceTo: "", q: "" });
                void loadAllAds();
              }}
            >
              Сбросить
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <span>Фильтр по геопозиции</span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Label className="whitespace-nowrap">Радиус</Label>
                <Select value={String(radiusKm)} onValueChange={(value) => setRadiusKm(Number(value))}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Радиус" />
                  </SelectTrigger>
                  <SelectContent>
                    {radiusOptions.map((radius) => (
                      <SelectItem key={radius} value={String(radius)}>
                        {radius} км
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleNearbyClick} variant="default" className="gap-2">
                <Search className="h-4 w-4" />
                Показать рядом со мной
              </Button>

              <Button onClick={loadAllAds} variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Показать все объявления
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {geoStatus && <p className="text-sm text-muted-foreground">{geoStatus}</p>}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-md p-3">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Загрузка объявлений…</span>
        </div>
      )}

      {!isLoading && !hasAds && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Объявления не найдены.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4">
        {ads.map((ad) => (
          <AdCard
            key={ad._id}
            ad={ad}
            isFavorite={isFavorite(ad._id)}
            onToggleFavorite={toggleFavorite}
          />
        ))}
      </div>

      {isNearbyMode && hasAds && (
        <p className="text-sm text-muted-foreground">
          Показаны результаты в радиусе {radiusKm} км от вашего местоположения.
        </p>
      )}
    </div>
  );
}
