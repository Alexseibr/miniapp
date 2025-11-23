import { NavLink, useLocation } from 'react-router-dom';
import { Home, Compass, Heart, User } from 'lucide-react';
import { motion } from 'framer-motion';

const tabs = [
  { path: '/', label: 'Главная', Icon: Home },
  { path: '/feed', label: 'Лента', Icon: Compass },
  { path: '/favorites', label: 'Избранное', Icon: Heart },
  { path: '/profile', label: 'Профиль', Icon: User },
];

export default function BottomTabs() {
  const location = useLocation();

  return (
    <nav
      data-testid="bottom-tabs"
      style={{
        position: 'sticky',
        bottom: 0,
        background: 'linear-gradient(to top, rgba(255,255,255,0.98), rgba(255,255,255,0.95))',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        padding: '8px 12px calc(env(safe-area-inset-bottom) + 8px)',
        boxShadow: '0 -2px 20px rgba(15, 23, 42, 0.08), 0 -1px 0 rgba(15, 23, 42, 0.05)',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        marginTop: 'auto',
        zIndex: 20,
      }}
    >
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
                      background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.12), rgba(124, 58, 237, 0.12))',
                      borderRadius: 12,
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
                    color: isActive
                      ? '#2563eb'
                      : '#64748b',
                    transition: 'all 0.3s ease',
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
                  color: isActive ? '#2563eb' : '#64748b',
                  transition: 'all 0.3s ease',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
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
                    background: 'linear-gradient(90deg, #2563eb, #7c3aed)',
                    borderRadius: '999px 999px 0 0',
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
