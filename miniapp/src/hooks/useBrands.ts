import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

interface Brand {
  brandKey: string;
  name: string;
  icon: string;
  count: number;
  countLocal: number;
}

interface UseBrandsOptions {
  categorySlug?: string;
  categoryId?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  citySlug?: string;
  scope?: 'local' | 'country';
  enabled?: boolean;
}

interface UseBrandsResult {
  brands: Brand[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useBrands(options: UseBrandsOptions): UseBrandsResult {
  const {
    categorySlug,
    categoryId,
    lat,
    lng,
    radiusKm,
    citySlug,
    scope = 'local',
    enabled = true,
  } = options;

  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchBrands = useCallback(async () => {
    if (!enabled || (!categorySlug && !categoryId)) {
      setBrands([]);
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
      const params: Record<string, string | number> = { scope };

      if (categorySlug) {
        params.categorySlug = categorySlug;
      } else if (categoryId) {
        params.categoryId = categoryId;
      }

      if (lat !== undefined && lng !== undefined) {
        params.lat = lat;
        params.lng = lng;
      }

      if (radiusKm !== undefined) {
        params.radiusKm = radiusKm;
      }

      if (citySlug) {
        params.citySlug = citySlug;
      }

      const response = await axios.get('/api/categories/brands', {
        params,
        signal: controller.signal,
      });

      if (!controller.signal.aborted && response.data.ok) {
        setBrands(response.data.brands || []);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError' && err.name !== 'CanceledError') {
        console.error('[useBrands] Error fetching brands:', err);
        setError(err.message || 'Failed to fetch brands');
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [categorySlug, categoryId, lat, lng, radiusKm, citySlug, scope, enabled]);

  useEffect(() => {
    fetchBrands();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchBrands]);

  return {
    brands,
    loading,
    error,
    refetch: fetchBrands,
  };
}

export function useCategoryBrands(
  categorySlug: string,
  options: Omit<UseBrandsOptions, 'categorySlug' | 'categoryId'>
): UseBrandsResult {
  return useBrands({ ...options, categorySlug });
}
