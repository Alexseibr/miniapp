import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api/client";
import AdCard from "@/components/AdCard";
import AdsMap from "@/components/AdsMap";
import { useAuth } from "@/context/AuthContext";
import type { Ad } from "@/types/ad";

interface Filters {
  categoryId: string;
  priceFrom: string;
  priceTo: string;
}

export default function AdsListPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [ads, setAds] = useState<Ad[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filters>({ categoryId: "", priceFrom: "", priceTo: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nearbyMode, setNearbyMode] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);

  const loadFavorites = async () => {
    if (!token) {
      setFavoriteIds([]);
      return;
    }
    try {
      const { data } = await api.get("/favorites/ids");
      setFavoriteIds(Array.isArray(data?.adIds) ? data.adIds : []);
    } catch (requestError) {
      console.error(requestError);
      setFavoriteIds([]);
    }
  };

  const loadAds = async () => {
    setLoading(true);
    setError(null);
    setNearbyMode(false);
    try {
      const params: Record<string, string> = {};
      if (filters.categoryId) params.categoryId = filters.categoryId;
      if (filters.priceFrom) params.priceFrom = filters.priceFrom;
      if (filters.priceTo) params.priceTo = filters.priceTo;
      const { data } = await api.get("/ads", { params });
      const items: Ad[] = Array.isArray(data) ? data : data.items ?? [];
      setAds(items);
      await loadFavorites();
      if (items.length && items[0].location?.coordinates) {
        const [lng, lat] = items[0].location.coordinates;
        setMapCenter({ lat, lng });
      }
    } catch (requestError) {
      console.error(requestError);
      setError("Не удалось загрузить объявления");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNearby = () => {
    if (!navigator.geolocation) {
      setError("Браузер не поддерживает геолокацию");
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const params: Record<string, string | number> = {
            lat: latitude,
            lng: longitude,
            radiusKm: 10,
          };
          if (filters.categoryId) params.categoryId = filters.categoryId;
          const { data } = await api.get("/ads/nearby", { params });
          const items: Ad[] = Array.isArray(data) ? data : data.items ?? [];
          setNearbyMode(true);
          setAds(items);
          setMapCenter({ lat: latitude, lng: longitude });
        } catch (geoError) {
          console.error(geoError);
          setError("Не удалось выполнить поиск рядом");
        } finally {
          setLoading(false);
        }
      },
      () => {
        setLoading(false);
        setError("Разрешите доступ к геолокации");
      },
    );
  };

  const toggleFavorite = async (adId: string) => {
    if (!token) {
      navigate("/login");
      return;
    }
    const already = favoriteIds.includes(adId);
    setFavoriteIds((prev) => (already ? prev.filter((id) => id !== adId) : [...prev, adId]));
    try {
      if (already) {
        await api.delete(`/favorites/${adId}`);
      } else {
        await api.post(`/favorites/${adId}`);
      }
    } catch (requestError) {
      console.error(requestError);
      setFavoriteIds((prev) => (already ? [...prev, adId] : prev.filter((id) => id !== adId)));
    }
  };

  const mapCenterValue = useMemo(() => {
    if (mapCenter) return mapCenter;
    if (!ads.length) return null;
    const coords = ads
      .map((ad) => ad.location?.coordinates)
      .filter(Boolean) as [number, number][];
    if (!coords.length) return null;
    const avgLat = coords.reduce((sum, [, lat]) => sum + lat, 0) / coords.length;
    const avgLng = coords.reduce((sum, [lng]) => sum + lng, 0) / coords.length;
    return { lat: avgLat, lng: avgLng };
  }, [ads, mapCenter]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Объявления</h1>
          <p>Лента объявлений и поиск рядом с вами</p>
        </div>
        <div className="filters">
          <label>
            Категория
            <input
              value={filters.categoryId}
              onChange={(e) => setFilters((prev) => ({ ...prev, categoryId: e.target.value }))}
              placeholder="Категория"
            />
          </label>
          <label>
            Цена от
            <input
              type="number"
              value={filters.priceFrom}
              onChange={(e) => setFilters((prev) => ({ ...prev, priceFrom: e.target.value }))}
            />
          </label>
          <label>
            Цена до
            <input
              type="number"
              value={filters.priceTo}
              onChange={(e) => setFilters((prev) => ({ ...prev, priceTo: e.target.value }))}
            />
          </label>
          <div className="filters__actions">
            <button onClick={loadAds}>Применить</button>
            <button
              onClick={() => {
                setFilters({ categoryId: "", priceFrom: "", priceTo: "" });
                void loadAds();
              }}
              className="secondary"
            >
              Показать все
            </button>
            <button onClick={handleNearby} className="secondary">
              Показать рядом со мной
            </button>
          </div>
        </div>
      </div>

      {error && <div className="error">{error}</div>}
      {loading && <div className="loader">Загрузка…</div>}

      {mapCenterValue && ads.some((ad) => ad.location?.coordinates) && (
        <AdsMap ads={ads} center={mapCenterValue} onMarkerClick={(id) => navigate(`/ads/${id}`)} />
      )}

      <div className="ads-grid">
        {ads.map((ad) => (
          <AdCard key={ad._id} ad={ad} isFavorite={favoriteIds.includes(ad._id)} onToggleFavorite={toggleFavorite} />
        ))}
      </div>

      {nearbyMode && <p className="muted">Показаны результаты рядом с вашим местоположением.</p>}
    </div>
  );
}
