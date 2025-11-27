import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { neonTheme, NeonColor, getNeonColor, getGlowStyle } from './neonTheme';

export interface HistogramDataPoint {
  label: string;
  value: number;
  color?: NeonColor;
}

interface NeonHistogramProps {
  data: HistogramDataPoint[];
  orientation?: 'vertical' | 'horizontal';
  height?: number;
  showLabels?: boolean;
  showValues?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  animated?: boolean;
  barGap?: number;
  barRadius?: number;
  primaryColor?: NeonColor;
  onClick?: (item: HistogramDataPoint, index: number) => void;
  className?: string;
}

export function NeonHistogram({
  data,
  orientation = 'vertical',
  height = 200,
  showLabels = true,
  showValues = true,
  showGrid = true,
  showTooltip = true,
  animated = true,
  barGap = 8,
  barRadius = 4,
  primaryColor = 'cyan',
  onClick,
  className = '',
}: NeonHistogramProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const maxValue = useMemo(() => Math.max(...data.map(d => d.value), 1), [data]);
  const primaryColorValue = getNeonColor(primaryColor);
  const secondaryColorValue = neonTheme.colors.neonLime;

  const handleMouseMove = (e: React.MouseEvent, index: number) => {
    if (showTooltip) {
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltipPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setHoveredIndex(index);
    }
  };

  const isVertical = orientation === 'vertical';

  return (
    <div 
      className={`neon-histogram relative ${className}`}
      style={{ 
        height: isVertical ? height : 'auto',
        width: '100%',
      }}
      data-testid="neon-histogram"
    >
      {showGrid && isVertical && (
        <div className="absolute inset-0 pointer-events-none">
          {[0, 25, 50, 75, 100].map(pct => (
            <div
              key={pct}
              className="absolute w-full border-t border-dashed"
              style={{
                bottom: `${pct}%`,
                borderColor: neonTheme.colors.gridLine,
              }}
            />
          ))}
        </div>
      )}

      <div 
        className={`relative flex ${isVertical ? 'flex-row items-end h-full' : 'flex-col'}`}
        style={{ 
          gap: barGap,
          height: isVertical ? '100%' : 'auto',
        }}
      >
        {data.map((item, index) => {
          const percentage = (item.value / maxValue) * 100;
          const barColor = item.color ? getNeonColor(item.color) : primaryColorValue;
          const isHovered = hoveredIndex === index;

          return (
            <div
              key={`${item.label}-${index}`}
              className={`relative flex ${isVertical ? 'flex-col items-center flex-1' : 'flex-row items-center'}`}
              style={{ minWidth: isVertical ? 0 : 'auto' }}
              onMouseMove={(e) => handleMouseMove(e, index)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => onClick?.(item, index)}
              data-testid={`histogram-bar-${index}`}
            >
              <motion.div
                className="relative cursor-pointer"
                style={{
                  width: isVertical ? '100%' : `${percentage}%`,
                  height: isVertical ? `${percentage}%` : 32,
                  borderRadius: barRadius,
                  background: `linear-gradient(${isVertical ? '180deg' : '90deg'}, ${barColor}, ${secondaryColorValue})`,
                  boxShadow: isHovered ? getGlowStyle(primaryColor, 'intense') : getGlowStyle(primaryColor, 'subtle'),
                  minWidth: isVertical ? 'auto' : 4,
                  minHeight: isVertical ? 4 : 'auto',
                }}
                initial={animated ? { 
                  [isVertical ? 'height' : 'width']: '0%',
                  opacity: 0,
                } : undefined}
                animate={animated ? { 
                  [isVertical ? 'height' : 'width']: `${percentage}%`,
                  opacity: 1,
                } : undefined}
                transition={{
                  duration: 0.6,
                  delay: index * 0.05,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
                whileHover={{
                  scale: isVertical ? [1, 1.05] : [1, 1],
                  boxShadow: getGlowStyle(primaryColor, 'intense'),
                }}
              >
                {showValues && isHovered && (
                  <motion.div
                    className="absolute text-center font-bold text-xs"
                    style={{
                      color: neonTheme.colors.textPrimary,
                      textShadow: getGlowStyle(primaryColor, 'subtle'),
                      [isVertical ? 'bottom' : 'right']: '100%',
                      [isVertical ? 'left' : 'top']: '50%',
                      transform: isVertical ? 'translateX(-50%)' : 'translateY(-50%)',
                      padding: 4,
                      fontFamily: neonTheme.fonts.digital,
                    }}
                    initial={{ opacity: 0, y: isVertical ? 10 : 0 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {item.value.toLocaleString()}
                  </motion.div>
                )}
              </motion.div>

              {showLabels && (
                <span
                  className="text-xs mt-2 text-center truncate w-full"
                  style={{ 
                    color: isHovered ? primaryColorValue : neonTheme.colors.textMuted,
                    transition: 'color 0.2s',
                  }}
                >
                  {item.label}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {showTooltip && hoveredIndex !== null && (
          <motion.div
            className="absolute z-50 pointer-events-none px-3 py-2 rounded-lg text-sm"
            style={{
              background: neonTheme.colors.backgroundCard,
              border: `1px solid ${primaryColorValue}`,
              boxShadow: getGlowStyle(primaryColor, 'subtle'),
              left: tooltipPos.x + 10,
              top: tooltipPos.y - 40,
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <div style={{ color: neonTheme.colors.textPrimary, fontWeight: 600 }}>
              {data[hoveredIndex].label}
            </div>
            <div style={{ color: primaryColorValue, fontFamily: neonTheme.fonts.digital }}>
              {data[hoveredIndex].value.toLocaleString()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default NeonHistogram;
