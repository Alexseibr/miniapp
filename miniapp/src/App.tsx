import { useEffect, useRef } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import BottomTabs from '@/components/BottomTabs';
import Header from '@/components/Header';
import AdsPage from '@/pages/AdsPage';
import CategoriesPage from '@/pages/CategoriesPage';
import DashboardPage from '@/pages/DashboardPage';
import FeedPage from '@/pages/FeedPage';
import SeasonViewPage from '@/pages/SeasonViewPage';
import { getStartParams } from './telegramInit';

export default function App() {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const startHandledRef = useRef(false);

  useEffect(() => {
    if (startHandledRef.current) return;
    startHandledRef.current = true;

    const { startParam } = getStartParams();
    let target = '/market?scope=all';

    switch (startParam) {
      case 'niche_farm':
        target = '/market?niche=farm';
        break;
      case 'niche_crafts':
        target = '/market?niche=crafts';
        break;
      case 'season_march8_tulips':
        target = '/season/march8_tulips';
        break;
      case 'market_all':
      default:
        target = '/market?scope=all';
        break;
    }

    const currentLocation = `${pathname}${search}`;
    if (currentLocation === '/' || startParam) {
      navigate(target, { replace: true });
    }
  }, [navigate, pathname, search]);

  return (
    <div className="app-shell">
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/market?scope=all" replace />} />
          <Route path="/market" element={<FeedPage />} />
          <Route path="/season/:code" element={<SeasonViewPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/ads" element={<AdsPage />} />
          <Route path="*" element={<Navigate to="/market?scope=all" replace />} />
        </Routes>
      </main>
      <BottomTabs />
    </div>
  );
}
