import { useState, useEffect } from 'react';
import { X, MapPin, Loader2, Check } from 'lucide-react';
import { formatRadiusLabel } from '@/utils/geo';

interface LocationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCoords: { lat: number; lng: number } | null;
  currentRadius: number;
  currentCity: string | null;
  onRadiusChange: (value: number) => void;
  onLocationChange: () => Promise<void>;
}

const RADIUS_PRESETS = [1, 3, 5, 10, 25, 50];

export default function LocationSettingsModal({
  isOpen,
  onClose,
  currentCoords,
  currentRadius,
  currentCity,
  onRadiusChange,
  onLocationChange,
}: LocationSettingsModalProps) {
  const [localRadius, setLocalRadius] = useState(currentRadius);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLocalRadius(currentRadius);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, currentRadius]);

  const handleRadiusChange = (value: number) => {
    setLocalRadius(value);
    onRadiusChange(value);
  };

  const handleAutoDetect = async () => {
    setIsLoadingLocation(true);
    try {
      await onLocationChange();
    } finally {
      setIsLoadingLocation(false);
    }
  };

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
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9998,
        }}
        onClick={onClose}
      />
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#FFFFFF',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          zIndex: 9999,
          maxHeight: '80vh',
          overflow: 'auto',
          animation: 'slideUp 0.3s ease-out',
        }}
        data-testid="location-settings-modal"
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #F3F4F6' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#111827' }}>
              Местоположение и радиус
            </h2>
            <button
              onClick={onClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                background: '#F3F4F6',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              data-testid="button-close-location-modal"
            >
              <X size={20} color="#6B7280" />
            </button>
          </div>
        </div>

        <div style={{ padding: 20 }}>
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px', color: '#374151' }}>
              Ваше местоположение
            </h3>
            
            {currentCoords ? (
              <div
                style={{
                  background: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  borderRadius: 12,
                  padding: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    background: '#22C55E',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Check size={22} color="#fff" />
                </div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 600, margin: 0, color: '#166534' }}>
                    {currentCity || 'Местоположение определено'}
                  </p>
                  <p style={{ fontSize: 13, margin: '2px 0 0', color: '#4ADE80' }}>
                    {currentCoords.lat.toFixed(4)}, {currentCoords.lng.toFixed(4)}
                  </p>
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: '#FEF3C7',
                  border: '1px solid #FCD34D',
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 12,
                }}
              >
                <p style={{ fontSize: 15, margin: 0, color: '#92400E' }}>
                  Местоположение не определено
                </p>
              </div>
            )}

            <button
              onClick={handleAutoDetect}
              disabled={isLoadingLocation}
              style={{
                width: '100%',
                padding: '14px 20px',
                background: isLoadingLocation ? '#9CA3AF' : '#3B73FC',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 600,
                cursor: isLoadingLocation ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
              data-testid="button-update-location"
            >
              {isLoadingLocation ? (
                <>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  Определяем...
                </>
              ) : (
                <>
                  <MapPin size={18} />
                  {currentCoords ? 'Обновить местоположение' : 'Определить автоматически'}
                </>
              )}
            </button>
          </div>

          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px', color: '#374151' }}>
              Радиус поиска
            </h3>
            <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 16px' }}>
              Объявления будут показаны в пределах выбранного расстояния
            </p>

            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <span
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  color: '#3B73FC',
                }}
              >
                {formatRadiusLabel(localRadius)}
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 10,
                marginBottom: 20,
              }}
            >
              {RADIUS_PRESETS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleRadiusChange(preset)}
                  style={{
                    padding: '12px 8px',
                    background: localRadius === preset ? '#EBF3FF' : '#F9FAFB',
                    border: localRadius === preset ? '2px solid #3B73FC' : '1px solid #E5E7EB',
                    borderRadius: 10,
                    fontSize: 15,
                    fontWeight: localRadius === preset ? 600 : 500,
                    color: localRadius === preset ? '#3B73FC' : '#374151',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  data-testid={`radius-preset-${preset}`}
                >
                  {formatRadiusLabel(preset)}
                </button>
              ))}
            </div>

            <input
              type="range"
              min="1"
              max="100"
              value={localRadius}
              onChange={(e) => handleRadiusChange(Number(e.target.value))}
              style={{
                width: '100%',
                height: 6,
                background: `linear-gradient(to right, #3B73FC ${(localRadius / 100) * 100}%, #E5E7EB ${(localRadius / 100) * 100}%)`,
                borderRadius: 3,
                appearance: 'none',
                cursor: 'pointer',
              }}
              data-testid="radius-slider"
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>1 км</span>
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>100 км</span>
            </div>
          </div>
        </div>

        <div style={{ padding: '16px 20px', borderTop: '1px solid #F3F4F6' }}>
          <button
            onClick={onClose}
            style={{
              width: '100%',
              padding: '16px',
              background: '#111827',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
            }}
            data-testid="button-apply-location-settings"
          >
            Готово
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}
