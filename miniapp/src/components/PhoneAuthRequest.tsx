import { useState } from 'react';
import { Phone, Shield, CheckCircle2 } from 'lucide-react';
import { getTelegramWebApp } from '@/utils/telegram';

interface PhoneAuthRequestProps {
  onPhoneReceived: (phone: string) => void;
  onSkip: () => void;
}

export default function PhoneAuthRequest({ onPhoneReceived, onSkip }: PhoneAuthRequestProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useManualInput, setUseManualInput] = useState(false);

  const handleRequestPhone = () => {
    const tg = getTelegramWebApp();
    
    if (!tg) {
      console.error('Telegram WebApp not available');
      setUseManualInput(true);
      return;
    }

    // Запрос номера телефона через Telegram WebApp API
    const tgAny = tg as any;
    if (typeof tgAny.requestContact === 'function') {
      tgAny.requestContact((contactShared: boolean, contact: { phone_number?: string }) => {
        if (contactShared && contact?.phone_number) {
          console.log('✅ Phone received:', contact.phone_number);
          onPhoneReceived(contact.phone_number);
        } else {
          console.log('❌ Phone request cancelled, switching to manual input');
          setUseManualInput(true);
        }
      });
    } else {
      console.error('requestContact not supported, switching to manual input');
      setUseManualInput(true);
    }
  };

  const handleManualSubmit = async () => {
    if (!phoneNumber.trim()) {
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onPhoneReceived(phoneNumber);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="phone-auth-container">
      <div className="phone-auth-card">
        <div className="phone-auth-icon-wrapper">
          <Phone className="phone-auth-icon" strokeWidth={1.5} />
        </div>
        
        <h2 className="phone-auth-title" data-testid="text-phone-auth-title">
          Подтвердите номер телефона
        </h2>
        
        <p className="phone-auth-description" data-testid="text-phone-auth-description">
          Для использования маркетплейса KETMAR нам нужен ваш номер телефона
        </p>

        <div className="phone-auth-benefits">
          <div className="phone-auth-benefit">
            <CheckCircle2 className="phone-auth-benefit-icon" />
            <span>Безопасная авторизация через Telegram</span>
          </div>
          
          <div className="phone-auth-benefit">
            <Shield className="phone-auth-benefit-icon" />
            <span>Ваши данные защищены и не передаются третьим лицам</span>
          </div>
          
          <div className="phone-auth-benefit">
            <Phone className="phone-auth-benefit-icon" />
            <span>Продавцы смогут связаться с вами по объявлениям</span>
          </div>
        </div>

        {!useManualInput ? (
          <>
            <button 
              type="button"
              className="phone-auth-button"
              onClick={handleRequestPhone}
              data-testid="button-request-phone"
            >
              <Phone className="phone-auth-button-icon" />
              Поделиться номером телефона
            </button>

            <button
              type="button"
              className="phone-auth-skip-button"
              onClick={() => setUseManualInput(true)}
              data-testid="button-manual-input"
            >
              Ввести номер вручную
            </button>
          </>
        ) : (
          <div style={{ width: '100%' }}>
            <input
              type="tel"
              className="phone-auth-input"
              placeholder="+375 (29) 123-45-67"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              data-testid="input-phone-manual"
              style={{
                width: '100%',
                padding: '14px 16px',
                fontSize: '16px',
                border: '1px solid #E0E0E0',
                borderRadius: '12px',
                marginBottom: '12px',
                fontFamily: 'inherit'
              }}
            />
            <button 
              type="button"
              className="phone-auth-button"
              onClick={handleManualSubmit}
              disabled={!phoneNumber.trim() || isSubmitting}
              data-testid="button-submit-phone"
            >
              <Phone className="phone-auth-button-icon" />
              {isSubmitting ? 'Сохранение...' : 'Продолжить'}
            </button>
          </div>
        )}

        <button
          type="button"
          className="phone-auth-skip-button"
          onClick={onSkip}
          data-testid="button-skip-phone"
        >
          Пропустить (режим просмотра)
        </button>

        <p className="phone-auth-footer">
          В режиме просмотра вы сможете смотреть объявления, но не сможете создавать свои или добавлять в избранное
        </p>
      </div>
    </div>
  );
}
