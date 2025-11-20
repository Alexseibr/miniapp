import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api/client";
import AdCard from "@/components/AdCard";
import AdsMap from "@/components/AdsMap";
import { useAdsList, useNearbyAds } from "@/hooks/useAdsData";
import { useAuth } from "@/context/AuthContext";

interface Filters {
  categoryId: string;
  priceFrom: string;
  priceTo: string;
}

export default function AdsListPage() {
  const navigate = useNavigate();
  const { token } = useAuth();

  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filters>({ categoryId: "", priceFrom: "", priceTo: "" });
  const [appliedFilters, setAppliedFilters] = useState<Filters>({ categoryId: "", priceFrom: "", priceTo: "" });
  const [nearbyParams, setNearbyParams] = useState<Record<string, string | number> | null>(null);
  const [nearbyMode, setNearbyMode] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    data: ads = [],
    isFetching: loadingAds,
    error: adsError,
    refetch,
  } = useAdsList(appliedFilters);

  const {
    data: nearbyAds = [],
    isFetching: loadingNearby,
    error: nearbyError,
  } = useNearbyAds(nearbyParams);

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

  useEffect(() => {
    if (token) {
      void loadFavorites();
    } else {
      setFavoriteIds([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (adsError) {
      setError("Не удалось загрузить объявления");
    }
  }, [adsError]);

  useEffect(() => {
    if (nearbyError) {
      setError("Не удалось выполнить поиск рядом");
    }
  }, [nearbyError]);

  useEffect(() => {
    if (ads.length || nearbyAds.length) {
      setError(null);
    }
  }, [ads.length, nearbyAds.length]);

  const handleNearby = () => {
    if (!navigator.geolocation) {
      setError("Браузер не поддерживает геолокацию");
      return;
    }
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const params: Record<string, string | number> = {
          lat: latitude,
          lng: longitude,
          radiusKm: 10,
        };

        if (filters.categoryId) params.categoryId = filters.categoryId;
        if (filters.priceFrom) params.priceFrom = filters.priceFrom;
        if (filters.priceTo) params.priceTo = filters.priceTo;

        setMapCenter({ lat: latitude, lng: longitude });
        setNearbyParams(params);
        setNearbyMode(true);
      },
      () => {
        setError("Разрешите доступ к геолокации");
      },
    );
  };

  const handleApplyFilters = () => {
    setAppliedFilters(filters);
    setNearbyMode(false);
    setNearbyParams(null);
    setError(null);
    void refetch();
  };

  const handleResetFilters = () => {
    const empty = { categoryId: "", priceFrom: "", priceTo: "" };
    setFilters(empty);
    setAppliedFilters(empty);
    setNearbyMode(false);
    setNearbyParams(null);
    setError(null);
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

  const adsToDisplay = nearbyMode ? nearbyAds : ads;
  const loading = nearbyMode ? loadingNearby : loadingAds;

  useEffect(() => {
    if (!adsToDisplay.length) return;

    const [firstWithCoords] = adsToDisplay.filter((item) => item.location?.coordinates);
    if (firstWithCoords?.location?.coordinates) {
      const [lng, lat] = firstWithCoords.location.coordinates;
      setMapCenter((current) => current ?? { lat, lng });
    }
  }, [adsToDisplay]);

  const mapCenterValue = useMemo(() => {
    if (mapCenter) return mapCenter;
    if (!adsToDisplay.length) return null;
    const coords = adsToDisplay
      .map((ad) => ad.location?.coordinates)
      .filter(Boolean) as [number, number][];
    if (!coords.length) return null;
    const avgLat = coords.reduce((sum, [, lat]) => sum + lat, 0) / coords.length;
    const avgLng = coords.reduce((sum, [lng]) => sum + lng, 0) / coords.length;
    return { lat: avgLat, lng: avgLng };
  }, [adsToDisplay, mapCenter]);

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
            <button onClick={handleApplyFilters}>Применить</button>
            <button onClick={handleResetFilters} className="secondary">
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

      {mapCenterValue && adsToDisplay.some((ad) => ad.location?.coordinates) && (
        <AdsMap ads={adsToDisplay} center={mapCenterValue} onMarkerClick={(id) => navigate(`/ads/${id}`)} />
      )}

      <div className="ads-grid">
        {adsToDisplay.map((ad) => (
          <AdCard key={ad._id} ad={ad} isFavorite={favoriteIds.includes(ad._id)} onToggleFavorite={toggleFavorite} />
        ))}
      </div>

      {nearbyMode && <p className="muted">Показаны результаты рядом с вашим местоположением.</p>}
    </div>
  );
}
