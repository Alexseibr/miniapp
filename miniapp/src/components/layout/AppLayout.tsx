import { useEffect, useState, type ReactNode } from 'react';
import BottomTabs from '@/components/BottomTabs';
import DesktopSidebar from './DesktopSidebar';
import { detectPlatform } from '@/platform/platformDetection';

interface AppLayoutProps {
  children: ReactNode;
}

const DESKTOP_BREAKPOINT = 768;

export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= DESKTOP_BREAKPOINT;
  });

  useEffect(() => {
    const checkWidth = () => {
      setIsDesktop(window.innerWidth >= DESKTOP_BREAKPOINT);
    };

    const mediaQuery = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`);
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', checkWidth);
    } else {
      window.addEventListener('resize', checkWidth);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', checkWidth);
      } else {
        window.removeEventListener('resize', checkWidth);
      }
    };
  }, []);

  return isDesktop;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const isDesktop = useIsDesktop();
  const platform = detectPlatform();
  
  const isTelegram = platform === 'telegram';
  const showDesktopLayout = isDesktop && !isTelegram;

  if (showDesktopLayout) {
    return (
      <div className="desktop-layout" data-testid="layout-desktop">
        <DesktopSidebar />
        <div className="desktop-main">
          <main className="desktop-content">
            {children}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-layout" data-testid="layout-mobile">
      <main className="mobile-content">
        {children}
      </main>
      <BottomTabs />
    </div>
  );
}
