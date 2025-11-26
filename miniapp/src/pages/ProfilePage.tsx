import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  MapPin, 
  Settings, 
  ShoppingBag, 
  Store, 
  Tractor, 
  Heart, 
  MessageCircle,
  ChevronRight,
  Shield,
  Crown,
  Star
} from 'lucide-react';
import AuthScreen from '@/components/AuthScreen';
import { useUserStore } from '@/store/useUserStore';
import { useGeo } from '@/utils/geo';
import { getTelegramWebApp } from '@/utils/telegram';

export default function ProfilePage() {
  const navigate = useNavigate();
  const user = useUserStore((state) => state.user);
  const { requestLocation, status } = useGeo();
  const [showContacts, setShowContacts] = useState(false);

  const telegramSummary = useMemo(() => {
    if (!user) return null;
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Пользователь';
  }, [user]);

  const getRoleInfo = (role?: string) => {
    const roles: Record<string, { label: string; icon: typeof Crown; color: string; bg: string }> = {
      'super_admin': { 
        label: 'Супер-администратор', 
        icon: Crown, 
        color: '#A78BFA',
        bg: 'rgba(124, 58, 237, 0.2)'
      },
      'admin': { 
        label: 'Администратор', 
        icon: Shield, 
        color: '#3B82F6',
        bg: 'rgba(59, 130, 246, 0.2)'
      },
      'moderator': { 
        label: 'Модератор', 
        icon: Shield, 
        color: '#10B981',
        bg: 'rgba(16, 185, 129, 0.2)'
      },
      'seller': { 
        label: 'Продавец', 
        icon: Store, 
        color: '#F59E0B',
        bg: 'rgba(245, 158, 11, 0.2)'
      },
      'user': { 
        label: 'Пользователь', 
        icon: User, 
        color: '#64748B',
        bg: 'rgba(100, 116, 139, 0.2)'
      },
    };
    return roles[role || 'user'] || roles['user'];
  };

  const handleOpenBot = () => {
    const botUsername = import.meta.env.VITE_BOT_USERNAME || '';
    const tg = getTelegramWebApp();
    if (!botUsername) {
      console.warn('BOT username is not configured');
      return;
    }
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(`https://t.me/${botUsername}`);
      return;
    }
    window.open(`https://t.me/${botUsername}`.replace(/\/?$/, ''), '_blank');
  };

  if (!user) {
    return <AuthScreen />;
  }

  const roleInfo = getRoleInfo(user.role);
  const RoleIcon = roleInfo.icon;

  const menuItems = [
    { icon: ShoppingBag, label: 'Мои объявления', path: '/my-ads', color: '#3B82F6' },
    { icon: Heart, label: 'Избранное', path: '/favorites', color: '#EC4899' },
    { icon: MessageCircle, label: 'Сообщения', path: '/chats', color: '#10B981' },
    { icon: Store, label: 'Мой магазин', path: '/seller/dashboard', color: '#7C3AED' },
    { icon: Tractor, label: 'Фермерский кабинет', path: '/farmer/cabinet', color: '#F59E0B' },
    { icon: Star, label: 'AI Ассистент', path: '/twin', color: '#06B6D4' },
  ];

  return (
    <div style={{ 
      minHeight: '100vh',
      background: '#000000',
      padding: '0 0 100px',
    }}>
      {/* Background */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: `
          radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.08), transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(124, 58, 237, 0.06), transparent 50%)
        `,
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Profile Header */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        padding: '32px 20px 24px',
        background: 'rgba(10, 15, 26, 0.8)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(59, 130, 246, 0.15)',
      }}>
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.5), transparent)',
        }} />

        {/* Avatar */}
        <div style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #3B82F6, #7C3AED)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          boxShadow: '0 0 30px rgba(59, 130, 246, 0.4)',
          border: '2px solid rgba(59, 130, 246, 0.5)',
        }}>
          <User size={36} color="#fff" />
        </div>

        {/* Name & Username */}
        <h1 style={{
          fontSize: 22,
          fontWeight: 700,
          color: '#F8FAFC',
          margin: '0 0 4px',
          textAlign: 'center',
          textShadow: '0 0 20px rgba(59, 130, 246, 0.3)',
        }}>
          {telegramSummary}
        </h1>
        
        {user.username && (
          <p style={{
            fontSize: 14,
            color: '#3B82F6',
            margin: '0 0 12px',
            textAlign: 'center',
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            @{user.username}
          </p>
        )}

        {/* Role Badge */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            background: roleInfo.bg,
            border: `1px solid ${roleInfo.color}40`,
            borderRadius: 20,
          }}>
            <RoleIcon size={16} color={roleInfo.color} />
            <span style={{
              fontSize: 13,
              fontWeight: 600,
              color: roleInfo.color,
            }}>
              {roleInfo.label}
            </span>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div style={{ padding: '20px 16px', position: 'relative', zIndex: 1 }}>
        <div style={{
          background: 'rgba(10, 15, 26, 0.6)',
          border: '1px solid rgba(59, 130, 246, 0.15)',
          borderRadius: 16,
          overflow: 'hidden',
          backdropFilter: 'blur(10px)',
        }}>
          {menuItems.map((item, index) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '16px 20px',
                background: 'transparent',
                border: 'none',
                borderBottom: index < menuItems.length - 1 
                  ? '1px solid rgba(59, 130, 246, 0.1)' 
                  : 'none',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              data-testid={`menu-item-${item.label.toLowerCase().replace(/\s/g, '-')}`}
            >
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: `${item.color}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <item.icon size={20} color={item.color} />
              </div>
              <span style={{
                flex: 1,
                fontSize: 15,
                fontWeight: 500,
                color: '#F8FAFC',
                textAlign: 'left',
              }}>
                {item.label}
              </span>
              <ChevronRight size={18} color="#64748B" />
            </button>
          ))}
        </div>

        {/* Location Card */}
        <div style={{
          marginTop: 20,
          background: 'rgba(10, 15, 26, 0.6)',
          border: '1px solid rgba(59, 130, 246, 0.15)',
          borderRadius: 16,
          padding: 20,
          backdropFilter: 'blur(10px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'rgba(6, 182, 212, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <MapPin size={20} color="#06B6D4" />
            </div>
            <div>
              <h3 style={{ 
                margin: 0, 
                fontSize: 15, 
                fontWeight: 600, 
                color: '#F8FAFC' 
              }}>
                Геопозиция
              </h3>
              <p style={{ 
                margin: '2px 0 0', 
                fontSize: 13, 
                color: '#64748B' 
              }}>
                {status === 'ready' ? 'Обновлена' : 'Не установлена'}
              </p>
            </div>
          </div>
          
          <button
            onClick={requestLocation}
            disabled={status === 'loading'}
            style={{
              width: '100%',
              padding: '12px 20px',
              background: 'rgba(6, 182, 212, 0.1)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 600,
              color: '#06B6D4',
              cursor: status === 'loading' ? 'not-allowed' : 'pointer',
              opacity: status === 'loading' ? 0.5 : 1,
            }}
            data-testid="button-update-location"
          >
            {status === 'loading' ? 'Определяем...' : 'Обновить геопозицию'}
          </button>
        </div>

        {/* Contacts Card */}
        <div style={{
          marginTop: 20,
          background: 'rgba(10, 15, 26, 0.6)',
          border: '1px solid rgba(59, 130, 246, 0.15)',
          borderRadius: 16,
          padding: 20,
          backdropFilter: 'blur(10px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'rgba(124, 58, 237, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Settings size={20} color="#7C3AED" />
            </div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#F8FAFC' }}>
              Контакты
            </h3>
          </div>

          {showContacts && (
            <div style={{ marginBottom: 16 }}>
              <div style={{
                padding: 12,
                background: 'rgba(59, 130, 246, 0.1)',
                borderRadius: 10,
                marginBottom: 8,
              }}>
                <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>Telegram ID</p>
                <p style={{ 
                  margin: '4px 0 0', 
                  fontSize: 14, 
                  color: '#3B82F6',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {user.telegramId}
                </p>
              </div>
              {user.phone && (
                <div style={{
                  padding: 12,
                  background: 'rgba(16, 185, 129, 0.1)',
                  borderRadius: 10,
                  marginBottom: 8,
                }}>
                  <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>Телефон</p>
                  <p style={{ 
                    margin: '4px 0 0', 
                    fontSize: 14, 
                    color: '#10B981',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    {user.phone}
                  </p>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setShowContacts(!showContacts)}
              style={{
                flex: 1,
                padding: '12px 16px',
                background: 'rgba(124, 58, 237, 0.1)',
                border: '1px solid rgba(124, 58, 237, 0.3)',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 600,
                color: '#A78BFA',
                cursor: 'pointer',
              }}
              data-testid="button-toggle-contacts"
            >
              {showContacts ? 'Скрыть' : 'Показать'}
            </button>
            <button
              onClick={handleOpenBot}
              style={{
                flex: 1,
                padding: '12px 16px',
                background: 'linear-gradient(135deg, #3B82F6, #7C3AED)',
                border: 'none',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 600,
                color: '#fff',
                cursor: 'pointer',
                boxShadow: '0 0 15px rgba(59, 130, 246, 0.3)',
              }}
              data-testid="button-open-bot"
            >
              Открыть бота
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
