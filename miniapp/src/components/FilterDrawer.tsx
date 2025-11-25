import { useEffect, useState } from 'react';
import { ChevronLeft } from 'lucide-react';

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  minPrice: string;
  maxPrice: string;
  sort: string;
  onMinPriceChange: (value: string) => void;
  onMaxPriceChange: (value: string) => void;
  onSortChange: (value: string) => void;
  onRequestLocation: () => void;
  coords: { lat: number; lng: number } | null;
  radiusKm: number;
  onRadiusChange: (value: number) => void;
  geoStatus: string;
  totalAds: number;
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'По новизне' },
  { value: 'cheapest', label: 'По возрастанию цены' },
  { value: 'expensive', label: 'По убыванию цены' },
  { value: 'popular', label: 'По популярности' },
  { value: 'distance', label: 'По расстоянию' },
];

export default function FilterDrawer({
  isOpen,
  onClose,
  minPrice,
  maxPrice,
  sort,
  onMinPriceChange,
  onMaxPriceChange,
  onSortChange,
  onRequestLocation,
  coords,
  radiusKm,
  onRadiusChange,
  geoStatus,
  totalAds,
}: FilterDrawerProps) {
  const [localMinPrice, setLocalMinPrice] = useState(minPrice);
  const [localMaxPrice, setLocalMaxPrice] = useState(maxPrice);
  const [localSort, setLocalSort] = useState(sort);
  const [localRadiusKm, setLocalRadiusKm] = useState(radiusKm);

  useEffect(() => {
    if (isOpen) {
      setLocalMinPrice(minPrice);
      setLocalMaxPrice(maxPrice);
      setLocalSort(sort);
      setLocalRadiusKm(radiusKm);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, minPrice, maxPrice, sort, radiusKm]);

  const handleApply = () => {
    onMinPriceChange(localMinPrice);
    onMaxPriceChange(localMaxPrice);
    onSortChange(localSort);
    onRadiusChange(localRadiusKm);
    if (localSort === 'distance' && !coords) {
      onRequestLocation();
    }
    onClose();
  };

  const handleReset = () => {
    setLocalMinPrice('');
    setLocalMaxPrice('');
    setLocalSort('newest');
    setLocalRadiusKm(5);
    onMinPriceChange('');
    onMaxPriceChange('');
    onSortChange('newest');
    onRadiusChange(5);
  };


  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 999,
          animation: 'fadeIn 0.2s',
        }}
        onClick={onClose}
        data-testid="filter-overlay"
      />
      
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'white',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.3s',
        }}
        data-testid="filter-drawer"
      >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: 'white',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            padding: 8,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
          data-testid="button-close-filters"
        >
          <ChevronLeft size={24} color="#111827" />
        </button>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }} data-testid="text-filter-title">
          Фильтр
        </h2>
        <button
          type="button"
          onClick={handleReset}
          style={{
            background: 'none',
            border: 'none',
            padding: 8,
            cursor: 'pointer',
            fontSize: 15,
            color: '#10b981',
            fontWeight: 500,
          }}
          data-testid="button-reset-filters"
        >
          Сбросить
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>

        {/* Цена */}
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600, color: '#111827' }} data-testid="text-price-label">
            Цена
          </h3>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <input
                className="input"
                type="number"
                placeholder="от"
                value={localMinPrice}
                onChange={(e) => setLocalMinPrice(e.target.value)}
                style={{ fontSize: 14, padding: '10px 12px' }}
                data-testid="input-min-price-drawer"
                min="0"
              />
            </div>
            <div style={{ flex: 1 }}>
              <input
                className="input"
                type="number"
                placeholder="до"
                value={localMaxPrice}
                onChange={(e) => setLocalMaxPrice(e.target.value)}
                style={{ fontSize: 14, padding: '10px 12px' }}
                data-testid="input-max-price-drawer"
                min="0"
              />
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4, textAlign: 'right' }}>р.</div>
            </div>
          </div>
        </div>

        {/* Радиус поиска */}
        {localSort === 'distance' && (
          <div style={{ marginBottom: 20, paddingTop: 16, borderTop: '1px solid #f3f4f6' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: '#111827' }} data-testid="text-radius-label">
              Радиус поиска
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {[
                { value: 0.3, label: '300 м' },
                { value: 1, label: '1 км' },
                { value: 3, label: '3 км' },
                { value: 5, label: '5 км' },
                { value: 10, label: '10 км' },
              ].map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setLocalRadiusKm(preset.value)}
                  style={{
                    flex: '1 1 auto',
                    minWidth: '80px',
                    padding: '10px 16px',
                    fontSize: 14,
                    fontWeight: 500,
                    border: localRadiusKm === preset.value ? '2px solid #3B73FC' : '1px solid #e5e7eb',
                    borderRadius: 12,
                    backgroundColor: localRadiusKm === preset.value ? '#EBF3FF' : 'white',
                    color: localRadiusKm === preset.value ? '#3B73FC' : '#111827',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  data-testid={`button-radius-${preset.value}`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            {geoStatus !== 'ready' && (
              <>
                <p style={{ margin: '8px 0', fontSize: 13, color: '#6b7280' }} data-testid="text-geo-status">
                  {geoStatus === 'loading' ? 'Получаем координаты…' : 'Включите геолокацию для поиска рядом'}
                </p>
                {geoStatus === 'idle' && (
                  <button
                    type="button"
                    onClick={onRequestLocation}
                    style={{
                      padding: '10px 16px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: 'pointer',
                      marginTop: 8,
                      width: '100%',
                    }}
                    data-testid="button-request-location"
                  >
                    📍 Включить геолокацию
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Сортировать */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 0',
            marginTop: 16,
          }}
        >
          <span style={{ fontSize: 14, color: '#111827' }}>Сортировать</span>
          <select
            value={localSort}
            onChange={(e) => setLocalSort(e.target.value)}
            style={{
              fontSize: 14,
              color: '#10b981',
              border: 'none',
              background: 'none',
              fontWeight: 500,
              cursor: 'pointer',
            }}
            data-testid="select-sort"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

      </div>

      {/* Footer with green button */}
      <div
        style={{
          padding: 16,
          borderTop: '1px solid #e5e7eb',
          backgroundColor: 'white',
        }}
      >
        <button
          type="button"
          onClick={handleApply}
          style={{
            width: '100%',
            padding: '14px 16px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
          }}
          data-testid="button-apply-filters"
        >
          Показать {totalAds > 0 ? `${totalAds.toLocaleString('ru-RU')} ` : ''}объявлений
        </button>
      </div>

      <style>
        {`
          @keyframes slideInRight {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}
      </style>
    </div>
    </>
  );
}
