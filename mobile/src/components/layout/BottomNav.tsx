import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../../theme/ThemeProvider';

const NAV_ITEMS = [
  { to: '/', label: 'Домой', icon: '🏠' },
  { to: '/city', label: 'Города', icon: '📍' },
  { to: '/favorites', label: 'Избранное', icon: '❤️' },
  { to: '/profile', label: 'Профиль', icon: '👤' },
];

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const { primaryColor } = useTheme();

  return (
    <nav className="sticky bottom-0 z-20 w-full border-t border-slate-200 bg-white/90 backdrop-blur">
      <div className="container-mobile flex items-center justify-between px-4 py-3">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className="flex flex-1 flex-col items-center gap-1 text-sm font-semibold"
              style={{ color: isActive ? primaryColor : '#475569' }}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
