import { queryClient } from '@/lib/queryClient';

export async function prefetchCriticalData() {
  if (typeof window === 'undefined') return;

  const doPrefetch = async () => {
    try {
      await Promise.all([
        queryClient.prefetchQuery({
          queryKey: ['/api/categories'],
          staleTime: 1000 * 60 * 30,
        }),
        queryClient.prefetchQuery({
          queryKey: ['/api/ads/search', JSON.stringify({}), 1],
          staleTime: 1000 * 60 * 5,
        }),
      ]);
      
      console.log('✅ Critical data prefetched');
    } catch (error) {
      console.warn('⚠️ Prefetch failed (non-critical):', error);
    }
  };

  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => doPrefetch(), { timeout: 2000 });
  } else {
    setTimeout(doPrefetch, 100);
  }
}
