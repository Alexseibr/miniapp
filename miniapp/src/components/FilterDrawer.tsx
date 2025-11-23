import { useEffect } from 'react';
import { X } from 'lucide-react';

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
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Новые' },
  { value: 'cheapest', label: 'Дешевле' },
  { value: 'expensive', label: 'Дороже' },
  { value: 'popular', label: 'Популярные' },
  { value: 'distance', label: 'Рядом' },
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
}: FilterDrawerProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
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
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'white',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: '20px 16px 32px',
          zIndex: 1000,
          maxHeight: '85vh',
          overflowY: 'auto',
          animation: 'slideUp 0.3s',
        }}
        data-testid="filter-drawer"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }} data-testid="text-filter-title">Фильтры</h2>
          <button
            className="secondary"
            type="button"
            onClick={onClose}
            style={{ minWidth: 40, width: 'auto', padding: '8px 12px' }}
            data-testid="button-close-filters"
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }} data-testid="text-price-label">Цена</h3>
          <div style={{ display: 'flex', gap: 12 }}>
            <input
              className="input"
              type="number"
              placeholder="От"
              value={minPrice}
              onChange={(e) => onMinPriceChange(e.target.value)}
              style={{ flex: 1 }}
              data-testid="input-min-price-drawer"
              min="0"
            />
            <input
              className="input"
              type="number"
              placeholder="До"
              value={maxPrice}
              onChange={(e) => onMaxPriceChange(e.target.value)}
              style={{ flex: 1 }}
              data-testid="input-max-price-drawer"
              min="0"
            />
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }} data-testid="text-sort-label">Сортировка</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                className={sort === option.value ? 'primary' : 'secondary'}
                type="button"
                onClick={() => {
                  if (option.value === 'distance' && !coords) {
                    onRequestLocation();
                  }
                  onSortChange(option.value);
                }}
                data-testid={`button-sort-${option.value}-drawer`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {sort === 'distance' && (
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600 }} data-testid="text-radius-label">Радиус поиска</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <input
                type="range"
                min={1}
                max={50}
                step={1}
                value={radiusKm}
                onChange={(e) => onRadiusChange(Number(e.target.value))}
                style={{ flex: 1 }}
                data-testid="slider-radius"
              />
              <span style={{ fontSize: 16, fontWeight: 600, minWidth: 60 }} data-testid="text-radius-value">{radiusKm} км</span>
            </div>
            {geoStatus !== 'ready' && (
              <p style={{ margin: '8px 0 0', fontSize: 14, color: '#64748b' }} data-testid="text-geo-status">
                {geoStatus === 'loading' ? 'Получаем координаты…' : 'Включите геолокацию для поиска рядом'}
              </p>
            )}
          </div>
        )}

        <button
          className="primary"
          type="button"
          onClick={onClose}
          style={{ width: '100%' }}
          data-testid="button-apply-filters"
        >
          Применить фильтры
        </button>

        <style>
          {`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideUp {
              from { transform: translateY(100%); }
              to { transform: translateY(0); }
            }
          `}
        </style>
      </div>
    </>
  );
}
