import { useState } from 'react';
import { ChevronDown, ChevronUp, Check } from 'lucide-react';
import { useCategoryBrands } from '@/hooks/useBrands';
import { useGeo } from '@/utils/geo';

interface BrandFilterProps {
  categorySlug: string;
  selectedBrands: string[];
  onBrandsChange: (brands: string[]) => void;
  scope?: 'local' | 'country';
  className?: string;
}

export default function BrandFilter({
  categorySlug,
  selectedBrands,
  onBrandsChange,
  scope = 'local',
  className = '',
}: BrandFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { coords, radiusKm } = useGeo();

  const { brands, loading } = useCategoryBrands(categorySlug, {
    lat: coords?.lat,
    lng: coords?.lng,
    radiusKm,
    scope,
    enabled: !!categorySlug,
  });

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg p-3 ${className}`} data-testid="brand-filter-loading">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Бренды</span>
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!brands || brands.length === 0) {
    return null;
  }

  const toggleBrand = (brandKey: string) => {
    if (selectedBrands.includes(brandKey)) {
      onBrandsChange(selectedBrands.filter(b => b !== brandKey));
    } else {
      onBrandsChange([...selectedBrands, brandKey]);
    }
  };

  const clearBrands = () => {
    onBrandsChange([]);
  };

  const displayedBrands = isExpanded ? brands : brands.slice(0, 6);
  const hasMore = brands.length > 6;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg ${className}`} data-testid="brand-filter">
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover-elevate rounded-lg"
        onClick={() => setIsExpanded(!isExpanded)}
        data-testid="brand-filter-toggle"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Бренды
          </span>
          {selectedBrands.length > 0 && (
            <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full">
              {selectedBrands.length}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </div>

      {isExpanded && (
        <div className="px-3 pb-3">
          {selectedBrands.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearBrands();
              }}
              className="text-xs text-primary hover:underline mb-2"
              data-testid="brand-filter-clear"
            >
              Очистить выбор
            </button>
          )}

          <div className="flex flex-wrap gap-2">
            {displayedBrands.map((brand) => {
              const isSelected = selectedBrands.includes(brand.brandKey);
              return (
                <button
                  key={brand.brandKey}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleBrand(brand.brandKey);
                  }}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm
                    transition-colors border
                    ${isSelected
                      ? 'bg-primary text-white border-primary'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover-elevate'
                    }
                  `}
                  data-testid={`brand-chip-${brand.brandKey}`}
                >
                  {isSelected && <Check className="w-3 h-3" />}
                  <span>{brand.name}</span>
                  <span className="text-xs opacity-70">({brand.count})</span>
                </button>
              );
            })}
          </div>

          {hasMore && !isExpanded && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(true);
              }}
              className="text-xs text-primary hover:underline mt-2"
              data-testid="brand-filter-show-more"
            >
              Показать ещё ({brands.length - 6})
            </button>
          )}
        </div>
      )}

      {!isExpanded && selectedBrands.length > 0 && (
        <div className="px-3 pb-3 flex flex-wrap gap-1">
          {selectedBrands.slice(0, 3).map((brandKey) => {
            const brand = brands.find(b => b.brandKey === brandKey);
            return brand ? (
              <span
                key={brandKey}
                className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full"
              >
                {brand.name}
              </span>
            ) : null;
          })}
          {selectedBrands.length > 3 && (
            <span className="text-xs text-gray-500">
              +{selectedBrands.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
