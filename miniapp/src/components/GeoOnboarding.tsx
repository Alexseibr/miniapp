import { useState } from 'react';
import { MapPin, Loader2, Map } from 'lucide-react';
import useGeoStore from '@/store/useGeoStore';
import logoSvg from '@/assets/ketmar_logo_rgb.svg';

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
        background: '#000000',
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
      {/* Background gradients */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(circle at 30% 20%, rgba(59, 130, 246, 0.15), transparent 50%),
            radial-gradient(circle at 70% 80%, rgba(124, 58, 237, 0.1), transparent 50%)
          `,
          pointerEvents: 'none',
        }}
      />

      {/* Logo with glow */}
      <div style={{ marginBottom: 48, position: 'relative', zIndex: 1 }}>
        <img 
          src={logoSvg} 
          alt="KETMAR" 
          style={{ 
            width: 180, 
            height: 'auto',
            filter: 'drop-shadow(0 0 20px rgba(59, 130, 246, 0.5))',
          }} 
        />
      </div>

      {/* Icon with neon glow */}
      <div
        style={{
          width: 100,
          height: 100,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(124, 58, 237, 0.2))',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 32,
          boxShadow: '0 0 40px rgba(59, 130, 246, 0.3), inset 0 0 30px rgba(59, 130, 246, 0.1)',
          position: 'relative',
          zIndex: 1,
          animation: 'pulse-glow 3s infinite',
        }}
      >
        <MapPin 
          size={48} 
          color="#3B82F6" 
          style={{ filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.6))' }}
        />
      </div>

      <h1
        style={{
          fontSize: 26,
          fontWeight: 700,
          color: '#F8FAFC',
          margin: '0 0 12px',
          textAlign: 'center',
          lineHeight: 1.3,
          textShadow: '0 0 30px rgba(59, 130, 246, 0.3)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        Покажем, что продают рядом с вами
      </h1>

      <p
        style={{
          fontSize: 17,
          color: '#94A3B8',
          margin: '0 0 40px',
          textAlign: 'center',
          lineHeight: 1.5,
          maxWidth: 320,
          position: 'relative',
          zIndex: 1,
        }}
      >
        Определим район, чтобы показывать объявления около вас
      </p>

      {error && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: 12,
            padding: '12px 16px',
            marginBottom: 20,
            width: '100%',
            maxWidth: 340,
            backdropFilter: 'blur(10px)',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <p style={{ 
            fontSize: 15, 
            color: '#EF4444', 
            margin: 0, 
            textAlign: 'center',
            textShadow: '0 0 10px rgba(239, 68, 68, 0.3)',
          }}>
            {error}
          </p>
        </div>
      )}

      <div style={{ 
        width: '100%', 
        maxWidth: 340, 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 12,
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Primary CTA Button */}
        <button
          onClick={handleAutoDetect}
          disabled={isProcessing}
          style={{
            width: '100%',
            padding: '18px 24px',
            background: isProcessing 
              ? 'rgba(100, 116, 139, 0.5)' 
              : 'linear-gradient(135deg, #3B82F6, #7C3AED)',
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
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            minHeight: 58,
            boxShadow: isProcessing 
              ? 'none' 
              : '0 0 30px rgba(59, 130, 246, 0.4)',
          }}
          data-testid="button-auto-detect-location"
        >
          {isProcessing ? (
            <>
              <Loader2 
                size={22} 
                style={{ 
                  animation: 'spin 1s linear infinite',
                  filter: 'drop-shadow(0 0 5px rgba(255,255,255,0.5))',
                }} 
              />
              Определяем местоположение...
            </>
          ) : (
            <>
              <MapPin 
                size={22} 
                style={{ filter: 'drop-shadow(0 0 5px rgba(255,255,255,0.5))' }}
              />
              Определить автоматически
            </>
          )}
        </button>

        {/* Secondary Button */}
        <button
          onClick={handleSelectOnMap}
          disabled={isProcessing}
          style={{
            width: '100%',
            padding: '18px 24px',
            background: 'rgba(59, 130, 246, 0.1)',
            color: '#3B82F6',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: 14,
            fontSize: 17,
            fontWeight: 600,
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            minHeight: 58,
            opacity: isProcessing ? 0.5 : 1,
            backdropFilter: 'blur(10px)',
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
          color: '#64748B',
          margin: '32px 0 0',
          textAlign: 'center',
          maxWidth: 280,
          lineHeight: 1.5,
          position: 'relative',
          zIndex: 1,
        }}
      >
        Вы всегда сможете изменить местоположение в настройках
      </p>
    </div>
  );
}
