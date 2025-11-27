import { motion } from 'framer-motion';
import { neonTheme, NeonColor, getNeonColor, getGlowStyle } from './neonTheme';
import { NeonBadge } from './NeonBadge';

interface NeonGridItem {
  id: string;
  title: string;
  subtitle?: string;
  price?: number;
  currency?: string;
  imageUrl?: string;
  badges?: Array<{ label: string; color?: NeonColor }>;
  isNew?: boolean;
  isHot?: boolean;
  priceDropPercent?: number;
}

interface NeonGridProps {
  items: NeonGridItem[];
  columns?: 2 | 3;
  gap?: number;
  onItemClick?: (item: NeonGridItem) => void;
  showSkeleton?: boolean;
  skeletonCount?: number;
  className?: string;
}

export function NeonGrid({
  items,
  columns = 2,
  gap = 12,
  onItemClick,
  showSkeleton = false,
  skeletonCount = 6,
  className = '',
}: NeonGridProps) {
  if (showSkeleton) {
    return (
      <div 
        className={`grid ${className}`}
        style={{
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap,
        }}
        data-testid="neon-grid-skeleton"
      >
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <NeonGridSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div 
      className={`grid ${className}`}
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap,
      }}
      data-testid="neon-grid"
    >
      {items.map((item, index) => (
        <NeonGridCard
          key={item.id}
          item={item}
          index={index}
          onClick={() => onItemClick?.(item)}
        />
      ))}
    </div>
  );
}

interface NeonGridCardProps {
  item: NeonGridItem;
  index: number;
  onClick?: () => void;
}

function NeonGridCard({ item, index, onClick }: NeonGridCardProps) {
  const hasSpecialBadge = item.isNew || item.isHot || item.priceDropPercent;

  return (
    <motion.div
      className="relative overflow-hidden rounded-xl cursor-pointer"
      style={{
        background: neonTheme.colors.backgroundCard,
        backdropFilter: neonTheme.blur.card,
        border: `1px solid ${neonTheme.colors.border}`,
      }}
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{
        scale: 1.02,
        boxShadow: neonTheme.shadows.glowSoft,
        borderColor: neonTheme.colors.neonCyan,
      }}
      whileTap={{ scale: 0.98 }}
      data-testid={`card-product-${item.id}`}
    >
      <div className="relative aspect-square overflow-hidden">
        {item.imageUrl ? (
          <motion.img
            src={item.imageUrl}
            alt={item.title}
            className="w-full h-full object-cover"
            loading="lazy"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.3 }}
          />
        ) : (
          <div 
            className="w-full h-full flex items-center justify-center"
            style={{ background: neonTheme.colors.backgroundSecondary }}
          >
            <span style={{ color: neonTheme.colors.textMuted }}>No image</span>
          </div>
        )}
        
        <div 
          className="absolute inset-0"
          style={{ 
            background: neonTheme.gradients.darkOverlay,
            pointerEvents: 'none',
          }}
        />
        
        <div 
          className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity"
          style={{ 
            boxShadow: `inset 0 0 30px ${neonTheme.colors.neonCyan}30`,
          }}
        />

        {hasSpecialBadge && (
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {item.isNew && (
              <NeonBadge color="lime" size="sm" pulse>
                New
              </NeonBadge>
            )}
            {item.isHot && (
              <NeonBadge color="fuchsia" size="sm" pulse>
                Hot
              </NeonBadge>
            )}
            {item.priceDropPercent && (
              <NeonBadge color="orange" size="sm">
                -{item.priceDropPercent}%
              </NeonBadge>
            )}
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 
          className="text-sm font-medium line-clamp-2 mb-1"
          style={{ color: neonTheme.colors.textPrimary }}
        >
          {item.title}
        </h3>
        
        {item.subtitle && (
          <p 
            className="text-xs line-clamp-1 mb-2"
            style={{ color: neonTheme.colors.textMuted }}
          >
            {item.subtitle}
          </p>
        )}
        
        {item.price !== undefined && (
          <div 
            className="text-lg font-bold"
            style={{ 
              color: neonTheme.colors.neonLime,
              textShadow: getGlowStyle('lime', 'subtle'),
              fontFamily: neonTheme.fonts.digital,
            }}
          >
            {item.price.toLocaleString()} {item.currency || 'RUB'}
          </div>
        )}

        {item.badges && item.badges.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {item.badges.slice(0, 3).map((badge, i) => (
              <NeonBadge 
                key={i} 
                color={badge.color || 'cyan'} 
                variant="outlined" 
                size="sm"
              >
                {badge.label}
              </NeonBadge>
            ))}
          </div>
        )}
      </div>

      <div 
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${neonTheme.colors.neonCyan}, transparent)`,
          opacity: 0.5,
        }}
      />
    </motion.div>
  );
}

function NeonGridSkeleton() {
  return (
    <motion.div
      className="relative overflow-hidden rounded-xl"
      style={{
        background: neonTheme.colors.backgroundCard,
        border: `1px solid ${neonTheme.colors.border}`,
      }}
      animate={{
        opacity: [0.5, 0.8, 0.5],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      data-testid="neon-skeleton-card"
    >
      <div 
        className="aspect-square"
        style={{ 
          background: `linear-gradient(135deg, 
            ${neonTheme.colors.backgroundSecondary} 0%, 
            ${neonTheme.colors.background} 50%, 
            ${neonTheme.colors.backgroundSecondary} 100%
          )`,
          backgroundSize: '200% 200%',
        }}
      >
        <motion.div
          className="w-full h-full"
          style={{
            background: `linear-gradient(90deg, 
              transparent, 
              ${neonTheme.colors.neonCyan}10, 
              transparent
            )`,
          }}
          animate={{
            x: ['-100%', '100%'],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      </div>
      
      <div className="p-3 space-y-2">
        <div 
          className="h-4 w-3/4 rounded"
          style={{ background: neonTheme.colors.backgroundSecondary }}
        />
        <div 
          className="h-3 w-1/2 rounded"
          style={{ background: neonTheme.colors.backgroundSecondary }}
        />
        <div 
          className="h-5 w-1/3 rounded"
          style={{ background: neonTheme.colors.backgroundSecondary }}
        />
      </div>
    </motion.div>
  );
}

export default NeonGrid;
