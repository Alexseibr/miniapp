import { QueryClient, QueryFunction, QueryKey } from '@tanstack/react-query';
import http from '@/api/http';

const defaultQueryFn: QueryFunction<any, QueryKey> = async ({ queryKey }) => {
  const [url, params] = queryKey;
  
  if (typeof url !== 'string') {
    throw new Error('Query key must start with a string URL');
  }

  let fullUrl = url;
  if (params && typeof params === 'object' && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    fullUrl = `${url}?${searchParams.toString()}`;
  }

  const response = await http.get(fullUrl);
  return response.data;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: defaultQueryFn,
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
