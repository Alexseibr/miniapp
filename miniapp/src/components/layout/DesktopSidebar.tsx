import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, 
  Compass, 
  ShoppingBag, 
  Heart, 
  User, 
  MapPin,
  Store,
  TrendingUp,
  Settings,
  Plus,
  Layers,
  Bot,
  Sparkles,
  LogOut
} from 'lucide-react';
import { useUserStore } from '@/store/useUserStore';
import logoPath from '@/assets/ketmar_logo_rgb.svg';

interface NavItem {
  path: string;
  label: string;
  icon: typeof Home;
  requiresAuth?: boolean;
  badge?: string;
}

const mainNavItems: NavItem[] = [
  { path: '/', label: 'Главная', icon: Home },
  { path: '/feed', label: 'Лента объявлений', icon: Compass },
  { path: '/all-categories', label: 'Категории', icon: Layers },
  { path: '/map', label: 'Карта', icon: MapPin },
  { path: '/campaigns', label: 'Акции', icon: Sparkles },
];

const userNavItems: NavItem[] = [
  { path: '/favorites', label: 'Избранное', icon: Heart, requiresAuth: true },
  { path: '/my-ads', label: 'Мои объявления', icon: ShoppingBag, requiresAuth: true },
  { path: '/chats', label: 'Сообщения', icon: Bot, requiresAuth: true },
  { path: '/profile', label: 'Профиль', icon: User, requiresAuth: true },
];

const sellerNavItems: NavItem[] = [
  { path: '/seller/cabinet', label: 'Мой магазин', icon: Store, requiresAuth: true },
  { path: '/twin', label: 'AI-ассистент', icon: Bot, requiresAuth: true },
];

export default function DesktopSidebar() {
  const location = useLocation();
  const user = useUserStore((state) => state.user);
  const status = useUserStore((state) => state.status);
  const logout = useUserStore((state) => state.logout);
  const isAuthenticated = !!user && (status === 'ready' || status === 'guest');

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const renderNavItem = (item: NavItem) => {
    if (item.requiresAuth && !isAuthenticated) {
      return null;
    }

    const Icon = item.icon;
    const active = isActive(item.path);

    return (
      <NavLink
        key={item.path}
        to={item.path}
        data-testid={`sidebar-nav-${item.path.replace(/\//g, '-').slice(1) || 'home'}`}
        className={`desktop-sidebar-nav-item ${active ? 'active' : ''}`}
      >
        <Icon size={20} strokeWidth={active ? 2 : 1.5} />
        <span>{item.label}</span>
        {item.badge && (
          <span className="desktop-sidebar-badge">{item.badge}</span>
        )}
      </NavLink>
    );
  };

  return (
    <aside className="desktop-sidebar" data-testid="desktop-sidebar">
      <div className="desktop-sidebar-header">
        <NavLink to="/" className="desktop-sidebar-logo">
          <img src={logoPath} alt="Ketmar Market" />
          <span>KETMAR</span>
        </NavLink>
      </div>

      {isAuthenticated && (
        <NavLink 
          to="/create" 
          className="desktop-sidebar-create-btn"
          data-testid="sidebar-create-ad"
        >
          <Plus size={20} />
          <span>Создать объявление</span>
        </NavLink>
      )}

      <nav className="desktop-sidebar-nav">
        <div className="desktop-sidebar-section">
          <span className="desktop-sidebar-section-title">Навигация</span>
          {mainNavItems.map(renderNavItem)}
        </div>

        {isAuthenticated && (
          <>
            <div className="desktop-sidebar-section">
              <span className="desktop-sidebar-section-title">Мой кабинет</span>
              {userNavItems.map(renderNavItem)}
            </div>

            <div className="desktop-sidebar-section">
              <span className="desktop-sidebar-section-title">Для продавцов</span>
              {sellerNavItems.map(renderNavItem)}
            </div>
          </>
        )}
      </nav>

      <div className="desktop-sidebar-footer">
        {!isAuthenticated ? (
          <NavLink 
            to="/auth" 
            className="desktop-sidebar-auth-btn"
            data-testid="sidebar-login"
          >
            <User size={20} />
            <span>Войти</span>
          </NavLink>
        ) : (
          <div className="desktop-sidebar-user-container">
            <div className="desktop-sidebar-user">
              <div className="desktop-sidebar-user-avatar">
                {user?.firstName?.charAt(0) || user?.username?.charAt(0) || 'U'}
              </div>
              <div className="desktop-sidebar-user-info">
                <span className="desktop-sidebar-user-name">
                  {user?.firstName || user?.username || 'Пользователь'}
                </span>
                <span className="desktop-sidebar-user-role">
                  {user?.role === 'seller' ? 'Продавец' : 'Покупатель'}
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                logout();
                window.location.href = '/';
              }}
              className="desktop-sidebar-logout-btn"
              data-testid="sidebar-logout"
              title="Выйти"
            >
              <LogOut size={18} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
