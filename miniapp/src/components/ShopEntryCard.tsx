import { useEffect } from 'react';
import type { CSSProperties, FC } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  MapPin,
  ShieldCheck,
  Sparkles,
  Store,
  Wand2,
} from 'lucide-react';
import type { Shop, ShopStatus } from '@/types';

const shimmerStyleId = 'shop-entry-card-shimmer';

const injectShimmerKeyframes = () => {
  if (typeof document === 'undefined') return;
  if (document.getElementById(shimmerStyleId)) return;

  const style = document.createElement('style');
  style.id = shimmerStyleId;
  style.innerHTML = `@keyframes shopEntryShimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }`;
  document.head.appendChild(style);
};

const baseCardStyle: CSSProperties = {
  width: '100%',
  borderRadius: 18,
  padding: 18,
  position: 'relative',
  overflow: 'hidden',
  cursor: 'pointer',
  background: 'linear-gradient(135deg, #111827 0%, #020617 40%, #22c55e22 100%)',
  border: '1px solid rgba(34, 197, 94, 0.35)',
  boxShadow: '0 0 24px rgba(34, 197, 94, 0.35)',
};

const hoverMotion = {
  whileHover: { scale: 1.02, boxShadow: '0 0 32px rgba(34, 197, 94, 0.55)' },
  whileTap: { scale: 0.995 },
};

const statusBadgeStyles: Record<ShopStatus, { label: string; color: string; bg: string }> = {
  approved: { label: 'Активен', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)' },
  pending: { label: 'На модерации', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.18)' },
  paused: { label: 'Пауза', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.14)' },
  rejected: { label: 'Отклонён', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.14)' },
};

const SkeletonBlock = ({ width, height, style }: { width: string; height: number; style?: CSSProperties }) => (
  <div
    style={{
      width,
      height,
      borderRadius: 10,
      background: 'linear-gradient(90deg, #151515 0%, #1e1e1e 50%, #151515 100%)',
      backgroundSize: '200% 100%',
      animation: 'shopEntryShimmer 1.4s infinite',
      ...style,
    }}
  />
);

const ShopCardSkeleton: FC = () => {
  useEffect(() => {
    injectShimmerKeyframes();
  }, []);

  return (
    <div style={{ ...baseCardStyle, cursor: 'default' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <SkeletonBlock width="72px" height={72} style={{ borderRadius: '50%' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SkeletonBlock width="60%" height={16} />
          <SkeletonBlock width="80%" height={14} />
          <SkeletonBlock width="40%" height={12} />
        </div>
      </div>
      <div style={{ marginTop: 18 }}>
        <SkeletonBlock width="48%" height={42} style={{ borderRadius: 12 }} />
      </div>
    </div>
  );
};

const ShopCardError: FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <motion.div
    {...hoverMotion}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.25, ease: 'easeOut' }}
    style={{
      ...baseCardStyle,
      cursor: 'default',
      background: 'linear-gradient(135deg, #111827 0%, #200c0c 50%, #ef444422 100%)',
      border: '1px solid rgba(239, 68, 68, 0.45)',
      boxShadow: '0 0 26px rgba(239, 68, 68, 0.35)',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <Wand2 size={26} color="#f87171" />
      <div style={{ flex: 1 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#fca5a5' }}>
          Не удалось загрузить статус магазина
        </h3>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: '#fcdcdc', opacity: 0.85 }}>
          Попробуйте обновить страницу или зайти позже.
        </p>
      </div>
      <button
        onClick={onRetry}
        style={{
          padding: '10px 14px',
          borderRadius: 12,
          border: '1px solid rgba(239, 68, 68, 0.45)',
          background: 'rgba(239, 68, 68, 0.12)',
          color: '#fecaca',
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        Повторить
      </button>
    </div>
  </motion.div>
);

const StatusBadge = ({ status }: { status: ShopStatus }) => {
  const variant = statusBadgeStyles[status];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        borderRadius: 999,
        color: variant.color,
        background: variant.bg,
        fontWeight: 700,
        fontSize: 13,
      }}
    >
      <span
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

const VerifiedBadge = () => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 12px',
      borderRadius: 12,
      background: 'rgba(34, 197, 94, 0.12)',
      color: '#22c55e',
      fontSize: 13,
      fontWeight: 700,
    }}
  >
    <ShieldCheck size={16} />
    Проверенный магазин
  </div>
);

const NeonButton = ({ label }: { label: string }) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      padding: '12px 16px',
      background: 'linear-gradient(135deg, #22c55e, #06b6d4)',
      color: '#0b1220',
      borderRadius: 14,
      fontWeight: 800,
      fontSize: 14,
      boxShadow: '0 14px 36px rgba(34, 197, 94, 0.35)',
      letterSpacing: 0.2,
    }}
  >
    {label}
    <ArrowRight size={18} />
  </div>
);

