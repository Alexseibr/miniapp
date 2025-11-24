import React from 'react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Домой' },
  { to: '/categories', label: 'Категории' },
  { to: '/favorites', label: 'Избранное' },
  { to: '/profile', label: 'Профиль' },
];

export const BottomNav: React.FC = () => {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-mobile items-center justify-around px-2 py-2 text-xs font-medium text-slate-600">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center rounded-lg px-3 py-2 transition ${
                isActive ? 'text-primary' : 'text-slate-500'
              }`
            }
          >
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
