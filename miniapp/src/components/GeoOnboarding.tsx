import { useState } from 'react';
import { MapPin, Loader2, Users, Sparkles } from 'lucide-react';
import useGeoStore from '@/store/useGeoStore';

interface GeoOnboardingProps {
  onComplete: () => void;
}

export default function GeoOnboarding({ onComplete }: GeoOnboardingProps) {
  const requestLocation = useGeoStore((state) => state.requestLocation);
  const completeOnboarding = useGeoStore((state) => state.completeOnboarding);
  const status = useGeoStore((state) => state.status);
  const error = useGeoStore((state) => state.error);
  const [isLoading, setIsLoading] = useState(false);

  const handleAutoDetect = async () => {
    setIsLoading(true);
    try {
      await requestLocation();
      completeOnboarding();
      onComplete();
    } catch (e) {
      console.error('Location error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const isProcessing = isLoading || status === 'loading';

  const features = [
    { icon: MapPin, label: 'Рядом с\nвами', color: '#3A7BFF' },
    { icon: Users, label: 'Фермеры', color: '#3A7BFF' },
    { icon: Sparkles, label: 'Свежие\nтовары', color: '#3A7BFF' },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(180deg, #E8F4FF 0%, #F0F4FF 50%, #FFFFFF 100%)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        overflow: 'hidden',
      }}
      data-testid="geo-onboarding-screen"
    >
      {/* App Icon */}
      <div
        style={{
          width: 120,
          height: 120,
          background: '#3A7BFF',
          borderRadius: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 32,
          boxShadow: '0 12px 40px rgba(58, 123, 255, 0.3)',
        }}
      >
        <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
          <rect x="12" y="8" width="36" height="32" rx="6" stroke="white" strokeWidth="3" fill="none"/>
          <path d="M12 20H48" stroke="white" strokeWidth="3"/>
          <circle cx="30" cy="30" r="4" fill="white"/>
          <path d="M20 44L30 52L40 44" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* Title */}
      <h1
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: '#3A7BFF',
          margin: '0 0 8px',
          textAlign: 'center',
          letterSpacing: '-0.5px',
        }}
      >
        KETMAR Market
      </h1>

      <h2
        style={{
          fontSize: 22,
          fontWeight: 600,
          color: '#1F2937',
          margin: '0 0 16px',
          textAlign: 'center',
        }}
      >
        Добро пожаловать
      </h2>

      <p
        style={{
          fontSize: 16,
          color: '#6B7280',
          margin: '0 0 40px',
          textAlign: 'center',
          lineHeight: 1.5,
          maxWidth: 300,
        }}
      >
        Местный маркет быстрых товаров, фермерских продуктов и локальных услуг
      </p>

      {/* Feature Buttons */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          marginBottom: 40,
          width: '100%',
          maxWidth: 340,
          justifyContent: 'center',
        }}
      >
        {features.map((feature, index) => (
          <div
            key={index}
            style={{
              flex: 1,
              padding: '20px 12px',
              background: '#FFFFFF',
              borderRadius: 16,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: '#EBF3FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <feature.icon size={24} color={feature.color} />
            </div>
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: '#1F2937',
                textAlign: 'center',
                lineHeight: 1.3,
                whiteSpace: 'pre-line',
              }}
            >
              {feature.label}
            </span>
          </div>
        ))}
      </div>

      {error && (
        <div
          style={{
            background: '#FEE2E2',
            border: '1px solid #FECACA',
            borderRadius: 12,
            padding: '12px 16px',
            marginBottom: 16,
            width: '100%',
            maxWidth: 340,
          }}
        >
          <p style={{ 
            fontSize: 14, 
            color: '#DC2626', 
            margin: 0, 
            textAlign: 'center',
          }}>
            {error}
          </p>
        </div>
      )}

      {/* Primary CTA Button */}
      <button
        onClick={handleAutoDetect}
        disabled={isProcessing}
        style={{
          width: '100%',
          maxWidth: 340,
          padding: '18px 24px',
          background: isProcessing ? '#9CA3AF' : '#3A7BFF',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: 16,
          fontSize: 17,
          fontWeight: 600,
          cursor: isProcessing ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          transition: 'all 0.2s ease',
          boxShadow: isProcessing ? 'none' : '0 4px 20px rgba(58, 123, 255, 0.35)',
        }}
        data-testid="button-auto-detect-location"
      >
        {isProcessing ? (
          <>
            <Loader2 
              size={22} 
              style={{ animation: 'spin 1s linear infinite' }} 
            />
            Определяем...
          </>
        ) : (
          'Определить моё местоположение'
        )}
      </button>

      <p
        style={{
          fontSize: 14,
          color: '#9CA3AF',
          margin: '20px 0 0',
          textAlign: 'center',
        }}
      >
        Мы покажем товары рядом с вами
      </p>
    </div>
  );
}
