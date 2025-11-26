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
    <div style={{ 
      padding: '20px 16px', 
      background: 'rgba(10, 15, 26, 0.8)', 
      borderRadius: 16, 
      border: '1px solid rgba(59, 130, 246, 0.15)',
      backdropFilter: 'blur(10px)',
    }}>
      <h3 style={{ 
        margin: '0 0 16px', 
        fontSize: 16, 
        fontWeight: 600, 
        color: '#F8FAFC',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <div style={{
          width: 4,
          height: 16,
          background: 'linear-gradient(135deg, #3B82F6, #7C3AED)',
          borderRadius: 4,
          boxShadow: '0 0 8px rgba(59, 130, 246, 0.4)',
        }} />
        Поиск объявлений вокруг вас
      </h3>
      
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ 
          fontSize: 28, 
          fontWeight: 700, 
          color: '#3B82F6', 
          marginBottom: 6,
          fontFamily: 'var(--font-mono)',
          textShadow: '0 0 15px rgba(59, 130, 246, 0.5)',
        }}>
          Радиус: {formatRadius(value)}
        </div>
        <p style={{ fontSize: 14, color: '#64748B', margin: 0 }}>
          на каком расстоянии от вас искать объявления
        </p>
      </div>

      {/* Пресеты */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
        {PRESETS.map((preset) => {
          const isSelected = selectedPreset === preset;
          return (
            <button
              key={preset}
              onClick={() => handlePresetClick(preset)}
              disabled={disabled}
              style={{
                padding: '12px 8px',
                background: isSelected 
                  ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(124, 58, 237, 0.2))' 
                  : 'rgba(10, 15, 26, 0.6)',
                border: isSelected 
                  ? '1px solid rgba(59, 130, 246, 0.5)' 
                  : '1px solid rgba(59, 130, 246, 0.15)',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: isSelected ? 700 : 500,
                color: isSelected ? '#3B82F6' : '#94A3B8',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: isSelected ? '0 0 15px rgba(59, 130, 246, 0.3)' : 'none',
                fontFamily: 'var(--font-mono)',
              }}
              data-testid={`radius-preset-${preset}`}
            >
              {formatRadius(preset)}
            </button>
          );
        })}
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
            height: 6,
            borderRadius: 3,
            background: `linear-gradient(to right, #3B82F6 0%, #7C3AED ${((value - 0.1) / 99.9) * 100}%, rgba(59, 130, 246, 0.2) ${((value - 0.1) / 99.9) * 100}%, rgba(59, 130, 246, 0.2) 100%)`,
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
              width: 22px;
              height: 22px;
              border-radius: 50%;
              background: linear-gradient(135deg, #3B82F6, #7C3AED);
              cursor: pointer;
              box-shadow: 0 0 15px rgba(59, 130, 246, 0.5);
              transition: all 0.2s;
              border: 2px solid rgba(255, 255, 255, 0.2);
            }
            input[type="range"]::-webkit-slider-thumb:hover {
              transform: scale(1.1);
              box-shadow: 0 0 20px rgba(59, 130, 246, 0.6);
            }
            input[type="range"]::-webkit-slider-thumb:active {
              transform: scale(0.95);
            }
            input[type="range"]::-moz-range-thumb {
              width: 22px;
              height: 22px;
              border-radius: 50%;
              background: linear-gradient(135deg, #3B82F6, #7C3AED);
              cursor: pointer;
              box-shadow: 0 0 15px rgba(59, 130, 246, 0.5);
              border: 2px solid rgba(255, 255, 255, 0.2);
              transition: all 0.2s;
            }
            input[type="range"]::-moz-range-thumb:hover {
              transform: scale(1.1);
              box-shadow: 0 0 20px rgba(59, 130, 246, 0.6);
            }
            input[type="range"]::-moz-range-thumb:active {
              transform: scale(0.95);
            }
          `}
        </style>
      </div>

      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        marginTop: 8, 
        fontSize: 11, 
        color: '#64748B',
        fontFamily: 'var(--font-mono)',
      }}>
        <span>100 м</span>
        <span>100 км</span>
      </div>

      {/* Подсказка */}
      <p style={{ 
        margin: '16px 0 0', 
        fontSize: 13, 
        color: '#64748B', 
        textAlign: 'center',
        lineHeight: 1.4,
      }}>
        Чем больше радиус, тем больше объявлений
      </p>
    </div>
  );
}
