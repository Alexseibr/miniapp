import { useState } from 'react';
import EmptyState from '@/widgets/EmptyState';
import { useUserStore } from '@/store/useUserStore';
import { useGeo } from '@/utils/geo';

export default function ProfilePage() {
  const user = useUserStore((state) => state.user);
  const { requestLocation, status } = useGeo();
  const [showContacts, setShowContacts] = useState(false);

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
        <h3 style={{ marginTop: 0 }}>Профиль продавца</h3>
        <p style={{ marginBottom: 4 }}>@{user.username || 'не указан'}</p>
        <p style={{ marginBottom: 4 }}>Telegram ID: {user.telegramId}</p>
        <p style={{ marginBottom: 4 }}>Роль: {user.role || 'buyer'}</p>
        {user.phone && showContacts && <p>Телефон: {user.phone}</p>}
        {user.instagram && <p>Instagram: {user.instagram}</p>}
        <button type="button" className="secondary" onClick={() => setShowContacts((prev) => !prev)}>
          {showContacts ? 'Скрыть контакты' : 'Показать контакты'}
        </button>
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
