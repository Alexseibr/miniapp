import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Header from '@/components/Header';
import BottomTabs from '@/components/BottomTabs';
import HomePage from '@/pages/HomePage';
import FeedPage from '@/pages/FeedPage';
import FavoritesPage from '@/pages/FavoritesPage';
import ProfilePage from '@/pages/ProfilePage';
import AdPage from '@/pages/AdPage';
import CategoryPage from '@/pages/CategoryPage';
import SeasonPage from '@/pages/SeasonPage';
import CartPanel from '@/components/CartPanel';
import { useUserStore } from '@/store/useUserStore';
import { getTelegramWebApp } from '@/utils/telegram';

export default function App() {
  const initialize = useUserStore((state) => state.initialize);
  const status = useUserStore((state) => state.status);
  const { pathname } = useLocation();

  useEffect(() => {
    const tg = getTelegramWebApp();
    tg?.ready();
    tg?.expand();
    initialize();
  }, [initialize]);

  useEffect(() => {
    const tg = getTelegramWebApp();
    if (tg) {
      tg.MainButton.hide();
    }
  }, [pathname]);

  return (
    <div className="app-shell">
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/ads/:id" element={<AdPage />} />
          <Route path="/categories/:slug" element={<CategoryPage />} />
          <Route path="/season/:code" element={<SeasonPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomTabs />
      <CartPanel />
      {status === 'error' && (
        <div style={{ padding: 12, textAlign: 'center', color: '#ef4444' }}>
          Ошибка авторизации. Попробуйте перезапустить мини-приложение.
        </div>
      )}
    </div>
  );
}
