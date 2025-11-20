import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import BottomTabs from '@/components/BottomTabs';
import AdsPage from '@/pages/AdsPage';
import CategoriesPage from '@/pages/CategoriesPage';
import DashboardPage from '@/pages/DashboardPage';
import SeasonMarch8TulipsPage from '@/pages/SeasonMarch8TulipsPage';
import CraftNearbyPage from '@/pages/CraftNearbyPage';
import LiveSpotsPage from '@/pages/LiveSpotsPage';

export default function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="container topbar__inner">
          <div>
            <p className="eyebrow">KETMAR Market MiniApp</p>
            <h1 className="topbar__title">Живой дашборд</h1>
            <p className="muted">Проверьте API, категории и объявления прямо из браузера.</p>
          </div>
          <div className="topbar__links">
            <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'link link--active' : 'link')}>
              /dashboard
            </NavLink>
            <NavLink to="/categories" className={({ isActive }) => (isActive ? 'link link--active' : 'link')}>
              /categories
            </NavLink>
            <NavLink to="/ads" className={({ isActive }) => (isActive ? 'link link--active' : 'link')}>
              /ads
            </NavLink>
          </div>
        </div>
      </header>

      <main>
        <div className="container">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/ads" element={<AdsPage />} />
            <Route path="/season/march8_tulips" element={<SeasonMarch8TulipsPage />} />
            <Route path="/craft/nearby" element={<CraftNearbyPage />} />
            <Route path="/live-spots/:seasonCode?" element={<LiveSpotsPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </main>

      <BottomTabs />
    </div>
  );
}