const Avatar = ({ name, logoUrl }: { name: string; logoUrl?: string | null }) => {
  const fallback = name?.charAt(0)?.toUpperCase() || '🛒';

  return (
    <div
      style={{
        width: 80,
        height: 80,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
      }}
    >
      {logoUrl ? (
        <img src={logoUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span style={{ fontSize: 32, color: '#e5e7eb' }}>{fallback}</span>
      )}
    </div>
  );
};

interface ShopEntryCardProps {
  state: 'loading' | 'noShop' | 'hasShop' | 'error';
  shop?: Shop;
  onClickCreate: () => void;
  onClickOpenDashboard: () => void;
  onRetry: () => void;
}

export const ShopEntryCard: FC<ShopEntryCardProps> = ({
  state,
  shop,
  onClickCreate,
  onClickOpenDashboard,
  onRetry,
}) => {
  if (state === 'loading') {
    return <ShopCardSkeleton />;
  }

  if (state === 'error') {
    return <ShopCardError onRetry={onRetry} />;
  }

  if (state === 'noShop') {
    return (
      <motion.div
        {...hoverMotion}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        role="button"
        tabIndex={0}
        onClick={onClickCreate}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onClickCreate();
        }}
        style={{
          ...baseCardStyle,
          outline: 'none',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            padding: '6px 10px',
            borderRadius: 999,
            background: 'rgba(6, 182, 212, 0.18)',
            color: '#67e8f9',
            fontWeight: 800,
            fontSize: 12,
            letterSpacing: 0.3,
          }}
        >
          NEW
        </span>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(34,197,94,0.35) 0%, rgba(6,182,212,0.25) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 12px 36px rgba(34, 197, 94, 0.35)',
            }}
          >
            <Store size={34} color="#34f59b" />
          </div>
          <div style={{ flex: 1, color: '#e5e7eb' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Sparkles size={16} color="#67e8f9" />
              <span style={{ color: '#a5f3fc', fontSize: 13, fontWeight: 700 }}>Витрина продавца</span>
            </div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Создать магазин</h3>
            <p style={{ margin: '6px 0 0', fontSize: 14, color: '#cbd5e1', lineHeight: 1.45 }}>
              Размещай свои товары, запускай ярмарки и получай аналитику спроса вокруг тебя.
            </p>
          </div>
          <NeonButton label="Открыть кабинет" />
        </div>
      </motion.div>
    );
  }

  if (state === 'hasShop' && shop) {
    return (
      <motion.div
        {...hoverMotion}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        role="button"
        tabIndex={0}
        onClick={onClickOpenDashboard}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onClickOpenDashboard();
        }}
        style={{
          ...baseCardStyle,
          outline: 'none',
          background: 'linear-gradient(135deg, #0f172a 0%, #0b1220 40%, #22c55e1f 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Avatar name={shop.name} logoUrl={shop.logoUrl} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#e5e7eb' }}>{shop.name}</h3>
              <StatusBadge status={shop.status} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, color: '#cbd5e1' }}>
              <MapPin size={16} color="#67e8f9" />
              <span style={{ fontSize: 14 }}>
                Город: {shop.location?.city || '—'}
                {shop.location?.district ? `, район: ${shop.location.district}` : ''}
              </span>
            </div>
            {shop.isVerified && (
              <div style={{ marginTop: 8 }}>
                <VerifiedBadge />
              </div>
            )}
          </div>
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <NeonButton label="Перейти в кабинет" />
            <span style={{ color: '#a5f3fc', fontSize: 13, textDecoration: 'underline' }}>
              Моя витрина / мини-страница
            </span>
          </div>
        </div>
      </motion.div>
    );
  }

  return null;
};
