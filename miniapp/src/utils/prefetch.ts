import { queryClient } from '@/lib/queryClient';

export async function prefetchCriticalData() {
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
}
