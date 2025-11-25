import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MapPin, Home, SlidersHorizontal, ChevronDown, X, Search } from 'lucide-react';
import RadiusControl from '@/components/RadiusControl';
import NearbyAdsGrid from '@/components/NearbyAdsGrid';
import CategoriesSheet from '@/components/CategoriesSheet';
import { useGeo } from '@/utils/geo';
import { useNearbyAds } from '@/hooks/useNearbyAds';
import { useCategoriesStore } from '@/hooks/useCategoriesStore';
import { getNearbyStats } from '@/api/ads';
import { CategoryStat } from '@/types';

export default function FeedPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { coords, status: geoStatus, requestLocation, radiusKm, setRadius } = useGeo();
  const { categories, loading: categoriesLoading, loadCategories } = useCategoriesStore();
  
  const [showCategoriesSheet, setShowCategoriesSheet] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [totalAds, setTotalAds] = useState(0);
  
  const statsAbortRef = useRef<AbortController | null>(null);
  
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
    if (!coords) return;

    if (statsAbortRef.current) {
      statsAbortRef.current.abort();
    }

    const controller = new AbortController();
    statsAbortRef.current = controller;

    try {
      const response = await getNearbyStats({
        lat: coords.lat,
        lng: coords.lng,
        radiusKm,
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
  }, [coords, radiusKm]);

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
    enabled: !!coords,
  });

  const needsLocation = !coords && geoStatus !== 'loading';

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
    <div style={{ paddingBottom: '80px', background: '#F8FAFC', minHeight: '100vh' }}>
      {/* Header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          background: '#ffffff',
          zIndex: 10,
          borderBottom: '1px solid #E5E7EB',
          padding: '12px 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              background: '#3B73FC',
              color: '#ffffff',
              border: 'none',
              borderRadius: 12,
              cursor: 'pointer',
            }}
            data-testid="button-home"
          >
            <Home size={22} />
          </button>
          <h1 style={{ flex: 1, margin: 0, fontSize: 20, fontWeight: 600, color: '#111827' }}>
            {searchQuery ? `Поиск: "${searchQuery}"` : 'Рядом со мной'}
          </h1>
        </div>
        
        {searchQuery && (
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#EBF3FF',
                border: '1px solid #BFDBFE',
                padding: '8px 12px',
                borderRadius: 10,
              }}
            >
              <Search size={16} color="#3B73FC" />
              <span style={{ fontSize: 15, fontWeight: 500, color: '#3B73FC' }}>
                {searchQuery}
              </span>
              <button
                onClick={() => {
                  const newParams = new URLSearchParams(searchParams);
                  newParams.delete('q');
                  setSearchParams(newParams);
                }}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  border: 'none',
                  background: '#3B73FC',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  marginLeft: 4,
                }}
                data-testid="button-clear-search"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Geo Request */}
      {needsLocation ? (
        <div style={{ padding: 20 }}>
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              padding: 32,
              textAlign: 'center',
              border: '1px solid #E5E7EB',
            }}
          >
            <MapPin size={56} color="#3B73FC" style={{ margin: '0 auto 20px' }} />
            <h2 style={{ fontSize: 24, fontWeight: 600, margin: '0 0 12px', color: '#111827' }}>
              Определите ваше местоположение
            </h2>
            <p style={{ fontSize: 18, color: '#6B7280', margin: '0 0 24px', lineHeight: 1.5 }}>
              Чтобы показать объявления рядом с вами
            </p>
            <button
              onClick={requestLocation}
              disabled={geoStatus === 'loading'}
              style={{
                width: '100%',
                padding: '18px',
                background: '#3B73FC',
                color: '#ffffff',
                border: 'none',
                borderRadius: 14,
                fontSize: 20,
                fontWeight: 600,
                cursor: geoStatus === 'loading' ? 'not-allowed' : 'pointer',
                opacity: geoStatus === 'loading' ? 0.7 : 1,
                minHeight: 56,
              }}
              data-testid="button-request-location"
            >
              {geoStatus === 'loading' ? 'Получаем геолокацию...' : 'Определить местоположение'}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* RadiusControl */}
          <div style={{ padding: '20px 16px 16px' }}>
            <RadiusControl value={radiusKm} onChange={setRadius} disabled={false} />
          </div>

          {/* Category Filter Button */}
          <div style={{ padding: '0 16px 16px' }}>
            <button
              onClick={() => setShowCategoriesSheet(true)}
              disabled={categoriesLoading}
              style={{
                width: '100%',
                padding: '14px 20px',
                background: selectedCategoryId ? '#EBF3FF' : '#FFFFFF',
                border: selectedCategoryId ? '2px solid #3B73FC' : '1px solid #E5E7EB',
                borderRadius: 14,
                fontSize: 17,
                fontWeight: 600,
                color: selectedCategoryId ? '#3B73FC' : '#374151',
                cursor: categoriesLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                minHeight: 52,
              }}
              data-testid="button-open-categories"
            >
              <SlidersHorizontal size={22} />
              <span style={{ flex: 1, textAlign: 'left' }}>
                {selectedCategory ? selectedCategory.name : 'Все категории'}
              </span>
              {selectedCategoryCount > 0 && (
                <span
                  style={{
                    background: selectedCategoryId ? '#3B73FC' : '#E5E7EB',
                    color: selectedCategoryId ? '#fff' : '#374151',
                    padding: '4px 10px',
                    borderRadius: 20,
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                >
                  {selectedCategoryCount}
                </span>
              )}
              <ChevronDown size={20} color="#9CA3AF" />
            </button>
          </div>

          {/* Selected Category Badge */}
          {selectedCategory && (
            <div style={{ padding: '0 16px 12px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#EBF3FF',
                  border: '1px solid #BFDBFE',
                  padding: '8px 12px',
                  borderRadius: 10,
                }}
              >
                {selectedCategory.icon3d && (
                  <img
                    src={selectedCategory.icon3d}
                    alt=""
                    style={{ width: 24, height: 24, objectFit: 'contain' }}
                  />
                )}
                <span style={{ fontSize: 15, fontWeight: 500, color: '#3B73FC' }}>
                  {selectedCategory.name}
                </span>
                <button
                  onClick={handleClearCategory}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    border: 'none',
                    background: '#3B73FC',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    marginLeft: 4,
                  }}
                  data-testid="button-clear-category"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Ads Grid */}
          <NearbyAdsGrid
            ads={ads}
            loading={adsLoading}
            isEmpty={isEmpty}
            hasVeryFew={hasVeryFew}
            radiusKm={radiusKm}
            onIncreaseRadius={handleIncreaseRadius}
          />

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
        </>
      )}
    </div>
  );
}
