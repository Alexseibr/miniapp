import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import BottomTabs from '@/components/BottomTabs';
import HomePage from '@/pages/HomePage';
import FeedPage from '@/pages/FeedPage';
import FavoritesPage from '@/pages/FavoritesPage';
import ProfilePage from '@/pages/ProfilePage';
import CategoryPage from '@/pages/CategoryPage';
import SubcategoryPage from '@/pages/SubcategoryPage';
import AdPage from '@/pages/AdPage';
import OrdersPage from '@/pages/OrdersPage';
import SeasonsPage from '@/pages/SeasonsPage';
import SeasonViewPage from '@/pages/SeasonViewPage';
import { useUserStore } from '@/store/useUserStore';
import { getTelegramWebApp } from '@/utils/telegram';

export default function App() {
  const location = useLocation();
  const initialize = useUserStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    const tg = getTelegramWebApp();
    if (tg) {
      tg.ready();
      tg.expand();
      if ('enableClosingConfirmation' in tg) {
        (tg as any).enableClosingConfirmation();
      }
    }
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/category/:slug" element={<SubcategoryPage />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/seasons" element={<SeasonsPage />} />
          <Route path="/seasons/:code" element={<SeasonViewPage />} />
          <Route path="/categories/:slug" element={<CategoryPage />} />
          <Route path="/ads/:id" element={<AdPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <BottomTabs />
    </div>
  );
}
