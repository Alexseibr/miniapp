import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

interface Trend {
  id: string;
  categorySlug: string;
  categoryName: string;
  brandKey: string | null;
  brandName: string | null;
  citySlug: string;
  cityName: string;
  eventType: 'DEMAND_SPIKE' | 'SUPPLY_SPIKE';
  deltaPercent: number;
  period: string;
  message: string;
  createdAt: string;
}

interface UseTrendsOptions {
  lat?: number;
  lng?: number;
  radiusKm?: number;
  limit?: number;
  scope?: 'local' | 'country';
  enabled?: boolean;
}

interface UseTrendsResult {
  trends: Trend[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useTrends(options: UseTrendsOptions = {}): UseTrendsResult {
  const {
    lat,
    lng,
    radiusKm = 10,
    limit = 5,
    scope = 'local',
    enabled = true,
  } = options;

  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchTrends = useCallback(async () => {
    if (!enabled) {
      setTrends([]);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const endpoint = scope === 'country' ? '/api/trends/country' : '/api/trends/local';
      const params: Record<string, string | number> = { limit };

      if (scope === 'local') {
        if (lat !== undefined && lng !== undefined) {
          params.lat = lat;
          params.lng = lng;
        }
        params.radiusKm = radiusKm;
      }

      const response = await axios.get(endpoint, {
        params,
        signal: controller.signal,
      });

      if (!controller.signal.aborted && response.data.ok) {
        setTrends(response.data.trends || []);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError' && err.name !== 'CanceledError') {
        console.error('[useTrends] Error fetching trends:', err);
        setError(err.message || 'Failed to fetch trends');
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [lat, lng, radiusKm, limit, scope, enabled]);

  useEffect(() => {
    fetchTrends();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchTrends]);

  return {
    trends,
    loading,
    error,
    refetch: fetchTrends,
  };
}
