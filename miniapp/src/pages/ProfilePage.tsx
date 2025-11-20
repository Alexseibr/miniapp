import { useMemo, useState } from 'react';
import EmptyState from '@/widgets/EmptyState';
import { useUserStore } from '@/store/useUserStore';
import { useGeo } from '@/utils/geo';
import { getTelegramWebApp } from '@/utils/telegram';

export default function ProfilePage() {
  const user = useUserStore((state) => state.user);
  const { requestLocation, status } = useGeo();
  const [showContacts, setShowContacts] = useState(false);
  const [instagram, setInstagram] = useState(user?.instagram || '');
  const [showUsername, setShowUsername] = useState<boolean>(user?.showUsername ?? true);
  const [showPhone, setShowPhone] = useState<boolean>(user?.showPhone ?? false);
  const [showInstagram, setShowInstagram] = useState<boolean>(user?.showInstagram ?? true);

  const telegramSummary = useMemo(() => {
    if (!user) return null;
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Пользователь';
  }, [user]);

  const handleOpenBot = () => {
    const botUsername = import.meta.env.VITE_BOT_USERNAME || '';
    const tg = getTelegramWebApp();
    if (!botUsername) {
      console.warn('BOT username is not configured');
      return;
    }
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(`https://t.me/${botUsername}`);
      return;
    }
    window.open(`https://t.me/${botUsername}`.replace(/\/?$/, ''), '_blank');
  };

  if (!user) {
    return (
      <EmptyState
        title="Авторизуйтесь через Telegram"
        description="Откройте MiniApp из чата с ботом, чтобы подтянуть аккаунт"
      />
    );
  }

  return (
    <div className="container">
      <section className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Личный кабинет</h3>
        <p style={{ marginBottom: 4 }}>{telegramSummary}</p>
        <p style={{ marginBottom: 4 }}>@{user.username || 'не указан'}</p>
        <p style={{ marginBottom: 4 }}>Telegram ID: {user.telegramId}</p>
        <p style={{ marginBottom: 12 }}>Роль: {user.role || 'buyer'}</p>
        {user.phone && showContacts && <p>Телефон: {user.phone}</p>}
        {user.instagram && showContacts && <p>Instagram: {user.instagram}</p>}
        <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          <button type="button" className="secondary" onClick={() => setShowContacts((prev) => !prev)}>
            {showContacts ? 'Скрыть контакты' : 'Показать контакты'}
          </button>
          <button type="button" className="secondary" onClick={handleOpenBot}>
            Открыть чат с ботом
          </button>
        </div>
      </section>

      <section className="card">
        <h3 style={{ marginTop: 0 }}>Настройки контактов</h3>
        <div className="stack" style={{ gap: 8 }}>
          <label className="row" style={{ gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={showUsername} onChange={(e) => setShowUsername(e.target.checked)} />
            <span>Показывать username покупателю</span>
          </label>
          <label className="row" style={{ gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={showPhone} onChange={(e) => setShowPhone(e.target.checked)} />
            <span>Показывать телефон</span>
          </label>
          <label className="row" style={{ gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={showInstagram} onChange={(e) => setShowInstagram(e.target.checked)} />
            <span>Показывать Instagram</span>
          </label>
          <div>
            <label htmlFor="instagram" style={{ display: 'block', marginBottom: 6 }}>
              Instagram
            </label>
            <input
              id="instagram"
              type="text"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="@username"
              style={{ width: '100%' }}
            />
          </div>
          <p style={{ margin: '4px 0', color: '#475467' }}>
            Сохранение настроек будет подключено к /api/users/me на следующих этапах.
          </p>
        </div>
      </section>

      <section className="card">
        <h3 style={{ marginTop: 0 }}>Геопозиция</h3>
        <p style={{ marginBottom: 12 }}>
          {status === 'ready'
            ? 'Геопозиция обновлена. Объявления "рядом" доступны в ленте.'
            : 'Нажмите кнопку ниже, чтобы отправить координаты и видеть ближайшие объявления.'}
        </p>
        <button type="button" className="primary" onClick={requestLocation} disabled={status === 'loading'}>
          {status === 'loading' ? 'Отправляем координаты…' : 'Обновить геопозицию'}
        </button>
      </section>
    </div>
  );
}
