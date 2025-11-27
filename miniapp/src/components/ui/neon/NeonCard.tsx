import { motion } from 'framer-motion';
import { neonTheme, NeonColor, getGlowStyle } from './neonTheme';

interface NeonCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: NeonColor;
  hoverable?: boolean;
  animated?: boolean;
  onClick?: () => void;
  variant?: 'default' | 'outlined' | 'glass' | 'solid';
}

export function NeonCard({
  children,
  className = '',
  glowColor = 'cyan',
  hoverable = true,
  animated = true,
  onClick,
  variant = 'default',
}: NeonCardProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'outlined':
        return {
          background: 'transparent',
          border: `1px solid ${neonTheme.colors.border}`,
        };
      case 'glass':
        return {
          background: neonTheme.colors.backgroundCard,
          backdropFilter: neonTheme.blur.card,
          border: `1px solid ${neonTheme.colors.border}`,
        };
      case 'solid':
        return {
          background: neonTheme.colors.backgroundSecondary,
          border: 'none',
        };
      default:
        return {
          background: neonTheme.colors.backgroundCard,
          backdropFilter: neonTheme.blur.card,
          border: `1px solid ${neonTheme.colors.border}`,
        };
    }
  };

  const cardStyle = {
    ...getVariantStyles(),
    borderRadius: '12px',
    padding: '16px',
    position: 'relative' as const,
    overflow: 'hidden',
  };

  const hoverVariants = {
    hover: {
      boxShadow: getGlowStyle(glowColor, 'subtle'),
      borderColor: neonTheme.colors[`neon${glowColor.charAt(0).toUpperCase() + glowColor.slice(1)}` as keyof typeof neonTheme.colors],
      scale: 1.02,
    },
  };

  return (
    <motion.div
      style={cardStyle}
      className={`neon-card ${className}`}
      onClick={onClick}
      initial={animated ? { opacity: 0, y: 10 } : undefined}
      animate={animated ? { opacity: 1, y: 0 } : undefined}
      variants={hoverVariants}
      whileHover={hoverable ? 'hover' : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      data-testid="neon-card"
    >
      <div 
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(${neonTheme.colors.gridLine} 1px, transparent 1px),
            linear-gradient(90deg, ${neonTheme.colors.gridLine} 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
        }}
      />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

interface NeonStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
  glowColor?: NeonColor;
  className?: string;
}

export function NeonStatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  glowColor = 'cyan',
  className = '',
}: NeonStatCardProps) {
  const glowColorValue = neonTheme.colors[`neon${glowColor.charAt(0).toUpperCase() + glowColor.slice(1)}` as keyof typeof neonTheme.colors];

  return (
    <NeonCard className={`neon-stat-card ${className}`} glowColor={glowColor}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <span 
            className="text-xs uppercase tracking-wider"
            style={{ color: neonTheme.colors.textMuted }}
          >
            {title}
          </span>
          
          <div className="flex items-baseline gap-2 mt-1">
            <motion.span
              className="text-3xl font-bold"
              style={{ 
                color: glowColorValue,
                textShadow: getGlowStyle(glowColor, 'subtle'),
                fontFamily: neonTheme.fonts.digital,
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              data-testid={`stat-value-${title.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {value}
            </motion.span>
            
            {trend && (
              <span 
                className="text-sm font-medium"
                style={{ 
                  color: trend.isPositive ? neonTheme.colors.success : neonTheme.colors.error 
                }}
              >
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
            )}
          </div>
          
          {subtitle && (
            <span 
              className="text-xs mt-1 block"
              style={{ color: neonTheme.colors.textSecondary }}
            >
              {subtitle}
            </span>
          )}
        </div>
        
        {icon && (
          <div 
            className="p-2 rounded-lg"
            style={{ 
              background: `${glowColorValue}20`,
              color: glowColorValue,
            }}
          >
            {icon}
          </div>
        )}
      </div>
      
      <div 
        className="absolute bottom-0 left-0 right-0 h-0.5"
        style={{
          background: `linear-gradient(90deg, transparent, ${glowColorValue}, transparent)`,
          opacity: 0.5,
        }}
      />
    </NeonCard>
  );
}

export default NeonCard;
