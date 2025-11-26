import { NavLink, useLocation } from 'react-router-dom';
import { Home, MapPin, ShoppingBag, Heart, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { getTelegramWebApp } from '@/utils/telegram';

const tabs = [
  { path: '/', label: 'Главная', Icon: Home },
  { path: '/geo-feed', label: 'Карта', Icon: MapPin },
  { path: '/my-ads', label: 'Мои', Icon: ShoppingBag },
  { path: '/favorites', label: 'Избранное', Icon: Heart },
  { path: '/profile', label: 'Профиль', Icon: User },
];

export default function BottomTabs() {
  const location = useLocation();
  const isTelegramWebApp = !!getTelegramWebApp();

  if (!isTelegramWebApp) {
    return null;
  }

  return (
    <nav
      data-testid="bottom-tabs"
      style={{
        position: 'sticky',
        bottom: 0,
        background: 'rgba(10, 15, 26, 0.95)',
        backdropFilter: 'blur(30px) saturate(180%)',
        WebkitBackdropFilter: 'blur(30px) saturate(180%)',
        padding: '8px 12px calc(env(safe-area-inset-bottom) + 8px)',
        borderTop: '1px solid rgba(59, 130, 246, 0.15)',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.4), 0 0 30px rgba(59, 130, 246, 0.05)',
        marginTop: 'auto',
        zIndex: 100,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.5), transparent)',
          opacity: 0.6,
        }}
      />
      
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          gap: 4,
        }}
      >
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              data-testid={`tab-${tab.label.toLowerCase()}`}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                padding: '8px 16px',
                textDecoration: 'none',
                borderRadius: 14,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                flex: 1,
                minWidth: 0,
              }}
            >
              <motion.div
                initial={false}
                animate={{
                  scale: isActive ? 1 : 1,
                  y: isActive ? -2 : 0,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 25,
                }}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    style={{
                      position: 'absolute',
                      inset: -8,
                      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(124, 58, 237, 0.15))',
                      borderRadius: 12,
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      zIndex: -1,
                    }}
                    transition={{
                      type: 'spring',
                      stiffness: 400,
                      damping: 30,
                    }}
                  />
                )}
                
                <tab.Icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 2}
                  style={{
                    color: isActive ? '#3B82F6' : '#64748B',
                    transition: 'all 0.3s ease',
                    filter: isActive 
                      ? 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.6))' 
                      : 'none',
                  }}
                />
              </motion.div>

              <motion.span
                initial={false}
                animate={{
                  opacity: isActive ? 1 : 0.7,
                  scale: isActive ? 1 : 0.95,
                }}
                transition={{
                  duration: 0.2,
                }}
                style={{
                  fontSize: '0.7rem',
                  fontWeight: isActive ? 700 : 600,
                  color: isActive ? '#3B82F6' : '#64748B',
                  transition: 'all 0.3s ease',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                  textShadow: isActive 
                    ? '0 0 10px rgba(59, 130, 246, 0.5)' 
                    : 'none',
                }}
              >
                {tab.label}
              </motion.span>

              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    width: 24,
                    height: 3,
                    background: 'linear-gradient(90deg, #3B82F6, #7C3AED)',
                    borderRadius: '999px 999px 0 0',
                    boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)',
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 30,
                  }}
                />
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
