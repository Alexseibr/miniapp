import { useCallback, useMemo, useState } from "react";
import { MapPin, Navigation, Search } from "lucide-react";

import { getNearbyAds, type Ad } from "@/api/adsApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

type Coordinates = {
  lat: number;
  lng: number;
};

const radiusOptions = [1, 3, 5, 10, 25];

export function NearbySearch() {
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(5);
  const [ads, setAds] = useState<Ad[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDetectLocation = useCallback(() => {
    setError(null);

    if (!navigator.geolocation) {
      setError("Браузер не поддерживает геолокацию");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (geoError) => {
        setError(`Не удалось определить местоположение: ${geoError.message}`);
      },
    );

    // TODO: заменить на Telegram WebApp геолокацию, когда она будет включена
  }, []);

  const handleSearch = useCallback(async () => {
    if (!coords) {
      setError("Сначала определите ваше местоположение");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const nearbyAds = await getNearbyAds({
        lat: coords.lat,
        lng: coords.lng,
        radiusKm,
      });
      setAds(nearbyAds);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Не удалось загрузить объявления",
      );
    } finally {
      setIsLoading(false);
    }
  }, [coords, radiusKm]);

  const hasResults = useMemo(() => ads.length > 0, [ads]);

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-6">
        <Navigation className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">Поиск рядом со мной</h1>
          <p className="text-muted-foreground">
            Быстрая выдача объявлений в выбранном радиусе
          </p>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Геолокация
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lat">Широта</Label>
              <Input
                id="lat"
                value={coords?.lat ?? ""}
                placeholder="Не определено"
                onChange={(event) =>
                  setCoords((prev) => ({
                    lat: Number(event.target.value),
                    lng: prev?.lng ?? 0,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lng">Долгота</Label>
              <Input
                id="lng"
                value={coords?.lng ?? ""}
                placeholder="Не определено"
                onChange={(event) =>
                  setCoords((prev) => ({
                    lat: prev?.lat ?? 0,
                    lng: Number(event.target.value),
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Радиус поиска</Label>
              <Select
                value={String(radiusKm)}
                onValueChange={(value) => setRadiusKm(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите радиус" />
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
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleDetectLocation} variant="secondary">
              Определить моё местоположение
            </Button>
            <Button onClick={handleSearch} disabled={isLoading}>
              <Search className="h-4 w-4 mr-2" />
              Показать объявления рядом
            </Button>
          </div>

          {error && (
            <div className="text-red-600 bg-red-50 dark:bg-red-900/30 rounded-md p-3 text-sm">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {isLoading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, index) => (
              <Card key={index}>
                <CardContent className="p-6 space-y-3">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && !hasResults && (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Рядом с вами объявлений не найдено
            </CardContent>
          </Card>
        )}

        {!isLoading && hasResults && (
          <div className="grid grid-cols-1 gap-4">
            {ads.map((ad) => (
              <Card key={ad._id} className="hover-elevate">
                <CardContent className="p-6 space-y-3">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold">{ad.title}</h3>
                      {ad.description && (
                        <p className="text-muted-foreground text-sm line-clamp-2">
                          {ad.description}
                        </p>
                      )}
                      <div className="text-sm text-muted-foreground flex flex-wrap gap-2">
                        {ad.categoryId && <span>Категория: {ad.categoryId}</span>}
                        {ad.subcategoryId && <span>Подкатегория: {ad.subcategoryId}</span>}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {ad.deliveryType
                          ? `Доставка: ${deliveryLabel(ad.deliveryType)}`
                          : "Способ доставки не указан"}
                      </div>
                    </div>

                    <div className="text-right space-y-1 min-w-[140px]">
                      {typeof ad.price === "number" && (
                        <p className="text-2xl font-bold text-green-600">
                          {ad.price} {ad.currency ?? "BYN"}
                        </p>
                      )}
                      {typeof ad.distanceKm === "number" && (
                        <p className="text-sm text-muted-foreground">
                          ≈ {ad.distanceKm.toFixed(1)} км
                        </p>
                      )}
                      <Button variant="outline" asChild size="sm">
                        <a href="tg://resolve?domain=USERNAME">
                          Открыть в Telegram
                        </a>
                      </Button>
                    </div>
                  </div>

                  {ad.location && ad.location.lat && ad.location.lng && (
                    <p className="text-xs text-muted-foreground">
                      Координаты объявления: {ad.location.lat.toFixed(4)}, {" "}
                      {ad.location.lng.toFixed(4)}
                    </p>
                  )}

                  <p className="text-xs text-muted-foreground">
                    TODO: заменить ссылку на реального продавца в Telegram WebApp
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function deliveryLabel(deliveryType: Ad["deliveryType"]) {
  switch (deliveryType) {
    case "pickup_only":
      return "Самовывоз";
    case "delivery_only":
      return "Доставка";
    case "delivery_and_pickup":
      return "Доставка и самовывоз";
    default:
      return "";
  }
}
