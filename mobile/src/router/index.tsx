import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { HomePage } from '../pages/HomePage';
import { CityPage } from '../pages/CityPage';
import { AdPage } from '../pages/AdPage';
import { FavoritesPage } from '../pages/FavoritesPage';
import { SeasonPage } from '../pages/SeasonPage';
import { ProfilePage } from '../pages/ProfilePage';
import { AppShell } from '../components/layout/AppShell';

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/city" element={<CityPage />} />
          <Route path="/ad/:id" element={<AdPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/season/:code" element={<SeasonPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};
