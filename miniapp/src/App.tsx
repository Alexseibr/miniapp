import { Route, Routes, useLocation, Navigate } from 'react-router-dom';
import { useEffect, useState, lazy, Suspense } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import PrivateRoute from '@/components/PrivateRoute';
import PhoneAuthRequest from '@/components/PhoneAuthRequest';
import PageLoader from '@/components/PageLoader';
import { useUserStore } from '@/store/useUserStore';
import useGeoStore from '@/store/useGeoStore';
import { getTelegramWebApp } from '@/utils/telegram';
import { queryClient } from '@/lib/queryClient';
import { prefetchCriticalData } from '@/utils/prefetch';
import { useRoutePrefetch } from '@/hooks/useRoutePrefetch';
import { initWebVitals } from '@/utils/webVitals';
import { Loader2 } from 'lucide-react';
import { PlatformProvider } from '@/platform/PlatformProvider';
import { detectPlatform } from '@/platform/platformDetection';

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
const TwinPage = lazy(() => import('@/pages/TwinPage'));
const TwinChatPage = lazy(() => import('@/pages/TwinChatPage'));
const DynamicPricingPage = lazy(() => import('@/pages/DynamicPricingPage'));
const SellerTwinPage = lazy(() => import('@/pages/SellerTwinPage'));
const ForYouFeedPage = lazy(() => import('@/pages/ForYouFeedPage'));
const SearchPage = lazy(() => import('@/pages/SearchPage'));
const SearchResultsPage = lazy(() => import('@/pages/SearchResultsPage'));
const CategoryResultsPage = lazy(() => import('@/pages/CategoryResultsPage'));
const StoreCabinetPage = lazy(() => import('@/pages/StoreCabinetPage'));
const StoreProAnalyticsPage = lazy(() => import('@/pages/StoreProAnalyticsPage'));
const CampaignsListPage = lazy(() => import('@/pages/CampaignsListPage'));
const CampaignPage = lazy(() => import('@/pages/CampaignPage'));
const CampaignAnalyticsPage = lazy(() => import('@/pages/CampaignAnalyticsPage'));
const NeonDemoPage = lazy(() => import('@/pages/NeonDemoPage'));
const AuthScreen = lazy(() => import('@/components/AuthScreen'));
const ShopEntryScreen = lazy(() => import('@/screens/ShopEntryScreen'));

