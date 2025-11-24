import { MessageCircle, CheckCircle2, LogIn } from 'lucide-react';
import { getTelegramWebApp } from '@/utils/telegram';
import logoPath from '@/assets/ketmar_logo_rgb.svg';

export default function AuthScreen() {
  const handleOpenBot = () => {
    const botUsername = import.meta.env.VITE_BOT_USERNAME || 'KetmarM_bot';
    const tg = getTelegramWebApp();
    
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(`https://t.me/${botUsername}`);
      return;
    }
    window.open(`https://t.me/${botUsername}`, '_blank');
  };

  return (
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
          <p className="auth-screen-subtitle" data-testid="text-auth-subtitle">
            мини-приложение
          </p>
        </div>

        <div className="auth-screen-content">
          <div className="auth-screen-icon-wrapper">
            <MessageCircle className="auth-screen-telegram-icon" strokeWidth={1.5} />
          </div>
          
          <h2 className="auth-screen-heading" data-testid="text-auth-heading">
            Авторизуйтесь через Telegram
          </h2>
          
          <p className="auth-screen-description" data-testid="text-auth-description">
            Для доступа к личному кабинету откройте приложение из чата с ботом
          </p>

          <div className="auth-screen-steps">
            <div className="auth-screen-step">
              <div className="auth-screen-step-number">1</div>
              <div className="auth-screen-step-content">
                <h3 className="auth-screen-step-title">Откройте бота</h3>
                <p className="auth-screen-step-text">
                  Нажмите на кнопку ниже, чтобы перейти в чат с ботом
                </p>
              </div>
            </div>

            <div className="auth-screen-step">
              <div className="auth-screen-step-number">2</div>
              <div className="auth-screen-step-content">
                <h3 className="auth-screen-step-title">Запустите бота</h3>
                <p className="auth-screen-step-text">
                  Нажмите "Старт" или отправьте команду /start
                </p>
              </div>
            </div>

            <div className="auth-screen-step">
              <div className="auth-screen-step-number">3</div>
              <div className="auth-screen-step-content">
                <h3 className="auth-screen-step-title">Откройте приложение</h3>
                <p className="auth-screen-step-text">
                  Используйте кнопку меню или команду для запуска приложения
                </p>
              </div>
            </div>
          </div>

          <button 
            type="button" 
            className="auth-screen-button"
            onClick={handleOpenBot}
            data-testid="button-open-bot"
          >
            <MessageCircle className="auth-screen-button-icon" />
            Открыть бота @KetmarM_bot
          </button>

          <div className="auth-screen-footer">
            <CheckCircle2 className="auth-screen-footer-icon" />
            <p className="auth-screen-footer-text">
              После авторизации вы получите доступ к избранному, своим объявлениям и личному кабинету
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
