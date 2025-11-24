import { Navigate, Route, Routes } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { LoaderScreen } from './components/LoaderScreen';

const HomePage = lazy(() => import('./pages/HomePage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ProfileEditPage = lazy(() => import('./pages/ProfileEditPage'));
const FavoritesPage = lazy(() => import('./pages/FavoritesPage'));
const MyAdsPage = lazy(() => import('./pages/MyAdsPage'));
const CreateAdPage = lazy(() => import('./pages/CreateAdPage'));
const AdPage = lazy(() => import('./pages/AdPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

export default function App() {
  return (
    <div className="app-shell">
      <Header />
      <main>
        <Suspense fallback={<LoaderScreen message="Загрузка" />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile/edit"
              element={
                <ProtectedRoute>
                  <ProfileEditPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-ads"
              element={
                <ProtectedRoute>
                  <MyAdsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/create-ad"
              element={
                <ProtectedRoute>
                  <CreateAdPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/favorites"
              element={
                <ProtectedRoute>
                  <FavoritesPage />
                </ProtectedRoute>
              }
            />
            <Route path="/ad/:id" element={<AdPage />} />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      <BottomNav />
    </div>
  );
}
