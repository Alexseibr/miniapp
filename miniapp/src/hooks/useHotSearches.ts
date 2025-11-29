import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

interface HotSearch {
  query: string;
  normalizedQuery: string;
  count: number;
  hourlyCount?: number;
}

interface UseHotSearchesOptions {
  lat?: number;
  lng?: number;
  limit?: number;
  scope?: 'local' | 'country';
  enabled?: boolean;
}

interface UseHotSearchesResult {
  searches: HotSearch[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useHotSearches(options: UseHotSearchesOptions = {}): UseHotSearchesResult {
  const {
    lat,
    lng,
    limit = 10,
    scope = 'local',
    enabled = true,
  } = options;

  const [searches, setSearches] = useState<HotSearch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchHotSearches = useCallback(async () => {
    if (!enabled) {
      setSearches([]);
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
      const params: Record<string, string | number> = { limit, scope };

      if (scope === 'local' && lat !== undefined && lng !== undefined) {
        params.lat = lat;
        params.lng = lng;
      }

      const response = await axios.get('/api/search/hot', {
        params,
        signal: controller.signal,
      });

      if (!controller.signal.aborted && response.data.ok) {
        setSearches(response.data.searches || []);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError' && err.name !== 'CanceledError') {
        console.error('[useHotSearches] Error:', err);
        setError(err.message || 'Failed to fetch hot searches');
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [lat, lng, limit, scope, enabled]);

  useEffect(() => {
    fetchHotSearches();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchHotSearches]);

  return {
    searches,
    loading,
    error,
    refetch: fetchHotSearches,
  };
}
