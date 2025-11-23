import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
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
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      try {
        console.log('🚀 Initializing KETMAR Market MiniApp...');
        
        // Проверка Telegram WebApp SDK
        const tg = getTelegramWebApp();
        if (tg) {
          console.log('✅ Telegram WebApp SDK found');
          console.log('📱 Platform:', (tg as any).platform);
          console.log('🎨 Theme:', (tg as any).colorScheme);
          
          tg.ready();
          tg.expand();
          
          if ('enableClosingConfirmation' in tg) {
            (tg as any).enableClosingConfirmation();
          }
        } else {
          console.warn('⚠️ Telegram WebApp SDK not available - running in browser mode');
        }

        // Инициализация пользователя
        await initialize();
        console.log('✅ User store initialized');
        
        setIsInitialized(true);
        console.log('✅ App initialization complete');
      } catch (error) {
        console.error('❌ App initialization error:', error);
        setIsInitialized(true); // Показываем приложение даже при ошибке
      }
    };

    initApp();
  }, [initialize]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  if (!isInitialized) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#FFFFFF',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>🛍️</div>
          <div style={{ fontSize: '16px', color: '#666' }}>Загрузка...</div>
        </div>
      </div>
    );
  }

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
