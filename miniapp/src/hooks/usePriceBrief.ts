import { useEffect, useState } from 'react';
import { getPriceBrief, PriceBriefResponse } from '@/api/pricing';

const briefCache = new Map<string, { data: PriceBriefResponse; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000;

export function usePriceBrief(adId: string | undefined) {
  const [data, setData] = useState<PriceBriefResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!adId) {
      setData(null);
      return;
    }

    const cached = briefCache.get(adId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setData(cached.data);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getPriceBrief(adId)
      .then((result) => {
        if (!cancelled) {
          briefCache.set(adId, { data: result, timestamp: Date.now() });
          setData(result);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn('[usePriceBrief] Error:', err.message);
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [adId]);

  return { data, loading };
}

export function clearPriceBriefCache() {
  briefCache.clear();
}

export function prefetchPriceBriefs(adIds: string[]) {
  const uncachedIds = adIds.filter((id) => {
    const cached = briefCache.get(id);
    return !cached || Date.now() - cached.timestamp >= CACHE_TTL;
  });

  if (uncachedIds.length === 0) {
    return Promise.resolve();
  }

  return import('@/api/pricing').then(({ getPriceBriefBatch }) =>
    getPriceBriefBatch(uncachedIds).then(({ items }) => {
      items.forEach((item) => {
        briefCache.set(item.adId, { data: item, timestamp: Date.now() });
      });
    })
  );
}
