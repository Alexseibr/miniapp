import { useState, useEffect, useCallback, useRef } from 'react';
import { listNearbyAds } from '@/api/ads';
import { AdPreview } from '@/types';

interface UseNearbyAdsParams {
  coords: { lat: number; lng: number } | null;
  radiusKm: number;
  categoryId?: string | null;
  subcategoryId?: string | null;
  query?: string | null;
  enabled?: boolean;
}

interface UseNearbyAdsResult {
  ads: AdPreview[];
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  hasVeryFew: boolean;
  increaseRadius: () => void;
}

const DEBOUNCE_MS = 400;

export function useNearbyAds({
  coords,
  radiusKm,
  categoryId,
  subcategoryId,
  query,
  enabled = true,
}: UseNearbyAdsParams): UseNearbyAdsResult {
  const [ads, setAds] = useState<AdPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadAds = useCallback(async () => {
    if (!coords || !enabled) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setLoading(false);
      setAds([]);
      setError(null);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const currentController = new AbortController();
    abortControllerRef.current = currentController;
    setLoading(true);
    setError(null);

    try {
      const response = await listNearbyAds({
        lat: coords.lat,
        lng: coords.lng,
        radiusKm,
        sort: 'distance',
        categoryId: categoryId || undefined,
        subcategoryId: subcategoryId || undefined,
        q: query || undefined,
        limit: 50,
        signal: currentController.signal,
      });

      if (!currentController.signal.aborted) {
        setAds(response.items || []);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      
      if (!currentController.signal.aborted) {
        console.error('useNearbyAds error:', err);
        setError(err.message || 'Не удалось загрузить объявления');
      }
    } finally {
      if (!currentController.signal.aborted) {
        setLoading(false);
      }
    }
  }, [coords, radiusKm, categoryId, subcategoryId, query, enabled]);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      loadAds();
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadAds]);

  const isEmpty = ads.length === 0 && !loading;
  const hasVeryFew = ads.length > 0 && ads.length <= 2 && !loading;

  const increaseRadius = useCallback(() => {
    // Логика увеличения радиуса реализуется в родительском компоненте
    // Этот callback просто для удобства
  }, []);

  return {
    ads,
    loading,
    error,
    isEmpty,
    hasVeryFew,
    increaseRadius,
  };
}
