import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect, useState, lazy, Suspense } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import BottomTabs from '@/components/BottomTabs';
import HomePage from '@/pages/HomePage';
import { useUserStore } from '@/store/useUserStore';
import { getTelegramWebApp } from '@/utils/telegram';
import { queryClient } from '@/lib/queryClient';
import { Loader2 } from 'lucide-react';

const FeedPage = lazy(() => import('@/pages/FeedPage'));
const FavoritesPage = lazy(() => import('@/pages/FavoritesPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const CategoryPage = lazy(() => import('@/pages/CategoryPage'));
const SubcategoryPage = lazy(() => import('@/pages/SubcategoryPage'));
const AdPage = lazy(() => import('@/pages/AdPage'));
const OrdersPage = lazy(() => import('@/pages/OrdersPage'));
const SeasonsPage = lazy(() => import('@/pages/SeasonsPage'));
const SeasonViewPage = lazy(() => import('@/pages/SeasonViewPage'));
const MyAdsPage = lazy(() => import('@/pages/MyAdsPage'));
const CreateAdPage = lazy(() => import('@/pages/CreateAdPage'));
const ConversationsPage = lazy(() => import('@/pages/ConversationsPage'));
const ChatPage = lazy(() => import('@/pages/ChatPage'));

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
          
          // Обработка deep link из Telegram (startapp параметр)
          const startParam = (tg as any).initDataUnsafe?.start_param;
          if (startParam) {
            console.log('📱 Deep link detected:', startParam);
            handleDeepLink(startParam);
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
  
  // Обработка deep link из бота
  function handleDeepLink(startParam: string) {
    // Формат: season_short_term_rental, category_realty_rent_daily и т.д.
    if (startParam.startsWith('season_')) {
      const seasonCode = startParam.replace('season_', '');
      // Перенаправляем на FeedPage с фильтром по сезону
      window.location.href = `/feed?season=${encodeURIComponent(seasonCode)}`;
    } else if (startParam.startsWith('category_')) {
      const categoryId = startParam.replace('category_', '');
      // Перенаправляем на FeedPage с фильтром по категории
      window.location.href = `/feed?categoryId=${encodeURIComponent(categoryId)}`;
    }
  }

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
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-600" />
          <div style={{ fontSize: '16px', color: '#666' }}>Загрузка...</div>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="app-shell">
        <main>
          <Suspense fallback={
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100vh',
              background: '#FFFFFF'
            }}>
              <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
            </div>
          }>
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
              <Route path="/my-ads" element={<MyAdsPage />} />
              <Route path="/ads/create" element={<CreateAdPage />} />
              <Route path="/chats" element={<ConversationsPage />} />
              <Route path="/chat/:conversationId" element={<ChatPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>

        <BottomTabs />
      </div>
    </QueryClientProvider>
  );
}
