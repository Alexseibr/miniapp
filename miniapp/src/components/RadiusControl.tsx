import { useState } from 'react';

interface RadiusControlProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const PRESETS = [0.3, 0.5, 1, 3, 5, 10];

function formatRadius(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} м`;
  }
  return `${km} км`;
}

export default function RadiusControl({ value, onChange, disabled = false }: RadiusControlProps) {
  const [selectedPreset, setSelectedPreset] = useState<number | null>(
    PRESETS.includes(value) ? value : null
  );

  const handlePresetClick = (preset: number) => {
    setSelectedPreset(preset);
    onChange(preset);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);
    setSelectedPreset(null);
    onChange(newValue);
  };

  return (
    <div style={{ padding: '20px 16px', background: '#ffffff', borderRadius: 16, border: '1px solid #E5E7EB' }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 24, fontWeight: 600, color: '#111827' }}>
        Поиск объявлений вокруг вас
      </h3>
      
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 36, fontWeight: 700, color: '#3B73FC', marginBottom: 8 }}>
          Радиус: {formatRadius(value)}
        </div>
        <p style={{ fontSize: 17, color: '#6B7280', margin: 0 }}>
          на каком расстоянии от вас искать объявления
        </p>
      </div>

      {/* Пресеты */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
        {PRESETS.map((preset) => (
          <button
            key={preset}
            onClick={() => handlePresetClick(preset)}
            disabled={disabled}
            style={{
              padding: '14px 8px',
              background: selectedPreset === preset ? '#EBF3FF' : '#F9FAFB',
              border: selectedPreset === preset ? '2px solid #3B73FC' : '1px solid #E5E7EB',
              borderRadius: 12,
              fontSize: 17,
              fontWeight: selectedPreset === preset ? 600 : 500,
              color: selectedPreset === preset ? '#3B73FC' : '#374151',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.5 : 1,
              transition: 'all 0.2s',
            }}
            data-testid={`radius-preset-${preset}`}
          >
            {formatRadius(preset)}
          </button>
        ))}
      </div>

      {/* Слайдер */}
      <div style={{ position: 'relative', paddingTop: 8 }}>
        <input
          type="range"
          min="0.1"
          max="100"
          step="0.1"
          value={value}
          onChange={handleSliderChange}
          disabled={disabled}
          style={{
            width: '100%',
            height: 8,
            borderRadius: 4,
            background: `linear-gradient(to right, #3B73FC 0%, #3B73FC ${((value - 0.1) / 99.9) * 100}%, #E5E7EB ${((value - 0.1) / 99.9) * 100}%, #E5E7EB 100%)`,
            outline: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            appearance: 'none',
            WebkitAppearance: 'none',
          }}
          data-testid="radius-slider"
        />
        <style>
          {`
            input[type="range"]::-webkit-slider-thumb {
              appearance: none;
              width: 24px;
              height: 24px;
              border-radius: 50%;
              background: #3B73FC;
              cursor: pointer;
              box-shadow: 0 2px 6px rgba(59, 115, 252, 0.3);
              transition: all 0.2s;
            }
            input[type="range"]::-webkit-slider-thumb:hover {
              transform: scale(1.1);
              box-shadow: 0 4px 12px rgba(59, 115, 252, 0.4);
            }
            input[type="range"]::-webkit-slider-thumb:active {
              transform: scale(0.95);
            }
            input[type="range"]::-moz-range-thumb {
              width: 24px;
              height: 24px;
              border-radius: 50%;
              background: #3B73FC;
              cursor: pointer;
              box-shadow: 0 2px 6px rgba(59, 115, 252, 0.3);
              border: none;
              transition: all 0.2s;
            }
            input[type="range"]::-moz-range-thumb:hover {
              transform: scale(1.1);
              box-shadow: 0 4px 12px rgba(59, 115, 252, 0.4);
            }
            input[type="range"]::-moz-range-thumb:active {
              transform: scale(0.95);
            }
          `}
        </style>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 13, color: '#9CA3AF' }}>
        <span>100 м</span>
        <span>100 км</span>
      </div>
    </div>
  );
}
