import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, MapPin, RefreshCw, Search } from "lucide-react";

import AdCard from "@/components/AdCard";
import AdsMap from "@/components/AdsMap";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFavorites } from "@/features/favorites/FavoritesContext";
import { fetchWithAuth } from "@/lib/auth";
import type { Ad } from "@/types/ad";
import Loader from "@/components/Loader";
import ErrorMessage from "@/components/ErrorMessage";
import useGeoLocation from "@/hooks/useGeoLocation";

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
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState(5);
  const [isNearbyMode, setIsNearbyMode] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState({
    category: "",
    subcategory: "",
    priceFrom: "",
    priceTo: "",
    q: "",
  });
  const { coords: userCoords, loading: geoLoading, error: geoError, requestLocation } = useGeoLocation();

  const PAGE_LIMIT = 20;

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

  const loadAds = useCallback(
    async (
      pageToLoad: number,
      append: boolean,
      options?: { nearby?: boolean; coordsOverride?: { lat: number; lng: number } | null },
    ) => {
      const useNearby = options?.nearby ?? false;
      const coordsToUse = options?.coordsOverride ?? userCoords;

      setError(null);
      setIsLoading(!append);
      setIsLoadingMore(append);

      try {
        const params = new URLSearchParams();

        if (filters.category) {
          params.append("categoryId", filters.category);
          params.append("category", filters.category);
        }
        if (filters.subcategory) {
          params.append("subcategoryId", filters.subcategory);
          params.append("subcategory", filters.subcategory);
        }
        if (filters.priceFrom) params.append("priceFrom", filters.priceFrom);
        if (filters.priceTo) params.append("priceTo", filters.priceTo);

        let url = "/api/ads";
        let hasPagination = true;

        if (useNearby) {
          if (!coordsToUse) {
            throw new Error("Сначала разрешите доступ к геолокации.");
          }
          params.set("lat", String(coordsToUse.lat));
          params.set("lng", String(coordsToUse.lng));
          params.set("radiusKm", String(radiusKm));
          url = "/api/ads/nearby";
          hasPagination = false;
        } else {
          params.append("page", String(pageToLoad));
          params.append("limit", String(PAGE_LIMIT));
          if (filters.q) params.append("q", filters.q);
        }

        const response = await fetchWithAuth(`${url}?${params.toString()}`);
        if (!response.ok) {
          throw new Error("Не удалось загрузить объявления");
        }
        const data = await response.json();
        const items: Ad[] = Array.isArray(data) ? data : data.items ?? [];
        const limitValue: number = typeof data?.limit === "number" ? data.limit : PAGE_LIMIT;
        const more =
          hasPagination &&
          (typeof data?.total === "number"
            ? pageToLoad * limitValue < data.total
            : items.length === limitValue);

        setAds((prev) => (append ? [...prev, ...items] : items));
        setHasMore(more);
        setPage(hasPagination ? pageToLoad : 1);
        setIsNearbyMode(useNearby);
        await refreshFavorites();
      } catch (requestError) {
        console.error(requestError);
        setError("Ошибка при загрузке объявлений. Попробуйте ещё раз.");
        setHasMore(false);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [PAGE_LIMIT, filters, radiusKm, refreshFavorites, userCoords],
  );

  const handleNearbyClick = useCallback(async () => {
    try {
      const coords = userCoords ?? (await requestLocation());
      await loadAds(1, false, { nearby: true, coordsOverride: coords });
    } catch (requestError) {
      console.error(requestError);
      setIsNearbyMode(false);
      if (requestError instanceof Error) {
        setError(requestError.message);
      } else {
        setError("Не удалось получить геопозицию. Разрешите доступ к местоположению в браузере.");
      }
    }
  }, [loadAds, requestLocation, userCoords]);

  const handleShowAll = useCallback(() => {
    setIsNearbyMode(false);
    setPage(1);
    setHasMore(true);
    void loadAds(1, false, { nearby: false });
  }, [loadAds]);

  useEffect(() => {
    if (isNearbyMode && !userCoords) {
      return;
    }

    setAds([]);
    setPage(1);
    setHasMore(true);
    void loadAds(1, false, { nearby: isNearbyMode, coordsOverride: userCoords });
  }, [isNearbyMode, loadAds, userCoords]);

  useEffect(() => {
    if (page > 1 && !isNearbyMode) {
      void loadAds(page, true, { nearby: false });
    }
  }, [isNearbyMode, loadAds, page]);

  const hasAds = useMemo(() => ads.length > 0, [ads]);
  const adsWithLocation = useMemo(
    () =>
      ads.filter(
        (ad) => Array.isArray(ad.location?.coordinates) && ad.location?.coordinates?.length === 2,
      ),
    [ads],
  );

  const mapCenter = useMemo(() => {
    if (adsWithLocation.length) {
      const sums = adsWithLocation.reduce(
        (acc, ad) => {
          const [lng, lat] = ad.location?.coordinates ?? [0, 0];
          return { lat: acc.lat + Number(lat), lng: acc.lng + Number(lng) };
        },
        { lat: 0, lng: 0 },
      );

      return {
        lat: sums.lat / adsWithLocation.length,
        lng: sums.lng / adsWithLocation.length,
      };
    }

    if (userCoords) {
      return userCoords;
    }

    return { lat: 53.9, lng: 27.5667 };
  }, [adsWithLocation, userCoords]);

  const handleMarkerClick = useCallback((adId: string) => {
    const element = document.getElementById(`ad-card-${adId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const activeError = error || geoError;

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
            <Button
              onClick={() => {
                setPage(1);
                setHasMore(!isNearbyMode);
                void loadAds(1, false, { nearby: isNearbyMode, coordsOverride: userCoords });
              }}
              className="gap-2"
            >
              <Search className="h-4 w-4" />
              Применить фильтры
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setFilters({ category: "", subcategory: "", priceFrom: "", priceTo: "", q: "" });
                setPage(1);
                setIsNearbyMode(false);
                setHasMore(true);
                void loadAds(1, false, { nearby: false });
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

              <Button
                onClick={handleShowAll}
                variant="outline"
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Показать все объявления
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {geoLoading && <p className="text-sm text-muted-foreground">Определяем местоположение…</p>}
          {(error || geoError) && <ErrorMessage message={error || geoError || ""} />}
        </CardContent>
      </Card>

      {adsWithLocation.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Карта объявлений</CardTitle>
          </CardHeader>
          <CardContent>
            <AdsMap ads={adsWithLocation} center={mapCenter} onMarkerClick={handleMarkerClick} />
          </CardContent>
        </Card>
      )}

      {isLoading && !isLoadingMore && <Loader />}

      {!isLoading && !hasAds && !activeError && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Объявления не найдены.
          </CardContent>
        </Card>
      )}

      <div className="ads-grid">
        {ads.map((ad) => (
          <div key={ad._id} id={`ad-card-${ad._id}`} className="scroll-mt-24">
            <AdCard
              ad={ad}
              isFavorite={isFavorite(ad._id)}
              onToggleFavorite={toggleFavorite}
            />
          </div>
        ))}
      </div>

      {isLoadingMore && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Загружаем ещё объявления…</span>
        </div>
      )}

      {!isLoading && hasMore && !isNearbyMode && (
        <div className="flex justify-center">
          <Button onClick={() => setPage((prev) => prev + 1)} disabled={isLoadingMore}>
            Загрузить ещё
          </Button>
        </div>
      )}

      {isNearbyMode && hasAds && (
        <p className="text-sm text-muted-foreground">
          Показаны результаты в радиусе {radiusKm} км от вашего местоположения.
        </p>
      )}
    </div>
  );
}
