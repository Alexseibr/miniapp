import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MapPin, Home, SlidersHorizontal, ChevronDown, X, Search, Globe } from 'lucide-react';
import RadiusControl from '@/components/RadiusControl';
import NearbyAdsGrid from '@/components/NearbyAdsGrid';
import CategoriesSheet from '@/components/CategoriesSheet';
import BrandFilter from '@/components/BrandFilter';
import EmptySearchResult from '@/components/EmptySearchResult';
import { useGeo } from '@/utils/geo';
import { useNearbyAds } from '@/hooks/useNearbyAds';
import { useCategoriesStore } from '@/hooks/useCategoriesStore';
import { getNearbyStats, listNearbyAds, listAds } from '@/api/ads';
import { CategoryStat, AdPreview } from '@/types';

type ScopeType = 'local' | 'country';

export default function FeedPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { coords, status: geoStatus, requestLocation, radiusKm, setRadius } = useGeo();
  const { categories, loading: categoriesLoading, loadCategories } = useCategoriesStore();
  
  const [showCategoriesSheet, setShowCategoriesSheet] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [totalAds, setTotalAds] = useState(0);
  const [scope, setScope] = useState<ScopeType>('local');
  const [fallbackNearbyAds, setFallbackNearbyAds] = useState<AdPreview[]>([]);
  
  const statsAbortRef = useRef<AbortController | null>(null);
  const fallbackAbortRef = useRef<AbortController | null>(null);
  
  const searchQuery = searchParams.get('q') || '';
  const urlCategoryId = searchParams.get('categoryId');

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (urlCategoryId && urlCategoryId !== selectedCategoryId) {
      setSelectedCategoryId(urlCategoryId);
    }
  }, [urlCategoryId]);

  const loadCategoryStats = useCallback(async () => {
    if (scope === 'local' && !coords) return;

    if (statsAbortRef.current) {
      statsAbortRef.current.abort();
    }

    const controller = new AbortController();
    statsAbortRef.current = controller;

    try {
      const response = await getNearbyStats({
        lat: scope === 'country' ? undefined : coords?.lat,
        lng: scope === 'country' ? undefined : coords?.lng,
        radiusKm: scope === 'country' ? undefined : radiusKm,
        signal: controller.signal,
      });

      if (!controller.signal.aborted) {
        setCategoryStats(response.stats);
        setTotalAds(response.total);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError' && err.name !== 'CanceledError') {
        console.error('Failed to load category stats:', err);
      }
    }
  }, [coords, radiusKm, scope]);

  useEffect(() => {
    loadCategoryStats();
    return () => {
      if (statsAbortRef.current) {
        statsAbortRef.current.abort();
      }
    };
  }, [loadCategoryStats]);

  const { ads, loading: adsLoading, isEmpty, hasVeryFew } = useNearbyAds({
    coords,
    radiusKm,
    categoryId: selectedCategoryId || undefined,
    query: searchQuery || undefined,
    scope,
    enabled: scope === 'country' || !!coords,
  });

  const isEmptySearch = !adsLoading && ads.length === 0 && !!searchQuery && (scope === 'country' || !!coords);

  const loadFallbackNearbyAds = useCallback(async () => {
    if (!isEmptySearch) {
      setFallbackNearbyAds([]);
      return;
    }

    if (fallbackAbortRef.current) {
      fallbackAbortRef.current.abort();
    }

    const controller = new AbortController();
    fallbackAbortRef.current = controller;

    try {
      let response;
      
      if (scope === 'country' || !coords) {
        response = await listAds({
          sort: 'newest',
          categoryId: selectedCategoryId || undefined,
          limit: 10,
          signal: controller.signal,
        });
      } else {
        response = await listNearbyAds({
          lat: coords.lat,
          lng: coords.lng,
          radiusKm,
          categoryId: selectedCategoryId || undefined,
          sort: 'distance',
          limit: 10,
          signal: controller.signal,
        });
      }

      if (!controller.signal.aborted) {
        setFallbackNearbyAds(response.items || []);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError' && err.name !== 'CanceledError') {
        console.error('Failed to load fallback ads:', err);
      }
    }
  }, [isEmptySearch, coords, radiusKm, scope, selectedCategoryId]);

  useEffect(() => {
    loadFallbackNearbyAds();
    return () => {
      if (fallbackAbortRef.current) {
        fallbackAbortRef.current.abort();
      }
    };
  }, [loadFallbackNearbyAds]);

  const needsLocation = scope === 'local' && !coords && geoStatus !== 'loading';

  const handleSelectCategory = (categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
    setShowCategoriesSheet(false);
  };

  const handleClearCategory = () => {
    setSelectedCategoryId(null);
  };

  const handleIncreaseRadius = () => {
    const newRadius = Math.min(radiusKm + 5, 100);
    setRadius(newRadius);
  };

  const selectedCategory = selectedCategoryId
    ? categories.find((c) => c.slug === selectedCategoryId)
    : null;

  const selectedCategoryCount = selectedCategoryId
    ? categoryStats.find((s) => s.categoryId === selectedCategoryId)?.count || 0
    : totalAds;

  return (
    <div style={{ 
      paddingBottom: 90, 
      background: '#000000', 
      minHeight: '100vh',
      position: 'relative',
    }}>
      {/* Background gradients */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: `
          radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.06), transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(124, 58, 237, 0.05), transparent 50%)
        `,
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          background: 'rgba(10, 15, 26, 0.95)',
          backdropFilter: 'blur(20px)',
          zIndex: 10,
          borderBottom: '1px solid rgba(59, 130, 246, 0.15)',
          padding: '14px 16px',
        }}
      >
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.5), transparent)',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              background: 'linear-gradient(135deg, #3B82F6, #7C3AED)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 12,
              cursor: 'pointer',
              boxShadow: '0 0 15px rgba(59, 130, 246, 0.4)',
            }}
            data-testid="button-home"
          >
            <Home size={22} />
          </button>
          <h1 style={{ 
            flex: 1, 
            margin: 0, 
            fontSize: 18, 
            fontWeight: 700, 
            color: '#F8FAFC',
            textShadow: '0 0 20px rgba(59, 130, 246, 0.3)',
          }}>
            {searchQuery 
              ? `Поиск: "${searchQuery}"` 
              : scope === 'country' 
                ? 'Вся страна' 
                : 'Рядом со мной'}
          </h1>
        </div>
        
        {searchQuery && (
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                padding: '8px 14px',
                borderRadius: 12,
                backdropFilter: 'blur(10px)',
              }}
            >
              <Search size={16} color="#3B82F6" />
              <span style={{ 
                fontSize: 14, 
                fontWeight: 600, 
                color: '#3B82F6',
                textShadow: '0 0 10px rgba(59, 130, 246, 0.3)',
              }}>
                {searchQuery}
              </span>
              <button
                onClick={() => {
                  const newParams = new URLSearchParams(searchParams);
                  newParams.delete('q');
                  setSearchParams(newParams);
                }}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  border: 'none',
                  background: 'linear-gradient(135deg, #3B82F6, #7C3AED)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  marginLeft: 4,
                }}
                data-testid="button-clear-search"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Geo Request */}
      {needsLocation ? (
        <div style={{ padding: 20, position: 'relative', zIndex: 1 }}>
          <div
            style={{
              background: 'rgba(10, 15, 26, 0.8)',
              borderRadius: 20,
              padding: 32,
              textAlign: 'center',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div style={{
              width: 80,
              height: 80,
              margin: '0 auto 24px',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(124, 58, 237, 0.2))',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 30px rgba(59, 130, 246, 0.3)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
            }}>
              <MapPin 
                size={36} 
                color="#3B82F6" 
                style={{ filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.5))' }}
              />
            </div>
            <h2 style={{ 
              fontSize: 22, 
              fontWeight: 700, 
              margin: '0 0 12px', 
              color: '#F8FAFC',
              textShadow: '0 0 20px rgba(59, 130, 246, 0.3)',
            }}>
              Определите местоположение
            </h2>
            <p style={{ 
              fontSize: 15, 
              color: '#94A3B8', 
              margin: '0 0 24px', 
              lineHeight: 1.5 
            }}>
              Чтобы показать объявления рядом с вами
            </p>
            <button
              onClick={requestLocation}
              disabled={geoStatus === 'loading'}
              style={{
                width: '100%',
                padding: '16px',
                background: 'linear-gradient(135deg, #3B82F6, #7C3AED)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 14,
                fontSize: 16,
                fontWeight: 600,
                cursor: geoStatus === 'loading' ? 'not-allowed' : 'pointer',
                opacity: geoStatus === 'loading' ? 0.6 : 1,
                minHeight: 52,
                boxShadow: '0 0 25px rgba(59, 130, 246, 0.4)',
              }}
              data-testid="button-request-location"
            >
              {geoStatus === 'loading' ? 'Получаем геолокацию...' : 'Определить местоположение'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Scope Toggle */}
          <div style={{ padding: '16px 16px 8px' }}>
            <div
              style={{
                display: 'flex',
                background: 'rgba(10, 15, 26, 0.8)',
                border: '1px solid rgba(59, 130, 246, 0.15)',
                borderRadius: 14,
                padding: 4,
                backdropFilter: 'blur(10px)',
              }}
            >
              <button
                onClick={() => setScope('local')}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: scope === 'local' 
                    ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(124, 58, 237, 0.2))' 
                    : 'transparent',
                  border: scope === 'local' 
                    ? '1px solid rgba(59, 130, 246, 0.4)' 
                    : '1px solid transparent',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  color: scope === 'local' ? '#3B82F6' : '#64748B',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: scope === 'local' ? '0 0 15px rgba(59, 130, 246, 0.2)' : 'none',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                data-testid="button-scope-local"
              >
                <MapPin size={18} />
                Рядом со мной
              </button>
              <button
                onClick={() => setScope('country')}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: scope === 'country' 
                    ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(124, 58, 237, 0.2))' 
                    : 'transparent',
                  border: scope === 'country' 
                    ? '1px solid rgba(59, 130, 246, 0.4)' 
                    : '1px solid transparent',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  color: scope === 'country' ? '#3B82F6' : '#64748B',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: scope === 'country' ? '0 0 15px rgba(59, 130, 246, 0.2)' : 'none',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                data-testid="button-scope-country"
              >
                <Globe size={18} />
                Вся страна
              </button>
            </div>
          </div>

          {/* RadiusControl - only for local scope */}
          {scope === 'local' && (
            <div style={{ padding: '12px 16px 16px' }}>
              <RadiusControl value={radiusKm} onChange={setRadius} disabled={false} />
            </div>
          )}

          {/* Category Filter Button */}
          <div style={{ padding: '0 16px 16px' }}>
            <button
              onClick={() => setShowCategoriesSheet(true)}
              disabled={categoriesLoading}
              style={{
                width: '100%',
                padding: '14px 20px',
                background: selectedCategoryId 
                  ? 'rgba(59, 130, 246, 0.15)' 
                  : 'rgba(10, 15, 26, 0.8)',
                border: selectedCategoryId 
                  ? '1px solid rgba(59, 130, 246, 0.4)' 
                  : '1px solid rgba(59, 130, 246, 0.15)',
                borderRadius: 14,
                fontSize: 15,
                fontWeight: 600,
                color: selectedCategoryId ? '#3B82F6' : '#94A3B8',
                cursor: categoriesLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                minHeight: 52,
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s',
              }}
              data-testid="button-open-categories"
            >
              <SlidersHorizontal size={20} />
              <span style={{ flex: 1, textAlign: 'left' }}>
                {selectedCategory ? selectedCategory.name : 'Все категории'}
              </span>
              {selectedCategoryCount > 0 && (
                <span
                  style={{
                    background: selectedCategoryId 
                      ? 'linear-gradient(135deg, #3B82F6, #7C3AED)' 
                      : 'rgba(100, 116, 139, 0.3)',
                    color: '#fff',
                    padding: '4px 12px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: "'JetBrains Mono', monospace",
                    boxShadow: selectedCategoryId ? '0 0 10px rgba(59, 130, 246, 0.3)' : 'none',
                  }}
                >
                  {selectedCategoryCount}
                </span>
              )}
              <ChevronDown size={18} color="#64748B" />
            </button>
          </div>

          {/* Selected Category Badge */}
          {selectedCategory && (
            <div style={{ padding: '0 16px 12px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  background: 'rgba(59, 130, 246, 0.15)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  padding: '10px 14px',
                  borderRadius: 12,
                  backdropFilter: 'blur(10px)',
                }}
              >
                {selectedCategory.icon3d && (
                  <img
                    src={selectedCategory.icon3d}
                    alt=""
                    style={{ 
                      width: 24, 
                      height: 24, 
                      objectFit: 'contain',
                      filter: 'drop-shadow(0 0 5px rgba(59, 130, 246, 0.3))',
                    }}
                  />
                )}
                <span style={{ 
                  fontSize: 14, 
                  fontWeight: 600, 
                  color: '#3B82F6',
                  textShadow: '0 0 10px rgba(59, 130, 246, 0.3)',
                }}>
                  {selectedCategory.name}
                </span>
                <button
                  onClick={handleClearCategory}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    border: 'none',
                    background: 'linear-gradient(135deg, #3B82F6, #7C3AED)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    marginLeft: 4,
                  }}
                  data-testid="button-clear-category"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          )}

          {/* Brand Filter - показываем если выбрана категория */}
          {selectedCategoryId && (
            <div style={{ padding: '0 16px 16px' }}>
              <BrandFilter
                categorySlug={selectedCategoryId}
                selectedBrands={selectedBrands}
                onBrandsChange={setSelectedBrands}
                scope={scope}
              />
            </div>
          )}

          {/* Ads Grid or Empty Search Result */}
          {isEmptySearch ? (
            <EmptySearchResult
              query={searchQuery}
              lat={coords?.lat}
              lng={coords?.lng}
              radiusKm={radiusKm}
              nearbyAds={fallbackNearbyAds}
            />
          ) : (
            <NearbyAdsGrid
              ads={ads}
              loading={adsLoading}
              isEmpty={isEmpty}
              hasVeryFew={hasVeryFew}
              radiusKm={radiusKm}
              onIncreaseRadius={handleIncreaseRadius}
            />
          )}

          {/* Categories Sheet */}
          <CategoriesSheet
            isOpen={showCategoriesSheet}
            onClose={() => setShowCategoriesSheet(false)}
            categories={categories}
            categoryStats={categoryStats}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={handleSelectCategory}
            radiusKm={radiusKm}
            totalAds={totalAds}
          />
        </div>
      )}
    </div>
  );
}
