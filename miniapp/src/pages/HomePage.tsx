import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import FilterPanel, { FilterState } from '@/components/FilterPanel';
import AdCard from '@/components/AdCard';
import EmptyState from '@/widgets/EmptyState';
import { useUserStore } from '@/store/useUserStore';
import { listAds } from '@/api/ads';
import { AdPreview } from '@/types';

export default function HomePage() {
  const { cityCode, initialize, status: userStatus } = useUserStore();
  const [filters, setFilters] = useState<FilterState>({
    sort: 'createdAt_desc'
  });
  const [pages, setPages] = useState<Record<string, number>>({});
  const limit = 20;
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const filtersKey = JSON.stringify(filters);
  const currentPage = pages[filtersKey] || 1;

  const { data: adsData, isLoading, isFetching } = useQuery({
    queryKey: ['/api/ads/search', filtersKey, currentPage],
    queryFn: () => listAds({
      ...(filters.categoryId && { categoryId: filters.categoryId }),
      ...(filters.minPrice && { minPrice: filters.minPrice }),
      ...(filters.maxPrice && { maxPrice: filters.maxPrice }),
      sort: filters.sort,
      page: currentPage,
      limit
    }),
    enabled: userStatus !== 'loading',
  });

  const [adsMap, setAdsMap] = useState<Record<string, AdPreview[]>>({});
  const allAds = adsMap[filtersKey] || [];
  const total = adsData?.total || 0;
  const hasMore = allAds.length < total && (adsData?.items?.length || 0) >= limit;

  useEffect(() => {
    if (adsData?.items && !isFetching) {
      setAdsMap(prev => {
        const existing = prev[filtersKey] || [];
        if (currentPage === 1) {
          return { ...prev, [filtersKey]: adsData.items };
        } else {
          const newIds = new Set(adsData.items.map(ad => ad._id));
          const filtered = existing.filter(ad => !newIds.has(ad._id));
          return { ...prev, [filtersKey]: [...filtered, ...adsData.items] };
        }
      });
    }
  }, [adsData, filtersKey, currentPage, isFetching]);

  const handleFilterChange = (newFilters: FilterState) => {
    const newFiltersKey = JSON.stringify(newFilters);
    setPages(prev => ({ ...prev, [newFiltersKey]: 1 }));
    setFilters(newFilters);
  };

  const handleLoadMore = useCallback(() => {
    if (!isFetching && hasMore) {
      setPages(prev => ({ ...prev, [filtersKey]: currentPage + 1 }));
    }
  }, [isFetching, hasMore, filtersKey, currentPage]);

  useEffect(() => {
    if (!adsData || total === 0 || isFetching || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          handleLoadMore();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, isFetching, handleLoadMore, total, adsData]);

  return (
    <div className="app-shell">
      <Header />
      
      <main style={{ paddingBottom: '16px' }}>
        <div className="container">
          {userStatus === 'loading' ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
                <Loader2 
                  size={48} 
                  color="var(--color-primary)" 
                  className="loading-spinner"
                  data-testid="icon-loading" 
                />
              </div>
              <h3 style={{ margin: '0 0 8px', color: 'var(--color-primary)' }}>
                Загружаем контент
              </h3>
              <p style={{ color: 'var(--color-secondary)', margin: 0 }}>
                Настраиваем маркетплейс • Подождите несколько секунд
              </p>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '16px' }}>
                <h1 
                  style={{ 
                    margin: '0 0 4px', 
                    fontSize: '1.5rem', 
                    fontWeight: 700,
                    color: 'var(--color-primary)' 
                  }}
                  data-testid="text-page-title"
                >
                  Все объявления
                </h1>
                {total > 0 && (
                  <p 
                    style={{ 
                      margin: 0, 
                      fontSize: '0.875rem', 
                      color: 'var(--color-secondary)' 
                    }}
                    data-testid="text-total-ads"
                  >
                    Найдено {total} {total === 1 ? 'объявление' : total < 5 ? 'объявления' : 'объявлений'}
                  </p>
                )}
              </div>

              <FilterPanel filters={filters} onChange={handleFilterChange} />

              {isLoading && currentPage === 1 ? (
                <div className="ads-grid" data-testid="ads-grid-loading">
                  {[...Array(12)].map((_, i) => (
                    <div 
                      key={i} 
                      className="skeleton" 
                      style={{ aspectRatio: '1 / 1.3', borderRadius: 'var(--radius-md)' }} 
                    />
                  ))}
                </div>
              ) : allAds.length > 0 ? (
                <>
                  <div className="ads-grid" data-testid="ads-grid">
                    {allAds.map((ad: AdPreview) => (
                      <AdCard key={ad._id} ad={ad} showActions={true} />
                    ))}
                  </div>

                  <div 
                    ref={observerTarget} 
                    style={{ height: '20px', width: '100%' }}
                    data-testid="infinite-scroll-trigger"
                  />

                  {isFetching && currentPage > 1 && (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '24px 0',
                      display: 'flex',
                      justifyContent: 'center',
                      gap: '12px'
                    }}>
                      <Loader2 
                        size={24} 
                        color="var(--color-primary)" 
                        className="loading-spinner"
                        data-testid="icon-loading-more" 
                      />
                      <span style={{ color: 'var(--color-secondary)' }}>
                        Загружаем ещё...
                      </span>
                    </div>
                  )}

                  {!hasMore && (
                    <div style={{ textAlign: 'center', padding: '24px 0' }}>
                      <p style={{ 
                        margin: 0, 
                        fontSize: '0.875rem', 
                        color: 'var(--color-secondary)' 
                      }}>
                        Показано все объявления ({allAds.length})
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <EmptyState 
                  title="Объявления не найдены" 
                  description={
                    filters.categoryId || filters.minPrice || filters.maxPrice
                      ? "Попробуйте изменить фильтры или сбросить их"
                      : "Здесь пока нет объявлений. Будьте первым!"
                  }
                />
              )}
            </>
          )}
        </div>
      </main>

      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'var(--bg-primary)',
          borderTop: '1px solid var(--color-secondary-soft)',
          padding: '12px clamp(16px, 3vw, 28px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: 'var(--shadow-md)',
          zIndex: 50,
        }}
        data-testid="bottom-bar"
      >
        <div style={{ display: 'flex', flexDirection: 'column' }} data-testid="bottom-bar-branding">
          <span 
            style={{ 
              fontSize: '0.75rem', 
              color: 'var(--color-secondary)', 
              marginBottom: '2px' 
            }} 
            data-testid="text-marketplace-label"
          >
            {cityCode || 'Маркетплейс'}
          </span>
          <span 
            style={{ 
              fontSize: '1rem', 
              fontWeight: 600, 
              color: 'var(--color-primary)' 
            }} 
            data-testid="text-brand-name"
          >
            KETMAR Market
          </span>
        </div>
        
        {total > 0 && (
          <div
            style={{
              backgroundColor: 'var(--color-primary)',
              color: '#FFFFFF',
              padding: '8px 16px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
            data-testid="badge-ad-count"
          >
            {total} {total === 1 ? 'объявление' : total < 5 ? 'объявления' : 'объявлений'}
          </div>
        )}
      </div>
    </div>
  );
}
