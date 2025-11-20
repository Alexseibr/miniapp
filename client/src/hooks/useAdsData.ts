import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { applyCdnToMedia } from "@/lib/cdn";
import type { Ad } from "@/types/ad";

function withCdn(ad: Ad): Ad {
  const images = ad.images?.length ? ad.images : ad.photos;
  const resolvedImages = applyCdnToMedia(images);

  return {
    ...ad,
    images: resolvedImages,
    photos: resolvedImages,
  };
}

function normalizeAdsResponse(data: any): Ad[] {
  const items: Ad[] = Array.isArray(data) ? data : data?.items ?? [];
  return items.map((item) => withCdn(item as Ad));
}

export function useAdsList(filters: Record<string, unknown>) {
  return useQuery<Ad[]>({
    queryKey: ["ads", "list", filters],
    queryFn: async () => {
      const { data } = await api.get("/ads", { params: filters });
      return normalizeAdsResponse(data);
    },
    staleTime: 60_000,
    gcTime: 300_000,
    keepPreviousData: true,
  });
}

export function useAdDetails(id?: string) {
  return useQuery<Ad | null>({
    queryKey: ["ads", "details", id],
    enabled: Boolean(id),
    queryFn: async () => {
      if (!id) return null;
      const { data } = await api.get(`/ads/${id}`);
      const ad = (data?.ad || data) as Ad | undefined;
      return ad ? withCdn(ad) : null;
    },
    staleTime: 300_000,
    gcTime: 900_000,
    retry: 1,
  });
}

export function useNearbyAds(params?: Record<string, unknown> | null) {
  return useQuery<Ad[]>({
    queryKey: ["ads", "nearby", params],
    enabled: params != null && params.lat != null && params.lng != null,
    queryFn: async () => {
      if (!params) return [];
      const { data } = await api.get("/ads/nearby", { params });
      return normalizeAdsResponse(data);
    },
    staleTime: 30_000,
    gcTime: 120_000,
    keepPreviousData: true,
  });
}
