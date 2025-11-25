/**
 * Phone Verification Component
 * Handles phone number verification for account linking
 */

import { useState, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Phone, MessageCircle, ArrowRight, Loader2, Check, X, RefreshCw } from 'lucide-react';
import { usePlatform } from '../../platform/PlatformProvider';
import './PhoneVerification.css';

interface PhoneVerificationProps {
  onSuccess?: (phone: string) => void;
  onCancel?: () => void;
  purpose?: 'login' | 'link_phone';
  showCancel?: boolean;
}

export function PhoneVerification({ 
  onSuccess, 
  onCancel,
  purpose = 'link_phone',
  showCancel = true 
}: PhoneVerificationProps) {
  const { platform, platformType, setAuthToken, showAlert } = usePlatform();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code' | 'success'>('phone');
  const [countdown, setCountdown] = useState(0);
  const [normalizedPhone, setNormalizedPhone] = useState('');
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  useEffect(() => {
    if (step === 'code' && codeInputRef.current) {
      codeInputRef.current.focus();
    }
  }, [step]);

  const getStoredToken = (): string | null => {
    try {
      return localStorage.getItem('ketmar_auth_token');
    } catch {
      return null;
    }
  };

  const requestCodeMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      const endpoint = purpose === 'link_phone' 
        ? '/api/auth/link-phone/request' 
        : '/api/auth/sms/request';
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      const token = getStoredToken();
      if (token && purpose === 'link_phone') {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ phone: phoneNumber, platform: platformType }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send code');
      }
      
      return data;
    },
    onSuccess: (data) => {
      setNormalizedPhone(data.phone);
      setStep('code');
      setCountdown(60);
      showAlert(`SMS с кодом отправлено на ${formatPhone(data.phone)}`, 'success');
    },
    onError: (error: Error) => {
      let message = 'Не удалось отправить SMS';
      
      if (error.message === 'too_many_requests') {
        message = 'Слишком много запросов. Подождите минуту.';
      } else if (error.message === 'invalid_phone') {
        message = 'Неверный формат номера телефона';
      }
      
      showAlert(message, 'error');
    },
  });

  const verifyCodeMutation = useMutation({
    mutationFn: async ({ phone, code }: { phone: string; code: string }) => {
      const endpoint = purpose === 'link_phone' 
        ? '/api/auth/link-phone/verify' 
        : '/api/auth/sms/verify';
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      const token = getStoredToken();
      if (token && purpose === 'link_phone') {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ phone, code, platform: platformType }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }
      
      return data;
    },
    onSuccess: (data) => {
      if (data.token) {
        setAuthToken(data.token);
      }
      
      setStep('success');
      
      const message = data.merged 
        ? 'Аккаунты успешно объединены' 
        : 'Номер телефона подтвержден';
      
      showAlert(message, 'success');
      
      setTimeout(() => {
        onSuccess?.(normalizedPhone);
      }, 1500);
    },
    onError: (error: Error) => {
      let message = 'Неверный код';
      
      if (error.message === 'code_expired') {
        message = 'Код устарел. Запросите новый.';
      } else if (error.message === 'max_attempts_exceeded') {
        message = 'Превышено количество попыток. Запросите новый код.';
        setStep('phone');
        setCode('');
      }
      
      showAlert(message, 'error');
    },
  });

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length >= 10) {
      requestCodeMutation.mutate(phone);
    }
  };

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length === 6) {
      verifyCodeMutation.mutate({ phone: normalizedPhone, code });
    }
  };

  const handleResendCode = () => {
    if (countdown === 0) {
      requestCodeMutation.mutate(phone);
    }
  };

  const formatPhone = (phoneStr: string) => {
    const cleaned = phoneStr.replace(/\D/g, '');
    if (cleaned.startsWith('375')) {
      return `+375 (${cleaned.slice(3, 5)}) ${cleaned.slice(5, 8)}-${cleaned.slice(8, 10)}-${cleaned.slice(10)}`;
    }
    if (cleaned.startsWith('7')) {
      return `+7 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 9)}-${cleaned.slice(9)}`;
    }
    return `+${cleaned}`;
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(value);
  };

  if (step === 'success') {
    return (
      <div className="phone-verification-card" data-testid="card-verification-success">
        <div className="phone-verification-success">
          <div className="phone-verification-success-icon">
            <Check className="w-8 h-8" />
          </div>
          <h3 className="phone-verification-title">Подтверждено</h3>
          <p className="phone-verification-description">
            Номер {formatPhone(normalizedPhone)} успешно подтвержден
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="phone-verification-card" data-testid="card-phone-verification">
      <div className="phone-verification-header">
        <h2 className="phone-verification-title">
          {step === 'phone' ? (
            <>
              <Phone className="phone-verification-icon" />
              Подтверждение телефона
            </>
          ) : (
            <>
              <MessageCircle className="phone-verification-icon" />
              Введите код
            </>
          )}
        </h2>
        <p className="phone-verification-description">
          {step === 'phone' 
            ? 'Введите номер телефона для подтверждения'
            : `Мы отправили SMS на ${formatPhone(normalizedPhone)}`
          }
        </p>
      </div>
      
      <div className="phone-verification-content">
        {step === 'phone' ? (
          <form onSubmit={handlePhoneSubmit} className="phone-verification-form">
            <div className="phone-verification-field">
              <input
                type="tel"
                placeholder="+375 (29) 123-45-67"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="phone-verification-input"
                data-testid="input-phone"
                autoFocus
              />
              <p className="phone-verification-hint">
                Формат: +375XXXXXXXXX или 80XXXXXXXXX
              </p>
            </div>
            
            <div className="phone-verification-buttons">
              {showCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="phone-verification-btn phone-verification-btn-secondary"
                  data-testid="button-cancel"
                >
                  Отмена
                </button>
              )}
              <button
                type="submit"
                className="phone-verification-btn phone-verification-btn-primary"
                disabled={phone.length < 10 || requestCodeMutation.isPending}
                data-testid="button-send-code"
              >
                {requestCodeMutation.isPending ? (
                  <Loader2 className="phone-verification-btn-icon animate-spin" />
                ) : (
                  <ArrowRight className="phone-verification-btn-icon" />
                )}
                Отправить код
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleCodeSubmit} className="phone-verification-form">
            <div className="phone-verification-field">
              <input
                ref={codeInputRef}
                type="text"
                inputMode="numeric"
                placeholder="000000"
                value={code}
                onChange={handleCodeChange}
                className="phone-verification-input phone-verification-code-input"
                maxLength={6}
                data-testid="input-code"
              />
              <div className="phone-verification-code-actions">
                <button
                  type="button"
                  onClick={() => {
                    setStep('phone');
                    setCode('');
                  }}
                  className="phone-verification-link"
                  data-testid="button-change-phone"
                >
                  Изменить номер
                </button>
                {countdown > 0 ? (
                  <span className="phone-verification-countdown">
                    Повторить через {countdown} сек
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendCode}
                    className="phone-verification-link"
                    disabled={requestCodeMutation.isPending}
                    data-testid="button-resend-code"
                  >
                    <RefreshCw className="phone-verification-link-icon" />
                    Отправить снова
                  </button>
                )}
              </div>
            </div>
            
            <div className="phone-verification-buttons">
              {showCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="phone-verification-btn phone-verification-btn-secondary"
                  data-testid="button-cancel-code"
                >
                  <X className="phone-verification-btn-icon" />
                  Отмена
                </button>
              )}
              <button
                type="submit"
                className="phone-verification-btn phone-verification-btn-primary"
                disabled={code.length !== 6 || verifyCodeMutation.isPending}
                data-testid="button-verify-code"
              >
                {verifyCodeMutation.isPending ? (
                  <Loader2 className="phone-verification-btn-icon animate-spin" />
                ) : (
                  <Check className="phone-verification-btn-icon" />
                )}
                Подтвердить
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default PhoneVerification;
