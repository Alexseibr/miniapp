import { NavLink } from 'react-router-dom';
import { Home, Compass, Heart, User } from 'lucide-react';

const tabs = [
  { path: '/', label: 'Главная', Icon: Home },
  { path: '/feed', label: 'Лента', Icon: Compass },
  { path: '/favorites', label: 'Избранное', Icon: Heart },
  { path: '/profile', label: 'Профиль', Icon: User },
];

export default function BottomTabs() {
  return (
    <nav
      data-testid="bottom-tabs"
      style={{
        position: 'sticky',
        bottom: 0,
        background: '#fff',
        padding: '12px 16px calc(env(safe-area-inset-bottom) + 12px)',
        boxShadow: '0 -4px 24px rgba(15, 23, 42, 0.08)',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        marginTop: 'auto',
        zIndex: 20,
      }}
    >
      <div className="tab-nav">
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            data-testid={`tab-${tab.label.toLowerCase()}`}
            className={({ isActive }) => (isActive ? 'active' : '')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              padding: '10px',
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            {({ isActive }) => (
              <>
                <tab.Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span style={{ fontSize: '0.75rem', fontWeight: isActive ? 600 : 500 }}>
                  {tab.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
