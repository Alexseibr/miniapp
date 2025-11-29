import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  User, 
  MapPin, 
  ShoppingBag, 
  Store, 
  Tractor, 
  Heart, 
  MessageCircle,
  ChevronRight,
  Shield,
  Crown,
  Star,
  RefreshCw,
  Users,
  CheckCircle,
  BarChart3,
  FileText,
  Loader2,
  Camera
} from 'lucide-react';
import AuthScreen from '@/components/AuthScreen';
import ScreenLayout from '@/components/layout/ScreenLayout';
import { useUserStore } from '@/store/useUserStore';
import { useGeo } from '@/utils/geo';
import { usePlatform } from '@/platform/PlatformProvider';

interface AdminCounts {
  pendingSellers: number;
  pendingFarmers: number;
  pendingShopRequests: number;
  pendingAds: number;
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const user = useUserStore((state) => state.user);
  const { requestLocation, status } = useGeo();
  const { getAuthToken } = usePlatform();

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'moderator';

  const { data: adminCounts, isLoading: isLoadingCounts } = useQuery({
    queryKey: ['/api/admin/counts'],
    queryFn: async () => {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');
      
      const res = await fetch('/api/admin/counts', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load counts');
      const data = await res.json();
      return data.counts as AdminCounts;
    },
    enabled: isAdmin,
    staleTime: 60000,
  });

  const telegramSummary = useMemo(() => {
    if (!user) return null;
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Пользователь';
  }, [user]);

  const getRoleInfo = (role?: string) => {
    const roles: Record<string, { label: string; icon: typeof Crown; color: string; bg: string }> = {
      'super_admin': { 
        label: 'Супер-администратор', 
        icon: Crown, 
        color: '#7C3AED',
        bg: '#F3E8FF'
      },
      'admin': { 
        label: 'Администратор', 
        icon: Shield, 
        color: '#3A7BFF',
        bg: '#EBF5FF'
      },
      'moderator': { 
        label: 'Модератор', 
        icon: Shield, 
        color: '#22C55E',
        bg: '#DCFCE7'
      },
      'seller': { 
        label: 'Продавец', 
        icon: Store, 
        color: '#F59E0B',
        bg: '#FEF3C7'
      },
      'user': { 
        label: 'Пользователь', 
        icon: User, 
        color: '#6B7280',
        bg: '#F3F4F6'
      },
    };
    return roles[role || 'user'] || roles['user'];
  };

  if (!user) {
    return <AuthScreen />;
  }

  const roleInfo = getRoleInfo(user.role);
  const RoleIcon = roleInfo.icon;

  const menuItems = [
    { icon: ShoppingBag, label: 'Мои объявления', path: '/my-ads', color: '#3A7BFF' },
    { icon: Heart, label: 'Избранное', path: '/favorites', color: '#EC4899' },
    { icon: MessageCircle, label: 'Сообщения', path: '/chats', color: '#22C55E' },
    { icon: Store, label: 'Мой магазин', path: '/seller/cabinet', color: '#7C3AED' },
    { icon: Camera, label: 'Истории', path: '/seller/stories', color: '#F97316' },
    { icon: Star, label: 'AI Ассистент', path: '/twin', color: '#06B6D4' },
  ];

  const adminMenuItems = [
    { 
      icon: FileText, 
      label: 'Заявки на магазины', 
      path: '/admin/shop-requests', 
      color: '#EC4899',
      count: adminCounts?.pendingShopRequests
    },
    { 
      icon: Store, 
      label: 'Управление магазинами', 
      path: '/admin/sellers', 
      color: '#7C3AED',
      count: (adminCounts?.pendingSellers || 0) + (adminCounts?.pendingFarmers || 0)
    },
    { 
      icon: CheckCircle, 
      label: 'Модерация объявлений', 
      path: '/admin/moderation', 
      color: '#22C55E',
      count: adminCounts?.pendingAds
    },
    { 
      icon: BarChart3, 
      label: 'Аналитика', 
      path: '/admin/analytics', 
      color: '#3A7BFF'
    },
  ];

  const profileHeader = (
    <div style={{
      padding: '32px 20px 24px',
      background: '#FFFFFF',
      borderBottom: '1px solid #F0F2F5',
    }}>
      <div style={{
        width: 88,
        height: 88,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #3A7BFF, #7C3AED)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 16px',
        boxShadow: '0 4px 16px rgba(58, 123, 255, 0.25)',
      }}>
        <User size={40} color="#fff" />
      </div>

      <h1 style={{
        fontSize: 24,
        fontWeight: 700,
        color: '#1F2937',
        margin: '0 0 4px',
        textAlign: 'center',
      }}>
        {telegramSummary}
      </h1>
      
      {user.username && (
        <p style={{
          fontSize: 15,
          color: '#3A7BFF',
          margin: '0 0 12px',
          textAlign: 'center',
          fontWeight: 500,
        }}>
          @{user.username}
        </p>
      )}

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
  );

  return (
    <ScreenLayout 
      header={profileHeader}
      showBottomNav={true}
    >
      <div style={{ padding: '16px' }}>
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #F0F2F5',
          borderRadius: 20,
          overflow: 'hidden',
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
                  ? '1px solid #F0F2F5' 
                  : 'none',
                cursor: 'pointer',
              }}
              data-testid={`menu-item-${item.label.toLowerCase().replace(/\s/g, '-')}`}
            >
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: `${item.color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <item.icon size={22} color={item.color} />
              </div>
              <span style={{
                flex: 1,
                fontSize: 16,
                fontWeight: 500,
                color: '#1F2937',
                textAlign: 'left',
              }}>
                {item.label}
              </span>
              <ChevronRight size={20} color="#9CA3AF" />
            </button>
          ))}
        </div>

        {/* Admin Menu - only for admins/moderators */}
        {isAdmin && (
          <div style={{
            marginTop: 16,
            background: '#FFFFFF',
            border: '2px solid #7C3AED',
            borderRadius: 20,
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '12px 20px',
              background: 'linear-gradient(135deg, #7C3AED15, #3A7BFF15)',
              borderBottom: '1px solid #F0F2F5',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <Shield size={18} color="#7C3AED" />
              <span style={{ fontSize: 14, fontWeight: 600, color: '#7C3AED' }}>
                Панель администратора
              </span>
            </div>
            {adminMenuItems.map((item, index) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 20px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: index < adminMenuItems.length - 1 
                    ? '1px solid #F0F2F5' 
                    : 'none',
                  cursor: 'pointer',
                }}
                data-testid={`admin-menu-${item.label.toLowerCase().replace(/\s/g, '-')}`}
              >
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: `${item.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}>
                  <item.icon size={20} color={item.color} />
                  {item.count !== undefined && item.count > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: -4,
                      right: -4,
                      minWidth: 18,
                      height: 18,
                      borderRadius: 9,
                      background: '#EF4444',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 5px',
                      fontSize: 10,
                      fontWeight: 700,
                      color: '#fff',
                    }}>
                      {item.count > 99 ? '99+' : item.count}
                    </div>
                  )}
                </div>
                <span style={{
                  flex: 1,
                  fontSize: 15,
                  fontWeight: 500,
                  color: '#1F2937',
                  textAlign: 'left',
                }}>
                  {item.label}
                </span>
                {isLoadingCounts ? (
                  <Loader2 size={16} color="#9CA3AF" className="animate-spin" />
                ) : (
                  <ChevronRight size={18} color="#9CA3AF" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Location Card */}
        <div style={{
          marginTop: 16,
          background: '#FFFFFF',
          border: '1px solid #F0F2F5',
          borderRadius: 20,
          padding: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: '#ECFDF5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <MapPin size={22} color="#22C55E" />
            </div>
            <div>
              <h3 style={{ 
                margin: 0, 
                fontSize: 16, 
                fontWeight: 600, 
                color: '#1F2937' 
              }}>
                Геопозиция
              </h3>
              <p style={{ 
                margin: '2px 0 0', 
                fontSize: 13, 
                color: status === 'ready' ? '#22C55E' : '#9CA3AF',
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
              padding: '14px 20px',
              background: status === 'loading' ? '#F5F6F8' : '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: 14,
              fontSize: 15,
              fontWeight: 500,
              color: '#1F2937',
              cursor: status === 'loading' ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
            data-testid="button-update-location"
          >
            <RefreshCw size={18} color={status === 'loading' ? '#9CA3AF' : '#3A7BFF'} />
            {status === 'loading' ? 'Определение...' : 'Обновить местоположение'}
          </button>
        </div>

        {/* Contact Info */}
        {user.phone && (
          <div style={{
            marginTop: 16,
            background: '#FFFFFF',
            border: '1px solid #F0F2F5',
            borderRadius: 20,
            padding: 20,
          }}>
            <h3 style={{ 
              margin: '0 0 12px', 
              fontSize: 16, 
              fontWeight: 600, 
              color: '#1F2937' 
            }}>
              Контактная информация
            </h3>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              background: '#F8FAFC',
              borderRadius: 12,
            }}>
              <span style={{ fontSize: 15, color: '#6B7280' }}>Телефон:</span>
              <span style={{ fontSize: 15, fontWeight: 500, color: '#1F2937' }}>
                {user.phone}
              </span>
            </div>
          </div>
        )}

        {/* User ID */}
        <div style={{
          marginTop: 16,
          textAlign: 'center',
          padding: 16,
        }}>
          <p style={{ 
            fontSize: 12, 
            color: '#9CA3AF',
            margin: 0,
          }}>
            Telegram ID: {user.telegramId}
          </p>
        </div>
      </div>
    </ScreenLayout>
  );
}
