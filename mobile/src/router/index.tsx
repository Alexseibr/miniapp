import React from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { HomePage } from '../pages/HomePage';
import { CitySelectPage } from '../pages/CitySelectPage';
import { AdPage } from '../pages/AdPage';
import { FavoritesPage } from '../pages/FavoritesPage';
import { CategoriesPage } from '../pages/CategoriesPage';
import { ProfilePage } from '../pages/ProfilePage';
import { BottomNav } from '../components/layout/BottomNav';

const Shell: React.FC = () => (
  <div className="app-shell mx-auto flex min-h-screen max-w-mobile flex-col bg-slate-50">
    <div className="flex-1">
      <Outlet />
    </div>
    <BottomNav />
  </div>
);

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/city" element={<CitySelectPage />} />
          <Route path="/ad/:id" element={<AdPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};
