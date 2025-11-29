import { useState, useEffect } from 'react';
import { Phone, MapPin, Users, Sparkles, Loader2, CheckCircle2, Shield, Eye } from 'lucide-react';
import { getTelegramWebApp } from '@/utils/telegram';

interface PhoneAuthRequestProps {
  onPhoneReceived: (phone: string) => void;
  onSkip: () => void;
}

export default function PhoneAuthRequest({ onPhoneReceived, onSkip }: PhoneAuthRequestProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [isRequesting, setIsRequesting] = useState(true);
  const [requestFailed, setRequestFailed] = useState(false);

  const handleRequestPhone = () => {
    const tg = getTelegramWebApp();
    
    if (!tg) {
      console.error('Telegram WebApp not available');
      setIsRequesting(false);
      setRequestFailed(true);
      return;
    }

    setIsRequesting(true);
    setRequestFailed(false);
    const tgAny = tg as any;
    
    if (typeof tgAny.requestContact === 'function') {
      console.log('[PhoneAuth] Calling requestContact...');
      tgAny.requestContact((status: string | boolean, response: any) => {
        console.log('[PhoneAuth] requestContact callback:', { status, response, type: typeof status });
        setIsRequesting(false);
        
        // Handle different response formats
        let phoneNumber: string | null = null;
        
        // Format 1: status is "sent" and response has phone_number
        if (status === 'sent' && response?.phone_number) {
          phoneNumber = response.phone_number;
        }
        // Format 2: status is boolean true and response has phone_number
        else if (status === true && response?.phone_number) {
          phoneNumber = response.phone_number;
        }
        // Format 3: first param is the response object
        else if (typeof status === 'object' && (status as any)?.phone_number) {
          phoneNumber = (status as any).phone_number;
        }
        // Format 4: response is in responseUnsafe
        else if (response?.responseUnsafe?.contact?.phone_number) {
          phoneNumber = response.responseUnsafe.contact.phone_number;
        }
        
        if (phoneNumber) {
          console.log('[PhoneAuth] Phone received:', phoneNumber);
          onPhoneReceived(phoneNumber);
        } else {
          console.log('[PhoneAuth] Phone sharing cancelled or failed');
          setRequestFailed(true);
        }
      });
    } else {
      console.error('[PhoneAuth] requestContact not supported');
      setIsRequesting(false);
      setRequestFailed(true);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      handleRequestPhone();
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const handleManualSubmit = async () => {
    if (!phoneNumber.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onPhoneReceived(phoneNumber);
    } finally {
      setIsSubmitting(false);
    }
  };

  const features = [
    { icon: MapPin, label: 'Рядом с\nвами' },
    { icon: Users, label: 'Фермеры' },
    { icon: Sparkles, label: 'Свежие\nтовары' },
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
        padding: '24px 20px',
        overflow: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
      data-testid="phone-auth-screen"
    >
      {/* App Icon */}
      <div
        style={{
          width: 100,
          height: 100,
          background: '#3A7BFF',
          borderRadius: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 40,
          marginBottom: 24,
          boxShadow: '0 12px 40px rgba(58, 123, 255, 0.3)',
          flexShrink: 0,
        }}
      >
        <svg width="52" height="52" viewBox="0 0 60 60" fill="none">
          <rect x="12" y="8" width="36" height="32" rx="6" stroke="white" strokeWidth="3" fill="none"/>
          <path d="M12 20H48" stroke="white" strokeWidth="3"/>
          <circle cx="30" cy="30" r="4" fill="white"/>
          <path d="M20 44L30 52L40 44" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* Title */}
      <h1
        style={{
          fontSize: 26,
          fontWeight: 700,
          color: '#3A7BFF',
          margin: '0 0 6px',
          textAlign: 'center',
          letterSpacing: '-0.5px',
        }}
      >
        KETMAR Market
      </h1>

      <h2
        style={{
          fontSize: 20,
          fontWeight: 600,
          color: '#1F2937',
          margin: '0 0 12px',
          textAlign: 'center',
        }}
      >
        Добро пожаловать
      </h2>

      <p
        style={{
          fontSize: 15,
          color: '#6B7280',
          margin: '0 0 24px',
          textAlign: 'center',
          lineHeight: 1.5,
          maxWidth: 300,
        }}
      >
        Местный маркет быстрых товаров, фермерских продуктов и локальных услуг
      </p>

      {/* Feature Cards */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          marginBottom: 28,
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
              padding: '16px 10px',
              background: '#FFFFFF',
              borderRadius: 14,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: '#EBF3FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <feature.icon size={22} color="#3A7BFF" />
            </div>
            <span
              style={{
                fontSize: 12,
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

      {/* Phone Auth Card */}
      <div
        style={{
          width: '100%',
          maxWidth: 340,
          background: '#FFFFFF',
          borderRadius: 20,
          padding: '20px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        }}
      >
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 10, 
          marginBottom: 16 
        }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: '#EBF3FF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Phone size={20} color="#3A7BFF" />
          </div>
          <div>
            <h3 style={{ 
              margin: 0, 
              fontSize: 15, 
              fontWeight: 600, 
              color: '#1F2937' 
            }}>
              Подтвердите телефон
            </h3>
            <p style={{ 
              margin: 0, 
              fontSize: 12, 
              color: '#9CA3AF' 
            }}>
              Для полного доступа к маркетплейсу
            </p>
          </div>
        </div>

        {/* Benefits */}
        <div style={{ marginBottom: 16 }}>
          {[
            { icon: CheckCircle2, text: 'Безопасная авторизация через Telegram' },
            { icon: Shield, text: 'Данные защищены' },
            { icon: Phone, text: 'Продавцы смогут связаться с вами' },
          ].map((benefit, i) => (
            <div 
              key={i}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8, 
                marginBottom: 8 
              }}
            >
              <benefit.icon size={16} color="#22C55E" />
              <span style={{ fontSize: 13, color: '#4B5563' }}>
                {benefit.text}
              </span>
            </div>
          ))}
        </div>

        {/* Loading state - getting phone from Telegram */}
        {isRequesting && !requestFailed && (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            padding: '20px 0'
          }}>
            <Loader2 
              size={32} 
              color="#3A7BFF" 
              style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} 
            />
            <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>
              Получаем номер из Telegram...
            </p>
          </div>
        )}

        {/* After Telegram request failed - show options */}
        {!isRequesting && requestFailed && !showManualInput && (
          <>
            <button
              type="button"
              onClick={handleRequestPhone}
              style={{
                width: '100%',
                padding: '14px 20px',
                background: '#3A7BFF',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 14,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginBottom: 10,
                boxShadow: '0 4px 16px rgba(58, 123, 255, 0.3)',
              }}
              data-testid="button-request-phone"
            >
              <Phone size={18} />
              Поделиться номером из Telegram
            </button>

            <button
              type="button"
              onClick={() => setShowManualInput(true)}
              style={{
                width: '100%',
                padding: '12px',
                background: 'transparent',
                color: '#6B7280',
                border: '1px solid #E5E7EB',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
              }}
              data-testid="button-manual-input"
            >
              Ввести номер вручную
            </button>
          </>
        )}

        {/* Manual input mode */}
        {showManualInput && (
          <>
            <input
              type="tel"
              placeholder="+375 (29) 123-45-67"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              autoFocus
              style={{
                width: '100%',
                padding: '14px 16px',
                fontSize: 16,
                border: '1px solid #E5E7EB',
                borderRadius: 12,
                marginBottom: 12,
                outline: 'none',
                boxSizing: 'border-box',
              }}
              data-testid="input-phone-manual"
            />
            <button
              type="button"
              onClick={handleManualSubmit}
              disabled={!phoneNumber.trim() || isSubmitting}
              style={{
                width: '100%',
                padding: '14px 20px',
                background: (!phoneNumber.trim() || isSubmitting) ? '#9CA3AF' : '#3A7BFF',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 14,
                fontSize: 15,
                fontWeight: 600,
                cursor: (!phoneNumber.trim() || isSubmitting) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: (!phoneNumber.trim() || isSubmitting) ? 'none' : '0 4px 16px rgba(58, 123, 255, 0.3)',
              }}
              data-testid="button-submit-phone"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  Сохранение...
                </>
              ) : (
                'Продолжить'
              )}
            </button>
          </>
        )}
      </div>

      {/* Skip Button */}
      <button
        type="button"
        onClick={onSkip}
        style={{
          marginTop: 20,
          padding: '12px 24px',
          background: 'transparent',
          color: '#9CA3AF',
          border: 'none',
          fontSize: 14,
          fontWeight: 500,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
        data-testid="button-skip-phone"
      >
        <Eye size={16} />
        Пропустить (режим просмотра)
      </button>

      <p
        style={{
          fontSize: 12,
          color: '#9CA3AF',
          margin: '8px 0 0',
          textAlign: 'center',
          maxWidth: 280,
          lineHeight: 1.4,
        }}
      >
        В режиме просмотра можно смотреть объявления, но нельзя создавать свои
      </p>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
