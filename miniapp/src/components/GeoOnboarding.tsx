import { useState } from 'react';
import { MapPin, Loader2, Map } from 'lucide-react';
import useGeoStore from '@/store/useGeoStore';
import { LogoFull } from './Logo';

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

  const handleSelectOnMap = () => {
    completeOnboarding();
    onComplete();
  };

  const isProcessing = isLoading || status === 'loading';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: '#FFFFFF',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      data-testid="geo-onboarding-screen"
    >
      <div style={{ marginBottom: 48 }}>
        <LogoFull width={160} />
      </div>

      <div
        style={{
          width: 100,
          height: 100,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #EBF3FF 0%, #DBEAFE 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 32,
        }}
      >
        <MapPin size={48} color="#3B73FC" />
      </div>

      <h1
        style={{
          fontSize: 26,
          fontWeight: 700,
          color: '#111827',
          margin: '0 0 12px',
          textAlign: 'center',
          lineHeight: 1.3,
        }}
      >
        Покажем, что продают рядом с вами
      </h1>

      <p
        style={{
          fontSize: 17,
          color: '#6B7280',
          margin: '0 0 40px',
          textAlign: 'center',
          lineHeight: 1.5,
          maxWidth: 320,
        }}
      >
        Определим район, чтобы показывать объявления около вас
      </p>

      {error && (
        <div
          style={{
            background: '#FEE2E2',
            border: '1px solid #FECACA',
            borderRadius: 12,
            padding: '12px 16px',
            marginBottom: 20,
            width: '100%',
            maxWidth: 340,
          }}
        >
          <p style={{ fontSize: 15, color: '#DC2626', margin: 0, textAlign: 'center' }}>
            {error}
          </p>
        </div>
      )}

      <div style={{ width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button
          onClick={handleAutoDetect}
          disabled={isProcessing}
          style={{
            width: '100%',
            padding: '18px 24px',
            background: isProcessing ? '#9CA3AF' : '#3B73FC',
            color: '#ffffff',
            border: 'none',
            borderRadius: 14,
            fontSize: 17,
            fontWeight: 600,
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            transition: 'background 0.2s, transform 0.1s',
            minHeight: 58,
          }}
          data-testid="button-auto-detect-location"
        >
          {isProcessing ? (
            <>
              <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
              Определяем местоположение...
            </>
          ) : (
            <>
              <MapPin size={22} />
              Определить автоматически
            </>
          )}
        </button>

        <button
          onClick={handleSelectOnMap}
          disabled={isProcessing}
          style={{
            width: '100%',
            padding: '18px 24px',
            background: '#F3F4F6',
            color: '#374151',
            border: '1px solid #E5E7EB',
            borderRadius: 14,
            fontSize: 17,
            fontWeight: 600,
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            transition: 'background 0.2s, transform 0.1s',
            minHeight: 58,
            opacity: isProcessing ? 0.6 : 1,
          }}
          data-testid="button-select-on-map"
        >
          <Map size={22} />
          Выбрать на карте
        </button>
      </div>

      <p
        style={{
          fontSize: 14,
          color: '#9CA3AF',
          margin: '32px 0 0',
          textAlign: 'center',
          maxWidth: 280,
          lineHeight: 1.5,
        }}
      >
        Вы всегда сможете изменить местоположение в настройках
      </p>
    </div>
  );
}
