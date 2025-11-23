import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';

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
  const [, setLocation] = useLocation();

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
  
  const ads: any[] = dataSource === 'manual'
    ? (manualAdsData?.ads || [])
    : (adsData?.ads || adsData || []);

  if (isLoading) {
    return (
      <div data-testid="ad-list-loading">
        <h3 style={{ margin: '0 0 12px', fontSize: '1.125rem', fontWeight: 600 }}>
          {title}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '120px', borderRadius: 'var(--radius-md)' }} />
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
      <h3
        style={{
          margin: '0 0 12px',
          fontSize: '1.125rem',
          fontWeight: 600,
          color: 'var(--color-primary)',
        }}
        data-testid="ad-list-title"
      >
        {title}
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {ads.map((ad: any) => (
          <div
            key={ad._id}
            onClick={() => setLocation(`/ads/${ad._id}`)}
            className="card"
            style={{
              cursor: 'pointer',
              padding: '12px',
              display: 'flex',
              gap: '12px',
              transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            data-testid={`ad-item-${ad._id}`}
          >
            {ad.photos && ad.photos.length > 0 && (
              <img
                src={ad.photos[0]}
                alt={ad.title}
                loading="lazy"
                decoding="async"
                style={{
                  width: '100px',
                  height: '100px',
                  objectFit: 'cover',
                  borderRadius: 'var(--radius-md)',
                  flexShrink: 0,
                }}
              />
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <h4
                style={{
                  margin: '0 0 4px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: 'var(--color-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                data-testid={`ad-title-${ad._id}`}
              >
                {ad.title}
              </h4>

              <p
                style={{
                  margin: '0 0 8px',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: 'var(--color-accent-highlight)',
                }}
                data-testid={`ad-price-${ad._id}`}
              >
                {ad.price} BYN
              </p>

              <p
                style={{
                  margin: 0,
                  fontSize: '0.875rem',
                  color: 'var(--color-secondary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {ad.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
