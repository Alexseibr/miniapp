import { useState, useEffect } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export interface FilterState {
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  sort: 'createdAt_desc' | 'price_asc' | 'price_desc';
}

interface FilterPanelProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

export default function FilterPanel({ filters, onChange }: FilterPanelProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);

  const { data: categories } = useQuery<any>({
    queryKey: ['/api/categories'],
  });

  useEffect(() => {
    if (showFilters) {
      setLocalFilters(filters);
    }
  }, [filters, showFilters]);

  const handleClose = () => {
    setLocalFilters(filters);
    setShowFilters(false);
  };

  const handleApply = () => {
    onChange(localFilters);
    setShowFilters(false);
  };

  const handleReset = () => {
    const resetFilters: FilterState = {
      sort: 'createdAt_desc'
    };
    setLocalFilters(resetFilters);
    onChange(resetFilters);
    setShowFilters(false);
  };

  const activeFiltersCount = 
    (filters.categoryId ? 1 : 0) +
    (filters.minPrice ? 1 : 0) +
    (filters.maxPrice ? 1 : 0);

  return (
    <div className="filter-panel">
      <button
        className="filter-toggle-button"
        onClick={() => setShowFilters(!showFilters)}
        data-testid="button-toggle-filters"
      >
        <SlidersHorizontal size={20} />
        <span>Фильтры</span>
        {activeFiltersCount > 0 && (
          <span className="filter-badge" data-testid="badge-active-filters">
            {activeFiltersCount}
          </span>
        )}
      </button>

      {showFilters && (
        <>
          <div 
            className="filter-overlay" 
            onClick={handleClose}
            data-testid="filter-overlay"
          />
          <div className="filter-modal" data-testid="filter-modal">
            <div className="filter-header">
              <h2>Фильтры</h2>
              <button
                onClick={handleClose}
                className="filter-close-button"
                data-testid="button-close-filters"
              >
                <X size={24} />
              </button>
            </div>

            <div className="filter-content">
              <div className="filter-group">
                <label className="filter-label">Категория</label>
                <select
                  value={localFilters.categoryId || ''}
                  onChange={(e) => setLocalFilters({ ...localFilters, categoryId: e.target.value || undefined })}
                  className="filter-select"
                  data-testid="select-category"
                >
                  <option value="">Все категории</option>
                  {categories?.map((cat: any) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.nameRu}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">Цена</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="number"
                    placeholder="От"
                    value={localFilters.minPrice || ''}
                    onChange={(e) => setLocalFilters({ 
                      ...localFilters, 
                      minPrice: e.target.value ? Number(e.target.value) : undefined 
                    })}
                    className="filter-input"
                    data-testid="input-min-price"
                  />
                  <input
                    type="number"
                    placeholder="До"
                    value={localFilters.maxPrice || ''}
                    onChange={(e) => setLocalFilters({ 
                      ...localFilters, 
                      maxPrice: e.target.value ? Number(e.target.value) : undefined 
                    })}
                    className="filter-input"
                    data-testid="input-max-price"
                  />
                </div>
              </div>

              <div className="filter-group">
                <label className="filter-label">Сортировка</label>
                <div className="filter-sort-options">
                  <button
                    className={`filter-sort-option ${localFilters.sort === 'createdAt_desc' ? 'active' : ''}`}
                    onClick={() => setLocalFilters({ ...localFilters, sort: 'createdAt_desc' })}
                    data-testid="button-sort-newest"
                  >
                    Новые
                  </button>
                  <button
                    className={`filter-sort-option ${localFilters.sort === 'price_asc' ? 'active' : ''}`}
                    onClick={() => setLocalFilters({ ...localFilters, sort: 'price_asc' })}
                    data-testid="button-sort-cheapest"
                  >
                    Дешевле
                  </button>
                  <button
                    className={`filter-sort-option ${localFilters.sort === 'price_desc' ? 'active' : ''}`}
                    onClick={() => setLocalFilters({ ...localFilters, sort: 'price_desc' })}
                    data-testid="button-sort-expensive"
                  >
                    Дороже
                  </button>
                </div>
              </div>
            </div>

            <div className="filter-actions">
              <button
                onClick={handleReset}
                className="filter-reset-button"
                data-testid="button-reset-filters"
              >
                Сбросить
              </button>
              <button
                onClick={handleApply}
                className="filter-apply-button"
                data-testid="button-apply-filters"
              >
                Применить
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
