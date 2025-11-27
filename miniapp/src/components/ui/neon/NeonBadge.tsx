import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { neonTheme, NeonColor, getNeonColor, getGlowStyle } from './neonTheme';

interface NeonBadgeProps {
  children: ReactNode;
  color?: NeonColor;
  variant?: 'filled' | 'outlined' | 'glow';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  pulse?: boolean;
  className?: string;
}

export function NeonBadge({
  children,
  color = 'cyan',
  variant = 'filled',
  size = 'md',
  animated = true,
  pulse = false,
  className = '',
}: NeonBadgeProps) {
  const colorValue = getNeonColor(color);
  
  const sizeStyles = {
    sm: { padding: '2px 8px', fontSize: '10px' },
    md: { padding: '4px 12px', fontSize: '12px' },
    lg: { padding: '6px 16px', fontSize: '14px' },
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'outlined':
        return {
          background: 'transparent',
          border: `1px solid ${colorValue}`,
          color: colorValue,
        };
      case 'glow':
        return {
          background: `${colorValue}20`,
          border: `1px solid ${colorValue}`,
          color: colorValue,
          boxShadow: getGlowStyle(color, 'subtle'),
        };
      default:
        return {
          background: colorValue,
          border: 'none',
          color: neonTheme.colors.background,
        };
    }
  };

  const badgeStyle = {
    ...sizeStyles[size],
    ...getVariantStyles(),
    borderRadius: '999px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    whiteSpace: 'nowrap' as const,
  };

  return (
    <motion.span
      style={badgeStyle}
      className={`neon-badge ${className}`}
      initial={animated ? { opacity: 0, scale: 0.8 } : undefined}
      animate={animated ? { 
        opacity: 1, 
        scale: 1,
        ...(pulse ? {
          boxShadow: [
            getGlowStyle(color, 'subtle'),
            getGlowStyle(color, 'intense'),
            getGlowStyle(color, 'subtle'),
          ],
        } : {}),
      } : undefined}
      transition={pulse ? {
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      } : {
        duration: 0.2,
      }}
      data-testid="neon-badge"
    >
      {children}
    </motion.span>
  );
}

interface NeonStatusBadgeProps {
  status: 'online' | 'offline' | 'busy' | 'away';
  label?: string;
  showDot?: boolean;
}

export function NeonStatusBadge({ 
  status, 
  label, 
  showDot = true 
}: NeonStatusBadgeProps) {
  const statusConfig: Record<string, { color: NeonColor; label: string }> = {
    online: { color: 'lime', label: 'Online' },
    offline: { color: 'fuchsia', label: 'Offline' },
    busy: { color: 'orange', label: 'Busy' },
    away: { color: 'cyan', label: 'Away' },
  };

  const { color, label: defaultLabel } = statusConfig[status];
  const colorValue = getNeonColor(color);

  return (
    <NeonBadge color={color} variant="outlined" size="sm">
      {showDot && (
        <motion.span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: colorValue,
            boxShadow: getGlowStyle(color, 'normal'),
          }}
          animate={{
            opacity: [1, 0.5, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}
      {label || defaultLabel}
    </NeonBadge>
  );
}

interface NeonTagProps {
  label: string;
  onRemove?: () => void;
  color?: NeonColor;
}

export function NeonTag({ label, onRemove, color = 'cyan' }: NeonTagProps) {
  const colorValue = getNeonColor(color);

  return (
    <motion.span
      className="inline-flex items-center gap-1"
      style={{
        padding: '4px 10px',
        background: `${colorValue}15`,
        border: `1px solid ${colorValue}40`,
        borderRadius: '6px',
        fontSize: '12px',
        color: colorValue,
      }}
      whileHover={{ background: `${colorValue}25` }}
      data-testid={`neon-tag-${label}`}
    >
      {label}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 hover:opacity-80"
          style={{ color: colorValue }}
          data-testid={`button-remove-tag-${label}`}
        >
          ×
        </button>
      )}
    </motion.span>
  );
}

export default NeonBadge;
