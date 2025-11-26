import { NavLink, useLocation } from 'react-router-dom';
import { Home, Compass, ShoppingBag, Heart, User } from 'lucide-react';
import { getTelegramWebApp } from '@/utils/telegram';

const tabs = [
  { path: '/', label: 'Главная', Icon: Home },
  { path: '/feed', label: 'Лента', Icon: Compass },
  { path: '/my-ads', label: 'Мои', Icon: ShoppingBag },
  { path: '/favorites', label: 'Избранное', Icon: Heart },
  { path: '/profile', label: 'Профиль', Icon: User },
];

export default function BottomTabs() {
  const location = useLocation();
  const isTelegramWebApp = !!getTelegramWebApp();

  if (!isTelegramWebApp) {
    return null;
  }

  return (
    <nav
      data-testid="bottom-tabs"
      style={{
        position: 'sticky',
        bottom: 0,
        background: '#FFFFFF',
        padding: '8px 0 calc(env(safe-area-inset-bottom) + 8px)',
        borderTop: '1px solid #E5E7EB',
        marginTop: 'auto',
        zIndex: 100,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          maxWidth: 500,
          margin: '0 auto',
        }}
      >
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path || 
            (tab.path === '/' && location.pathname === '/home');
          
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              data-testid={`tab-${tab.path === '/' ? 'home' : tab.path.slice(1)}`}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                padding: '8px 4px',
                textDecoration: 'none',
                position: 'relative',
              }}
            >
              {isActive && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: -8,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 24,
                    height: 2,
                    background: '#3A7BFF',
                    borderRadius: 1,
                  }}
                />
              )}
              <tab.Icon
                size={24}
                fill={isActive ? '#3A7BFF' : 'none'}
                strokeWidth={isActive ? 2 : 1.5}
                style={{
                  color: isActive ? '#3A7BFF' : '#9CA3AF',
                  transition: 'all 0.2s ease',
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#3A7BFF' : '#9CA3AF',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                  textAlign: 'center',
                }}
              >
                {tab.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
