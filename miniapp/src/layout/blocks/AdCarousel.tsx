import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useState, useRef} from 'react';

interface AdCarouselProps {
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

export default function AdCarousel(props: AdCarouselProps) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

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

  const { data: adsData, isLoading } = useQuery<any>({
    queryKey: [...queryKey, queryParams],
    enabled: dataSource !== 'manual' && queryKey.length > 0,
  });

  const ads: any[] = Array.isArray(adsData)
    ? adsData
    : Array.isArray(adsData?.ads)
      ? adsData.ads
      : Array.isArray(adsData?.items)
        ? adsData.items
        : Array.isArray(adsData?.data)
          ? adsData.data
          : [];

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
  };

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = 300;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  if (isLoading) {
    return (
      <div data-testid="ad-carousel-loading">
        <h3 style={{ margin: '0 0 12px', fontSize: '1.125rem', fontWeight: 600 }}>
          {title}
        </h3>
        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto' }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton" style={{ minWidth: '200px', height: '250px', borderRadius: 'var(--radius-md)' }} />
          ))}
        </div>
      </div>
    );
  }

  if (!ads || ads.length === 0) {
    return null;
  }

  return (
    <div style={{ position: 'relative' }} data-testid="ad-carousel">
      <h3
        style={{
          margin: '0 0 12px',
          fontSize: '1.125rem',
          fontWeight: 600,
          color: 'var(--color-primary)',
        }}
        data-testid="carousel-title"
      >
        {title}
      </h3>

      {showLeftArrow && (
        <button
          onClick={() => scroll('left')}
          className="ghost"
          style={{
            position: 'absolute',
            left: '-8px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'var(--bg-primary)',
            boxShadow: 'var(--shadow-md)',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
          }}
          aria-label="Scroll left"
        >
          ←
        </button>
      )}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          display: 'flex',
          gap: '12px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
        className="category-scroll"
      >
        {ads.map((ad: any) => (
          <div
            key={ad._id}
            onClick={() => navigate(`/ads/${ad._id}`)}
            className="card"
            style={{
              minWidth: '200px',
              maxWidth: '200px',
              cursor: 'pointer',
              padding: '12px',
            }}
            data-testid={`ad-card-${ad._id}`}
          >
            {ad.photos?.[0] && (
              <img
                src={ad.photos[0]}
                alt={ad.title}
                loading="lazy"
                decoding="async"
                style={{
                  width: '100%',
                  height: '150px',
                  objectFit: 'cover',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '8px',
                }}
              />
            )}
            <div
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--color-primary)',
                marginBottom: '4px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {ad.title}
            </div>
            <div
              style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: 'var(--color-primary)',
              }}
            >
              {ad.price ? `${ad.price} BYN` : 'Цена не указана'}
            </div>
            {ad.city && (
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--color-secondary)',
                  marginTop: '4px',
                }}
              >
                {ad.city}
              </div>
            )}
          </div>
        ))}
      </div>

      {showRightArrow && (
        <button
          onClick={() => scroll('right')}
          className="ghost"
          style={{
            position: 'absolute',
            right: '-8px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'var(--bg-primary)',
            boxShadow: 'var(--shadow-md)',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
          }}
          aria-label="Scroll right"
        >
          →
        </button>
      )}
    </div>
  );
}
