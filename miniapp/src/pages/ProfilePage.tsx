import { ReactNode, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  RefreshCw
} from 'lucide-react';
import AuthScreen from '@/components/AuthScreen';
import { useUserStore } from '@/store/useUserStore';
import { useGeo } from '@/utils/geo';
import { getMyShop } from '@/api/shops';
import type { Shop, ShopStatus } from '@/types';

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <div style={{ marginTop: 16 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>{title}</h2>
      <div
        style={{
          height: 4,
          flex: 1,
          borderRadius: 999,
          background: 'linear-gradient(90deg, #3B82F6 0%, #8B5CF6 100%)',
          opacity: 0.2,
        }}
      />
    </div>
    {children}
  </div>
);

const ShopStatusBadge = ({ status }: { status: ShopStatus }) => {
  const variants: Record<ShopStatus, { label: string; color: string; bg: string }> = {
    approved: { label: 'Активен', color: '#22C55E', bg: '#DCFCE7' },
    pending: { label: 'На модерации', color: '#F59E0B', bg: '#FEF3C7' },
    paused: { label: 'Пауза', color: '#6B7280', bg: '#F3F4F6' },
    rejected: { label: 'Отклонён', color: '#EF4444', bg: '#FEE2E2' },
  };

  const variant = variants[status];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 10px',
        background: variant.bg,
        color: variant.color,
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: variant.color,
          boxShadow: `0 0 0 4px ${variant.bg}`,
        }}
      />
      {variant.label}
    </span>
  );
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const user = useUserStore((state) => state.user);
  const { requestLocation, status } = useGeo();
  const [shop, setShop] = useState<Shop | null>(null);
  const [isShopLoading, setIsShopLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const fetchShop = async () => {
      try {
        setIsShopLoading(true);
        const response = await getMyShop();
        if (!isActive) return;
        setShop(response.data);
      } catch (error: any) {
        if (!isActive) return;
        if (error?.response?.status === 404) {
          setShop(null);
        } else {
          console.error('Не удалось загрузить магазин', error);
        }
      } finally {
        if (isActive) {
          setIsShopLoading(false);
        }
      }
    };

    fetchShop();

    return () => {
      isActive = false;
    };
  }, []);

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
    { icon: Tractor, label: 'Фермерский кабинет', path: '/farmer/cabinet', color: '#F59E0B' },
    { icon: Star, label: 'AI Ассистент', path: '/twin', color: '#06B6D4' },
  ];

  return (
    <div style={{ 
      minHeight: '100vh',
      background: '#FFFFFF',
      padding: '0 0 100px',
    }}>
      {/* Profile Header */}
      <div style={{
        padding: '32px 20px 24px',
        background: '#FFFFFF',
        borderBottom: '1px solid #F0F2F5',
      }}>
        {/* Avatar */}
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

        {/* Name & Username */}
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

        <Section title="Бизнес">
          {isShopLoading ? (
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #F0F2F5',
                borderRadius: 16,
                padding: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                color: '#6B7280',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              Загрузка магазина...
            </div>
          ) : !shop ? (
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate('/shop-entry?mode=create')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') navigate('/shop-entry?mode=create');
              }}
              style={{
                background: 'linear-gradient(135deg, #0F172A 0%, #111827 100%)',
                border: '1px solid #111827',
                borderRadius: 16,
                padding: 18,
                color: '#E5E7EB',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.25)',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    background: 'rgba(59, 130, 246, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#60A5FA',
                  }}
                >
                  <Store size={26} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#F9FAFB' }}>Создать магазин</h3>
                  <p style={{ margin: '6px 0 0', fontSize: 14, color: '#9CA3AF', lineHeight: 1.4 }}>
                    Размещай товары, получай аналитику и создавай свою витрину
                  </p>
                </div>
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 16px',
                  background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
                  color: '#FFFFFF',
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 15,
                  boxShadow: '0 12px 30px rgba(37, 99, 235, 0.3)',
                }}
              >
                Открыть магазин
                <ChevronRight size={18} color="#FFFFFF" />
              </div>
            </div>
          ) : (
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate('/shop-entry?mode=dashboard')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') navigate('/shop-entry?mode=dashboard');
              }}
              style={{
                background: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: 16,
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                cursor: 'pointer',
                transition: 'box-shadow 0.2s ease, transform 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    background: '#F3F4F6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    border: '1px solid #E5E7EB',
                  }}
                >
                  {shop.logoUrl ? (
                    <img
                      src={shop.logoUrl}
                      alt={shop.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Store size={26} color="#6B7280" />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>{shop.name}</h3>
                  <div style={{ marginTop: 6 }}>
                    <ShopStatusBadge status={shop.status} />
                  </div>
                </div>
              </div>
              <div
                style={{
                  alignSelf: 'flex-start',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  background: '#0F172A',
                  color: '#FFFFFF',
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 14,
                  boxShadow: '0 10px 24px rgba(15, 23, 42, 0.3)',
                }}
              >
                Перейти в кабинет магазина
                <ChevronRight size={18} color="#FFFFFF" />
              </div>
            </div>
          )}
        </Section>

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
    </div>
  );
}
