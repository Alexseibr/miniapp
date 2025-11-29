import { useEffect, useState, useRef, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Compass, ShoppingBag, Heart, User } from 'lucide-react';
import { getTelegramWebApp } from '@/utils/telegram';

const tabs = [
  { path: '/', label: 'Главная', Icon: Home },
  { path: '/feed', label: 'Лента', Icon: Compass },
  { path: '/my-ads', label: 'Мои', Icon: ShoppingBag },
  { path: '/favorites', label: 'Избранное', Icon: Heart },
  { path: '/profile', label: 'Профиль', Icon: User },
];

export default function BottomTabs() {
  const location = useLocation();
  const isTelegramWebApp = !!getTelegramWebApp();
  const navRef = useRef<HTMLElement>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const stableHeightRef = useRef<number>(window.innerHeight);
  const lastFocusedInputRef = useRef<Element | null>(null);

  const isValidInputFocused = useCallback(() => {
    const activeElement = document.activeElement;
    
    if (!activeElement || !activeElement.isConnected) {
      return false;
    }
    
    const isInput = (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      (activeElement as HTMLElement).isContentEditable === true
    );
    
    if (isInput) {
      const inputType = (activeElement as HTMLInputElement).type?.toLowerCase();
      const nonKeyboardTypes = ['button', 'submit', 'reset', 'checkbox', 'radio', 'file', 'image', 'color', 'range'];
      if (inputType && nonKeyboardTypes.includes(inputType)) {
        return false;
      }
      lastFocusedInputRef.current = activeElement;
      return true;
    }
    
    return false;
  }, []);

  useEffect(() => {
    const tg = getTelegramWebApp();
    
    const updateStableHeight = (newHeight: number) => {
      if (!newHeight || newHeight < 100) return;
      const currentStable = stableHeightRef.current;
      const diff = Math.abs(newHeight - currentStable);
      if (diff > 50) {
        stableHeightRef.current = newHeight;
      }
    };
    
    if (isTelegramWebApp && tg?.viewportStableHeight) {
      stableHeightRef.current = tg.viewportStableHeight;
    } else {
      stableHeightRef.current = window.innerHeight;
    }
    
    const checkKeyboard = () => {
      const focused = isValidInputFocused();
      
      if (!focused) {
        setIsKeyboardVisible(false);
        return;
      }
      
      let currentHeight: number;
      if (isTelegramWebApp && tg?.viewportHeight) {
        currentHeight = tg.viewportHeight;
      } else if (window.visualViewport) {
        currentHeight = window.visualViewport.height;
      } else {
        currentHeight = window.innerHeight;
      }
      
      const stableHeight = stableHeightRef.current;
      const heightDiff = stableHeight - currentHeight;
      
      const keyboardThreshold = Math.min(150, stableHeight * 0.2);
      setIsKeyboardVisible(heightDiff > keyboardThreshold);
    };
    
    const handleViewportChange = (event?: { isStateStable?: boolean; viewportStableHeight?: number }) => {
      if (event?.isStateStable) {
        const newStable = event.viewportStableHeight || tg?.viewportStableHeight || tg?.viewportHeight;
        if (newStable) {
          updateStableHeight(newStable);
        }
      }
      checkKeyboard();
    };
    
    const handleFocus = () => {
      setTimeout(checkKeyboard, 150);
    };
    
    const handleBlur = () => {
      setTimeout(() => {
        if (!isValidInputFocused()) {
          setIsKeyboardVisible(false);
        }
      }, 100);
    };
    
    const handleVisualViewportResize = () => {
      if (!isTelegramWebApp) {
        const vh = window.visualViewport?.height || window.innerHeight;
        const wh = window.innerHeight;
        
        if (vh >= wh * 0.95) {
          stableHeightRef.current = wh;
        }
        
        const focused = isValidInputFocused();
        const diff = stableHeightRef.current - vh;
        setIsKeyboardVisible(focused && diff > 150);
      }
    };
    
    if (isTelegramWebApp && tg?.onEvent) {
      tg.onEvent('viewportChanged', handleViewportChange);
    }
    
    document.addEventListener('focusin', handleFocus, true);
    document.addEventListener('focusout', handleBlur, true);
    
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewportResize);
    }
    
    return () => {
      if (isTelegramWebApp && tg?.offEvent) {
        tg.offEvent('viewportChanged', handleViewportChange);
      }
      document.removeEventListener('focusin', handleFocus, true);
      document.removeEventListener('focusout', handleBlur, true);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVisualViewportResize);
      }
    };
  }, [isTelegramWebApp, isValidInputFocused]);

  if (!isTelegramWebApp) {
    return null;
  }

  return (
    <nav
      ref={navRef}
      data-testid="bottom-tabs"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        background: '#FFFFFF',
        padding: '8px 0 calc(env(safe-area-inset-bottom) + 8px)',
        borderTop: '1px solid #E5E7EB',
        zIndex: 100,
        transform: 'translateZ(0)',
        visibility: isKeyboardVisible ? 'hidden' : 'visible',
        pointerEvents: isKeyboardVisible ? 'none' : 'auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          maxWidth: 500,
          margin: '0 auto',
        }}
      >
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path || 
            (tab.path === '/' && location.pathname === '/home');
          
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              data-testid={`tab-${tab.path === '/' ? 'home' : tab.path.slice(1)}`}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                padding: '8px 4px',
                textDecoration: 'none',
                position: 'relative',
              }}
            >
              {isActive && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: -8,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 24,
                    height: 2,
                    background: '#3A7BFF',
                    borderRadius: 1,
                  }}
                />
              )}
              <tab.Icon
                size={24}
                fill={isActive ? '#3A7BFF' : 'none'}
                strokeWidth={isActive ? 2 : 1.5}
                style={{
                  color: isActive ? '#3A7BFF' : '#9CA3AF',
                  transition: 'all 0.2s ease',
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#3A7BFF' : '#9CA3AF',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                  textAlign: 'center',
                }}
              >
                {tab.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
