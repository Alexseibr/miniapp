import { useLocation } from 'react-router-dom';
import { useUserStore } from '@/store/useUserStore';
import { parseAppMode } from '@/utils/telegram';
import { LogoFull } from './Logo';

export default function Header() {
  const { search } = useLocation();
  const { user, status } = useUserStore((state) => ({
    user: state.user,
    status: state.status,
  }));
  const mode = parseAppMode(search);

  const name = user?.firstName || user?.username || 'Гость';

  return (
    <header className="card" style={{ margin: '16px', marginBottom: 8, padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
        <LogoFull width={220} />
      </div>
      
      <h1 style={{ margin: 0, fontSize: '1.4rem', textAlign: 'center' }}>Привет, {name}!</h1>
    </header>
  );
}
