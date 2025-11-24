import { useState } from 'react';
import { Phone, Shield, CheckCircle2 } from 'lucide-react';
import { getTelegramWebApp } from '@/utils/telegram';

interface PhoneAuthRequestProps {
  onPhoneReceived: (phone: string) => void;
  onCancel?: () => void;
}

export default function PhoneAuthRequest({ onPhoneReceived, onCancel }: PhoneAuthRequestProps) {
  const [isRequesting, setIsRequesting] = useState(false);

  const handleRequestPhone = () => {
    const tg = getTelegramWebApp();
    
    if (!tg) {
      console.error('Telegram WebApp not available');
      return;
    }

    setIsRequesting(true);

    // Запрос номера телефона через Telegram WebApp API
    const tgAny = tg as any;
    if (typeof tgAny.requestContact === 'function') {
      tgAny.requestContact((contactShared: boolean, contact: { phone_number?: string }) => {
        setIsRequesting(false);
        
        if (contactShared && contact?.phone_number) {
          console.log('✅ Phone received:', contact.phone_number);
          onPhoneReceived(contact.phone_number);
        } else {
          console.log('❌ Phone request cancelled');
          if (onCancel) {
            onCancel();
          }
        }
      });
    } else {
      console.error('requestContact not supported');
      setIsRequesting(false);
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

        <button 
          type="button"
          className="phone-auth-button"
          onClick={handleRequestPhone}
          disabled={isRequesting}
          data-testid="button-request-phone"
        >
          <Phone className="phone-auth-button-icon" />
          {isRequesting ? 'Ожидание...' : 'Поделиться номером телефона'}
        </button>

        <p className="phone-auth-footer">
          Нажимая кнопку, вы подтверждаете, что ознакомились с условиями использования сервиса
        </p>
      </div>
    </div>
  );
}
