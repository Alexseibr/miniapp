import { useLocation } from 'react-router-dom';
import { useUserStore } from '@/store/useUserStore';
import { parseAppMode } from '@/utils/telegram';

export default function Header() {
  const { search } = useLocation();
  const { user, status } = useUserStore((state) => ({
    user: state.user,
    status: state.status,
  }));
  const mode = parseAppMode(search);

  const name = user?.firstName || user?.username || 'Гость';
  const subtitle = mode.season
    ? `Сезонный режим: ${mode.season}`
    : mode.niche
      ? `Подборка: ${mode.niche}`
      : 'Добро пожаловать в маркетплейс';

  return (
    <header className="card" style={{ margin: '16px', marginBottom: 8 }}>
      <p className="badge" style={{ marginBottom: 8 }}>
        {mode.season ? 'Сезон' : mode.niche ? 'Ниша' : 'Маркетплейс'}
      </p>
      <h1 style={{ margin: '0 0 8px', fontSize: '1.4rem' }}>Привет, {name}!</h1>
      <p style={{ margin: 0, color: '#475467' }}>{subtitle}</p>
      {status === 'loading' && (
        <p style={{ marginTop: 12, fontSize: '0.9rem', color: '#475467' }}>
          Проверяем авторизацию…
        </p>
      )}
    </header>
  );
}
