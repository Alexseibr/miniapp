import { useEffect } from 'react';

const prefetchedRoutes = new Set<string>();

export function useRoutePrefetch() {
  useEffect(() => {
    const handleMouseEnter = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a[href^="/"]');
      
      if (!link) return;
      
      const href = link.getAttribute('href');
      if (!href || prefetchedRoutes.has(href)) return;
      
      const routeChunkMap: Record<string, () => Promise<any>> = {
        '/feed': () => import('@/pages/FeedPage'),
        '/favorites': () => import('@/pages/FavoritesPage'),
        '/profile': () => import('@/pages/ProfilePage'),
        '/my-ads': () => import('@/pages/MyAdsPage'),
        '/chats': () => import('@/pages/ConversationsPage'),
      };
      
      const matchedRoute = Object.keys(routeChunkMap).find(route => 
        href.startsWith(route)
      );
      
      if (matchedRoute && routeChunkMap[matchedRoute]) {
        prefetchedRoutes.add(href);
        routeChunkMap[matchedRoute]().catch(() => {
          prefetchedRoutes.delete(href);
        });
      }
    };
    
    document.addEventListener('mouseenter', handleMouseEnter, { capture: true });
    
    return () => {
      document.removeEventListener('mouseenter', handleMouseEnter, { capture: true });
    };
  }, []);
}
