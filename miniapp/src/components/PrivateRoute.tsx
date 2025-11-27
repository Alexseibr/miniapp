import { Navigate, useLocation } from 'react-router-dom';
import { useUserStore } from '@/store/useUserStore';
import { detectPlatform } from '@/platform/platformDetection';
import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

const AUTH_TOKEN_KEY = 'ketmar_auth_token';

interface PrivateRouteProps {
  children: ReactNode;
}

export default function PrivateRoute({ children }: PrivateRouteProps) {
  const location = useLocation();
  const { user, status } = useUserStore();
  const platform = detectPlatform();
  
  const hasToken = typeof window !== 'undefined' && !!localStorage.getItem(AUTH_TOKEN_KEY);
  
  const isAuthenticatedTelegram = platform === 'telegram' && !!user && (status === 'ready' || status === 'guest');
  const isAuthenticatedWeb = platform !== 'telegram' && !!user && status === 'ready' && hasToken;
  const isAuthenticated = isAuthenticatedTelegram || isAuthenticatedWeb;
  
  const isLoading = status === 'loading' || status === 'idle';

  if (isLoading) {
    return (
      <div 
        className="private-route-loading"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '50vh',
          padding: '20px'
        }}
      >
        <Loader2 className="animate-spin" size={32} style={{ color: '#3A7BFF' }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (platform === 'telegram') {
      return <Navigate to="/" state={{ from: location }} replace />;
    }
    
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

export function useRequireAuth() {
  const { user, status } = useUserStore();
  const platform = detectPlatform();
  
  const hasToken = typeof window !== 'undefined' && !!localStorage.getItem(AUTH_TOKEN_KEY);
  
  const isAuthenticatedTelegram = platform === 'telegram' && !!user && (status === 'ready' || status === 'guest');
  const isAuthenticatedWeb = platform !== 'telegram' && !!user && status === 'ready' && hasToken;
  const isAuthenticated = isAuthenticatedTelegram || isAuthenticatedWeb;
  
  const isLoading = status === 'loading' || status === 'idle';
  const needsAuth = !isAuthenticated && !isLoading;

  return {
    isAuthenticated,
    isLoading,
    needsAuth,
    user,
    redirectPath: platform === 'telegram' ? '/' : '/auth'
  };
}
