import { Route, Routes, useLocation, Navigate } from 'react-router-dom';
import { useEffect, useState, lazy, Suspense } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import BottomTabs from '@/components/BottomTabs';
import PhoneAuthRequest from '@/components/PhoneAuthRequest';
import PageLoader from '@/components/PageLoader';
import { useUserStore } from '@/store/useUserStore';
import { getTelegramWebApp } from '@/utils/telegram';
import { queryClient } from '@/lib/queryClient';
import { prefetchCriticalData } from '@/utils/prefetch';
import { useRoutePrefetch } from '@/hooks/useRoutePrefetch';
import { initWebVitals } from '@/utils/webVitals';
import { Loader2 } from 'lucide-react';
import { PlatformProvider } from '@/platform/PlatformProvider';

const HomePage = lazy(() => import('@/pages/HomePage'));
const SubcategoryPage = lazy(() => import('@/pages/SubcategoryPage'));
const FeedPage = lazy(() => import('@/pages/FeedPage'));
const FavoritesPage = lazy(() => import('@/pages/FavoritesPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const CategoryPage = lazy(() => import('@/pages/CategoryPage'));
const AdPage = lazy(() => import('@/pages/AdPage'));
const OrdersPage = lazy(() => import('@/pages/OrdersPage'));
const SeasonsPage = lazy(() => import('@/pages/SeasonsPage'));
const SeasonViewPage = lazy(() => import('@/pages/SeasonViewPage'));
const MyAdsPage = lazy(() => import('@/pages/MyAdsPage'));
const CreateAdPage = lazy(() => import('@/pages/CreateAdPage'));
const ConversationsPage = lazy(() => import('@/pages/ConversationsPage'));
const ChatPage = lazy(() => import('@/pages/ChatPage'));
const FarmerFeedPage = lazy(() => import('@/pages/FarmerFeedPage'));
const BulkFarmerUploadPage = lazy(() => import('@/pages/BulkFarmerUploadPage'));
const FarmerAnalyticsPage = lazy(() => import('@/pages/FarmerAnalyticsPage'));
const FarmerCabinetPage = lazy(() => import('@/pages/FarmerCabinetPage'));
const AllCategoriesPage = lazy(() => import('@/pages/AllCategoriesPage'));
const GeoMapPage = lazy(() => import('@/pages/GeoMapPage'));
const GeoFeedScreen = lazy(() => import('@/pages/GeoFeedScreen'));
const SellerStorePage = lazy(() => import('@/pages/SellerStorePage'));
const SellerDashboardPage = lazy(() => import('@/pages/SellerDashboardPage'));
const SellerAnalyticsPage = lazy(() => import('@/pages/SellerAnalyticsPage'));

export default function App() {
  const location = useLocation();
  const initialize = useUserStore((state) => state.initialize);
  const submitPhone = useUserStore((state) => state.submitPhone);
  const skipPhoneRequest = useUserStore((state) => state.skipPhoneRequest);
  const userStatus = useUserStore((state) => state.status);
  const user = useUserStore((state) => state.user);
  const [isInitialized, setIsInitialized] = useState(false);
  
  useRoutePrefetch();

  useEffect(() => {
    const initApp = () => {
      try {
        console.log('🚀 Initializing KETMAR Market MiniApp...');
        
        // Проверка Telegram WebApp SDK
        const tg = getTelegramWebApp();
        if (tg) {
          console.log('✅ Telegram WebApp SDK found');
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
        }

        // Инициализация пользователя в фоне
        initialize().catch(console.error);
        
        // Prefetch критичных данных в фоне
        prefetchCriticalData().catch(console.error);
        
        // Инициализация Web Vitals monitoring
        if (typeof window !== 'undefined') {
          initWebVitals();
        }
        
        // Показываем UI сразу
        setIsInitialized(true);
        console.log('✅ App initialization complete');
      } catch (error) {
        console.error('❌ App initialization error:', error);
        setIsInitialized(true);
      }
    };

    initApp();
  }, [initialize]);
  
  // Обработка deep link из бота
  function handleDeepLink(startParam: string) {
    // Формат: season_short_term_rental, category_realty_rent_daily, store_<slug> и т.д.
    if (startParam.startsWith('season_')) {
      const seasonCode = startParam.replace('season_', '');
      // Перенаправляем на FeedPage с фильтром по сезону
      window.location.href = `/feed?season=${encodeURIComponent(seasonCode)}`;
    } else if (startParam.startsWith('category_')) {
      const categoryId = startParam.replace('category_', '');
      // Перенаправляем на FeedPage с фильтром по категории
      window.location.href = `/feed?categoryId=${encodeURIComponent(categoryId)}`;
    } else if (startParam.startsWith('store_')) {
      const storeSlug = startParam.replace('store_', '');
      // Перенаправляем на страницу магазина продавца
      window.location.href = `/store/${encodeURIComponent(storeSlug)}`;
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

  // Показываем запрос номера телефона если нужен
  if (userStatus === 'need_phone') {
    return (
      <QueryClientProvider client={queryClient}>
        <PhoneAuthRequest 
          onPhoneReceived={submitPhone}
          onSkip={skipPhoneRequest}
        />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <PlatformProvider>
        <div className="app-shell">
          <main>
            <Suspense fallback={<PageLoader />}>
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
                <Route path="/farmer-feed" element={<FarmerFeedPage />} />
                <Route path="/farmer/bulk-upload" element={<BulkFarmerUploadPage />} />
                <Route path="/farmer/analytics" element={<FarmerAnalyticsPage />} />
                <Route path="/farmer/cabinet" element={<FarmerCabinetPage />} />
                <Route path="/all-categories" element={<AllCategoriesPage />} />
                <Route path="/map" element={<GeoMapPage />} />
                <Route path="/geo-feed" element={<GeoFeedScreen />} />
                <Route path="/store/:id" element={<SellerStorePage />} />
                <Route path="/seller/dashboard" element={<SellerDashboardPage />} />
                <Route path="/seller/analytics" element={<SellerAnalyticsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </main>

          <BottomTabs />
        </div>
      </PlatformProvider>
    </QueryClientProvider>
  );
}
