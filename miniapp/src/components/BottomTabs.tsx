import { NavLink } from 'react-router-dom';

const tabs = [
  { path: '/dashboard', label: 'Дашборд', emoji: '📊' },
  { path: '/categories', label: 'Категории', emoji: '🗂️' },
  { path: '/ads', label: 'Объявления', emoji: '📢' },
];

export default function BottomTabs() {
  return (
    <nav
      style={{
        position: 'sticky',
        bottom: 0,
        background: '#fff',
        padding: '12px 16px calc(env(safe-area-inset-bottom) + 16px)',
        boxShadow: '0 -4px 24px rgba(15, 23, 42, 0.08)',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        marginTop: 'auto',
      }}
    >
      <div className="tab-nav">
        {tabs.map((tab) => (
          <NavLink key={tab.path} to={tab.path} className={({ isActive }) => (isActive ? 'active' : '')}>
            {({ isActive }) => (
              <button type="button" className={isActive ? 'active' : undefined}>
                <span style={{ fontSize: '1.1rem' }}>{tab.emoji}</span>
                <span style={{ display: 'block', marginTop: 4 }}>{tab.label}</span>
              </button>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
