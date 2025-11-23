import { useState } from 'react';
import { useLocationStore } from '@/store/useLocationStore';

const DISTANCE_OPTIONS = [
  { value: null, label: 'Все расстояния' },
  { value: 1, label: '1 км' },
  { value: 5, label: '5 км' },
  { value: 10, label: '10 км' },
  { value: 25, label: '25 км' },
];

export default function LocationFilter() {
  const {
    userLocation,
    maxDistanceKm,
    isRequesting,
    error,
    requestUserLocation,
    setMaxDistance,
    clearLocation,
  } = useLocationStore();

  const [isExpanded, setIsExpanded] = useState(false);

  const handleRequestLocation = async () => {
    const success = await requestUserLocation();
    if (success) {
      setIsExpanded(true);
    }
  };

  const handleDistanceChange = (value: number | null) => {
    setMaxDistance(value);
  };

  if (!userLocation) {
    return (
      <div className="card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '1rem' }}>📍 Поиск рядом</h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
              Найдите товары в вашем районе
            </p>
          </div>
          <button
            className="secondary"
            onClick={handleRequestLocation}
            disabled={isRequesting}
            style={{ padding: '10px 16px', width: 'auto', fontSize: '0.875rem' }}
          >
            {isRequesting ? '⏳' : '📍 Включить'}
          </button>
        </div>
        {error && (
          <p style={{ margin: '8px 0 0', fontSize: '0.875rem', color: '#ef4444' }}>
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="card" style={{ marginBottom: '16px' }}>
      <div style={{ marginBottom: isExpanded ? '12px' : 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.25rem' }}>📍</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>
                Геолокация активна
              </h3>
              {maxDistanceKm && (
                <p style={{ margin: '2px 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
                  Радиус: {maxDistanceKm} км
                </p>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              style={{
                border: 'none',
                background: 'transparent',
                fontSize: '1.5rem',
                cursor: 'pointer',
                padding: '4px',
              }}
              data-testid="button-toggle-distance"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
            <button
              onClick={clearLocation}
              style={{
                border: 'none',
                background: 'transparent',
                fontSize: '1.25rem',
                cursor: 'pointer',
                padding: '4px',
                color: '#ef4444',
              }}
              data-testid="button-clear-location"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="tab-nav" style={{ marginTop: '12px' }}>
          {DISTANCE_OPTIONS.map((option) => (
            <button
              key={option.label}
              className={maxDistanceKm === option.value ? 'active' : ''}
              onClick={() => handleDistanceChange(option.value)}
              data-testid={`filter-distance-${option.value || 'all'}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
