import { useQuery } from '@tanstack/react-query';
import AdCard from '@/components/AdCard';

interface AdListProps {
  title?: string;
  dataSource?: 'trending' | 'search' | 'manual';
  cityCode?: string;
  categorySlug?: string;
  seasonCode?: string;
  limit?: number;
  adIds?: string[];
  config?: {
    title?: string;
    dataSource?: string;
    cityCode?: string;
    categorySlug?: string;
    seasonCode?: string;
    limit?: number;
    adIds?: string[];
  };
}

export default function AdList(props: AdListProps) {

  const title = props.title || props.config?.title || 'Объявления';
  const dataSource = props.dataSource || props.config?.dataSource || 'search';
  const cityCode = props.cityCode || props.config?.cityCode;
  const categorySlug = props.categorySlug || props.config?.categorySlug;
  const seasonCode = props.seasonCode || props.config?.seasonCode;
  const limit = props.limit || props.config?.limit || 10;
  const adIds = props.adIds || props.config?.adIds || [];

  let queryKey: any[] = [];
  let queryParams: Record<string, any> = {};

  if (dataSource === 'trending' && cityCode) {
    queryKey = ['/api/ads/trending'];
    queryParams = { cityCode, limit };
  } else if (dataSource === 'search') {
    queryKey = ['/api/ads/search'];
    queryParams = {
      ...(cityCode && { cityCode }),
      ...(categorySlug && { categorySlug }),
      ...(seasonCode && { seasonCode }),
      limit,
    };
  }

  const { data: adsData, isLoading: isLoadingQuery } = useQuery<any>({
    queryKey: [...queryKey, queryParams],
    enabled: dataSource !== 'manual' && queryKey.length > 0,
  });

  const { data: manualAdsData, isLoading: isLoadingManual } = useQuery<any>({
    queryKey: ['/api/ads/by-ids', { ids: adIds }],
    enabled: dataSource === 'manual' && adIds.length > 0,
  });

  const isLoading = dataSource === 'manual' ? isLoadingManual : isLoadingQuery;
  
  const rawData = dataSource === 'manual' ? manualAdsData : adsData;
  
  const ads: any[] = Array.isArray(rawData)
    ? rawData
    : Array.isArray(rawData?.ads)
      ? rawData.ads
      : Array.isArray(rawData?.items)
        ? rawData.items
        : Array.isArray(rawData?.data)
          ? rawData.data
          : [];

  if (isLoading) {
    return (
      <div data-testid="ad-list-loading">
        <h3 style={{ margin: '0 0 12px', fontSize: '1.125rem', fontWeight: 600 }}>
          {title}
        </h3>
        <div className="ads-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton" style={{ aspectRatio: '1 / 1.3', borderRadius: 'var(--radius-md)' }} />
          ))}
        </div>
      </div>
    );
  }

  if (!ads || ads.length === 0) {
    return null;
  }

  return (
    <div data-testid="ad-list">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3
          style={{
            margin: 0,
            fontSize: '1.125rem',
            fontWeight: 600,
            color: 'var(--color-primary)',
          }}
          data-testid="ad-list-title"
        >
          {title}
        </h3>
        <span style={{ fontSize: '0.875rem', color: 'var(--color-secondary)' }}>
          {ads.length} {ads.length === 1 ? 'объявление' : ads.length < 5 ? 'объявления' : 'объявлений'}
        </span>
      </div>

      <div className="ads-grid">
        {ads.map((ad: any) => (
          <AdCard key={ad._id} ad={ad} showActions={false} />
        ))}
      </div>
    </div>
  );
}