export default function App() {
  const location = useLocation();
  const initialize = useUserStore((state) => state.initialize);
  const submitPhone = useUserStore((state) => state.submitPhone);
  const skipPhoneRequest = useUserStore((state) => state.skipPhoneRequest);
  const userStatus = useUserStore((state) => state.status);
  const user = useUserStore((state) => state.user);
  const refreshLocationOnAppStart = useGeoStore((state) => state.refreshLocationOnAppStart);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const platform = detectPlatform();
  
  useRoutePrefetch();

  useEffect(() => {
    const initApp = async () => {
      try {
        console.log('🚀 Initializing KETMAR Market MiniApp...');
        console.log(`📱 Platform detected: ${platform}`);
        
        if (platform === 'telegram') {
          const tg = getTelegramWebApp();
          if (tg) {
            console.log('✅ Telegram WebApp SDK found');
            tg.ready();
            tg.expand();
            
            if ('enableClosingConfirmation' in tg) {
              (tg as any).enableClosingConfirmation();
            }
            
            const startParam = (tg as any).initDataUnsafe?.start_param;
            if (startParam) {
              console.log('📱 Deep link detected:', startParam);
              handleDeepLink(startParam);
            }
          }
        }

        initialize().catch(console.error);
        
        prefetchCriticalData().catch(console.error);
        
        const geoStoreKey = 'ketmar-geo-store';
        const geoResetKey = 'ketmar-geo-reset-v3';
        try {
          if (!localStorage.getItem(geoResetKey)) {
            console.log('🗑️ Очищаем весь кэш геолокации...');
            localStorage.removeItem(geoStoreKey);
            localStorage.setItem(geoResetKey, 'done');
          }
        } catch (e) {
          console.warn('Ошибка очистки localStorage:', e);
        }
        
        console.log('📍 Запрашиваем актуальную геолокацию...');
        refreshLocationOnAppStart().catch((err) => {
          console.warn('📍 Не удалось получить геолокацию:', err);
        });
        
        if (typeof window !== 'undefined') {
          initWebVitals();
        }
        
        setIsInitialized(true);
        console.log('✅ App initialization complete');
      } catch (error) {
        console.error('❌ App initialization error:', error);
        setIsInitialized(true);
      }
    };

    initApp();
  }, [initialize, refreshLocationOnAppStart, platform]);
  
  function handleDeepLink(startParam: string) {
    if (startParam.startsWith('season_')) {
      const seasonCode = startParam.replace('season_', '');
      window.location.href = `/feed?season=${encodeURIComponent(seasonCode)}`;
    } else if (startParam.startsWith('category_')) {
      const categoryId = startParam.replace('category_', '');
      window.location.href = `/feed?categoryId=${encodeURIComponent(categoryId)}`;
    } else if (startParam.startsWith('store_')) {
      const storeSlug = startParam.replace('store_', '');
      window.location.href = `/store/${encodeURIComponent(storeSlug)}`;
    } else if (startParam === 'twin') {
      window.location.href = `/twin`;
    } else if (startParam.startsWith('pricing_')) {
      const adId = startParam.replace('pricing_', '');
      window.location.href = `/dynamic-pricing/${encodeURIComponent(adId)}`;
    } else if (startParam.startsWith('ad_')) {
      const adId = startParam.replace('ad_', '');
      window.location.href = `/ads/${encodeURIComponent(adId)}`;
    } else if (startParam === 'favorites') {
      window.location.href = `/favorites`;
    } else if (startParam === 'seller-twin') {
      window.location.href = `/seller-twin`;
    } else if (startParam === 'dynamic-price') {
      window.location.href = `/dynamic-pricing`;
    } else if (startParam === 'farmer_demand') {
      window.location.href = `/farmer/demand`;
    } else if (startParam.startsWith('create_farmer_')) {
      const productKey = startParam.replace('create_farmer_', '');
      window.location.href = `/create?category=farmer-market&product=${encodeURIComponent(productKey)}`;
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

  if (platform === 'telegram' && userStatus === 'need_phone') {
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
        <AppLayout>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/auth" element={<AuthScreen />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/search/results" element={<SearchResultsPage />} />
              <Route path="/category/:slug" element={<CategoryResultsPage />} />
              <Route path="/subcategory/:slug" element={<SubcategoryPage />} />
              <Route path="/feed" element={<FeedPage />} />
              <Route path="/seasons" element={<SeasonsPage />} />
              <Route path="/seasons/:code" element={<SeasonViewPage />} />
              <Route path="/categories/:slug" element={<CategoryPage />} />
              <Route path="/ads/:id" element={<AdPage />} />
              <Route path="/all-categories" element={<AllCategoriesPage />} />
              <Route path="/map" element={<GeoMapPage />} />
              <Route path="/geo-feed" element={<GeoFeedScreen />} />
              <Route path="/store/:id" element={<SellerStorePage />} />
              <Route path="/farmer-feed" element={<FarmerFeedPage />} />
              <Route path="/campaigns" element={<CampaignsListPage />} />
              <Route path="/campaigns/:campaignCode" element={<CampaignPage />} />
              <Route path="/for-you" element={<ForYouFeedPage />} />
              <Route path="/neon-demo" element={<NeonDemoPage />} />

              {/* Private routes - require authentication */}
              <Route path="/create" element={
                <PrivateRoute>
                  <CreateAdPage />
                </PrivateRoute>
              } />
              <Route path="/favorites" element={
                <PrivateRoute>
                  <FavoritesPage />
                </PrivateRoute>
              } />
              <Route path="/profile" element={
                <PrivateRoute>
                  <ProfilePage />
                </PrivateRoute>
              } />
              <Route path="/shop-entry" element={
                <PrivateRoute>
                  <ShopEntryScreen />
                </PrivateRoute>
              } />
              <Route path="/orders" element={
                <PrivateRoute>
                  <OrdersPage />
                </PrivateRoute>
              } />
              <Route path="/my-ads" element={
                <PrivateRoute>
                  <MyAdsPage />
                </PrivateRoute>
              } />
              <Route path="/ads/create" element={
                <PrivateRoute>
                  <CreateAdPage />
                </PrivateRoute>
              } />
              <Route path="/chats" element={
                <PrivateRoute>
                  <ConversationsPage />
                </PrivateRoute>
              } />
              <Route path="/chat/:conversationId" element={
                <PrivateRoute>
                  <ChatPage />
                </PrivateRoute>
              } />
              <Route path="/farmer/bulk-upload" element={
                <PrivateRoute>
                  <BulkFarmerUploadPage />
                </PrivateRoute>
              } />
              <Route path="/farmer/analytics" element={
                <PrivateRoute>
                  <FarmerAnalyticsPage />
                </PrivateRoute>
              } />
              <Route path="/farmer/cabinet" element={
                <PrivateRoute>
                  <FarmerCabinetPage />
                </PrivateRoute>
              } />
              <Route path="/seller/dashboard" element={
                <PrivateRoute>
                  <SellerDashboardPage />
                </PrivateRoute>
              } />
              <Route path="/seller/cabinet" element={
                <PrivateRoute>
                  <StoreCabinetPage />
                </PrivateRoute>
              } />
              <Route path="/seller/cabinet/pro-analytics" element={
                <PrivateRoute>
                  <StoreProAnalyticsPage />
                </PrivateRoute>
              } />
              <Route path="/seller/analytics" element={
                <PrivateRoute>
                  <SellerAnalyticsPage />
                </PrivateRoute>
              } />
              <Route path="/twin" element={
                <PrivateRoute>
                  <TwinPage />
                </PrivateRoute>
              } />
              <Route path="/twin/chat" element={
                <PrivateRoute>
                  <TwinChatPage />
                </PrivateRoute>
              } />
              <Route path="/dynamic-pricing" element={
                <PrivateRoute>
                  <DynamicPricingPage />
                </PrivateRoute>
              } />
              <Route path="/dynamic-pricing/:adId" element={
                <PrivateRoute>
                  <DynamicPricingPage />
                </PrivateRoute>
              } />
              <Route path="/seller-twin" element={
                <PrivateRoute>
                  <SellerTwinPage />
                </PrivateRoute>
              } />
              <Route path="/campaigns/:campaignCode/analytics" element={
                <PrivateRoute>
                  <CampaignAnalyticsPage />
                </PrivateRoute>
              } />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AppLayout>
      </PlatformProvider>
    </QueryClientProvider>
  );
}
