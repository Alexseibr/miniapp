import { useSearchParams } from 'react-router-dom';

export default function ShopEntryScreen() {
  const [searchParams] = useSearchParams();
  const modeParam = searchParams.get('mode');
  const mode = modeParam === 'dashboard' ? 'dashboard' : 'create';

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: '#0B1220',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 16,
          padding: 24,
          textAlign: 'center',
          color: '#E5E7EB',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.35)',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 64,
            height: 64,
            borderRadius: 16,
            marginBottom: 16,
            background: 'linear-gradient(135deg, #4ADE80, #22D3EE)',
            color: '#0B1220',
            fontSize: 28,
            fontWeight: 800,
          }}
        >
          🛍️
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 12px' }}>
          {mode === 'dashboard' ? 'Кабинет магазина' : 'Создание магазина'}
        </h1>
        <p style={{ margin: 0, fontSize: 15, color: '#9CA3AF' }}>
          Этот экран скоро будет доступен. Следите за обновлениями!
        </p>
      </div>
    </div>
  );
}
