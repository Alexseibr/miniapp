import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageCircle, 
  Phone, 
  ArrowRight, 
  RefreshCcw,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useUserStore } from '@/store/useUserStore';
import { detectPlatform } from '@/platform/platformDetection';
import { getTelegramWebApp } from '@/utils/telegram';
import logoPath from '@/assets/ketmar_logo_rgb.svg';

export default function AuthScreen() {
  const navigate = useNavigate();
  const platform = detectPlatform();
  
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  
  const { 
    requestSmsCode, 
    verifySmsCode, 
    smsStep, 
    smsPending, 
    smsError,
    status,
    user
  } = useUserStore();

  useEffect(() => {
    if (status === 'ready' && user) {
      navigate('/', { replace: true });
    }
  }, [status, user, navigate]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    
    if (digits.startsWith('375')) {
      return '+' + digits;
    }
    if (digits.startsWith('7') || digits.startsWith('8')) {
      return '+' + digits;
    }
    if (digits.length > 0) {
      return '+375' + digits;
    }
    return '';
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
  };

  const handleRequestCode = async (e: FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 12) return;
    
    const success = await requestSmsCode(phone);
    if (success) {
      setCountdown(60);
    }
  };

  const handleVerifyCode = async (e: FormEvent) => {
    e.preventDefault();
    if (!code || code.length < 4) return;
    
    const success = await verifySmsCode(phone, code);
    if (success) {
      navigate('/', { replace: true });
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;
    
    const success = await requestSmsCode(phone);
    if (success) {
      setCountdown(60);
      setCode('');
    }
  };

  const handleOpenBot = () => {
    const botUsername = import.meta.env.VITE_BOT_USERNAME || 'KetmarM_bot';
    const tg = getTelegramWebApp();
    
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(`https://t.me/${botUsername}`);
      return;
    }
    window.open(`https://t.me/${botUsername}`, '_blank');
  };

  const handleEditPhone = () => {
    useUserStore.setState({ smsStep: 'phone', smsError: undefined });
    setCode('');
  };

  return (
    <div className="auth-screen" data-testid="auth-screen">
      <div className="auth-screen-container">
        <div className="auth-screen-card">
          <div className="auth-screen-header">
            <img 
              src={logoPath} 
              alt="Ketmar Market" 
              className="auth-screen-logo"
              data-testid="img-ketmar-logo"
            />
            <h1 className="auth-screen-title" data-testid="text-auth-title">
              Ketmar Market
            </h1>
            <p className="auth-screen-subtitle">
              Маркетплейс объявлений
            </p>
          </div>

          <div className="auth-screen-content">
            {smsStep === 'phone' && (
              <form onSubmit={handleRequestCode} className="auth-form">
                <div className="auth-form-header">
                  <Phone className="auth-form-icon" size={32} />
                  <h2 data-testid="text-sms-heading">Вход по номеру телефона</h2>
                  <p>Введите номер телефона для получения кода</p>
                </div>

                <div className="auth-form-field">
                  <label htmlFor="phone">Номер телефона</label>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="+375 (XX) XXX-XX-XX"
                    className="auth-form-input"
                    data-testid="input-phone"
                    autoComplete="tel"
                    disabled={smsPending}
                  />
                </div>

                {smsError && (
                  <div className="auth-form-error" data-testid="text-sms-error">
                    <AlertCircle size={16} />
                    {smsError}
                  </div>
                )}

                <button
                  type="submit"
                  className="auth-form-button primary"
                  disabled={smsPending || phone.length < 12}
                  data-testid="button-request-code"
                >
                  {smsPending ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Отправка...
                    </>
                  ) : (
                    <>
                      Получить код
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>
              </form>
            )}

            {smsStep === 'code' && (
              <form onSubmit={handleVerifyCode} className="auth-form">
                <div className="auth-form-header">
                  <CheckCircle2 className="auth-form-icon success" size={32} />
                  <h2 data-testid="text-verify-heading">Введите код</h2>
                  <p>Код отправлен на номер <strong>{phone}</strong></p>
                  <button 
                    type="button" 
                    className="auth-edit-phone"
                    onClick={handleEditPhone}
                    data-testid="button-edit-phone"
                  >
                    Изменить номер
                  </button>
                </div>

                <div className="auth-form-field">
                  <label htmlFor="code">Код из SMS</label>
                  <input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="XXXXXX"
                    className="auth-form-input code-input"
                    data-testid="input-code"
                    autoComplete="one-time-code"
                    disabled={smsPending}
                    autoFocus
                  />
                </div>

                {smsError && (
                  <div className="auth-form-error" data-testid="text-verify-error">
                    <AlertCircle size={16} />
                    {smsError}
                  </div>
                )}

                <button
                  type="submit"
                  className="auth-form-button primary"
                  disabled={smsPending || code.length < 4}
                  data-testid="button-verify-code"
                >
                  {smsPending ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Проверка...
                    </>
                  ) : (
                    <>
                      Войти
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="auth-form-button secondary"
                  onClick={handleResendCode}
                  disabled={countdown > 0 || smsPending}
                  data-testid="button-resend-code"
                >
                  <RefreshCcw size={18} />
                  {countdown > 0 ? `Отправить повторно (${countdown}с)` : 'Отправить повторно'}
                </button>
              </form>
            )}

            <div className="auth-divider">
              <span>или</span>
            </div>

            <button
              type="button"
              className="auth-telegram-button"
              onClick={handleOpenBot}
              data-testid="button-telegram-login"
            >
              <MessageCircle size={22} />
              Войти через Telegram
            </button>

            <p className="auth-telegram-hint">
              Откройте бота @KetmarM_bot в Telegram для авторизации
            </p>
          </div>

          <div className="auth-screen-footer">
            <p>
              Продолжая, вы соглашаетесь с условиями использования сервиса
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
