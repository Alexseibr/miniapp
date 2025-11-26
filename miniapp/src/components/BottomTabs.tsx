import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Home, Heart, Plus, List, User } from 'lucide-react';
import { getTelegramWebApp } from '@/utils/telegram';

const leftTabs = [
  { path: '/', label: 'Главная', Icon: Home },
  { path: '/favorites', label: 'Избранное', Icon: Heart },
];

const rightTabs = [
  { path: '/my-ads', label: 'Мои', Icon: List },
  { path: '/profile', label: 'Профиль', Icon: User },
];

export default function BottomTabs() {
  const location = useLocation();
  const navigate = useNavigate();
  const isTelegramWebApp = !!getTelegramWebApp();

  if (!isTelegramWebApp) {
    return null;
  }

  const handleCreateClick = () => {
    navigate('/create');
  };

  const renderTab = (tab: { path: string; label: string; Icon: any }) => {
    const isActive = location.pathname === tab.path;
    
    return (
      <NavLink
        key={tab.path}
        to={tab.path}
        data-testid={`tab-${tab.label.toLowerCase()}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          padding: '8px 0',
          textDecoration: 'none',
          flex: 1,
          minWidth: 0,
        }}
      >
        <tab.Icon
          size={24}
          strokeWidth={isActive ? 2.5 : 2}
          style={{
            color: isActive ? '#3A7BFF' : '#9CA3AF',
            transition: 'all 0.2s ease',
          }}
        />
        <span
          style={{
            fontSize: 11,
            fontWeight: isActive ? 600 : 500,
            color: isActive ? '#3A7BFF' : '#9CA3AF',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
          }}
        >
          {tab.label}
        </span>
      </NavLink>
    );
  };

  return (
    <nav
      data-testid="bottom-tabs"
      style={{
        position: 'sticky',
        bottom: 0,
        background: '#FFFFFF',
        padding: '8px 16px calc(env(safe-area-inset-bottom) + 8px)',
        borderTop: '1px solid #E5E7EB',
        marginTop: 'auto',
        zIndex: 100,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          maxWidth: 500,
          margin: '0 auto',
        }}
      >
        {/* Left tabs */}
        {leftTabs.map(renderTab)}
        
        {/* Center Create Button */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 4,
            flex: 1,
            position: 'relative',
          }}
        >
          <button
            onClick={handleCreateClick}
            data-testid="tab-create"
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: '#3A7BFF',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(58, 123, 255, 0.4)',
              transition: 'all 0.2s ease',
              marginTop: -20,
            }}
          >
            <Plus size={28} strokeWidth={2.5} color="white" />
          </button>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: '#3A7BFF',
              marginTop: 2,
            }}
          >
            Создать
          </span>
        </div>

        {/* Right tabs */}
        {rightTabs.map(renderTab)}
      </div>
    </nav>
  );
}
