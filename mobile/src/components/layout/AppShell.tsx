import React from 'react';
import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { useTheme } from '../../theme/ThemeProvider';

export const AppShell: React.FC = () => {
  const { primaryColor, cityName } = useTheme();

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="container-mobile flex min-h-screen flex-col bg-white">
        <header className="sticky top-0 z-10 border-b border-slate-100 bg-white/90 px-4 py-3 backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-slate-400">Kufar Code</p>
              <p className="text-base font-semibold text-slate-900">{cityName || 'Город'}</p>
            </div>
            <div
              className="h-9 w-9 rounded-full"
              style={{ background: primaryColor, boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}
            />
          </div>
        </header>
        <main className="flex-1 px-4 pb-20 pt-4">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </div>
  );
};
