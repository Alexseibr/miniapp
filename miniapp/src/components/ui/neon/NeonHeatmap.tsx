import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { neonTheme, heatmapColors } from './neonTheme';

export interface HeatmapPoint {
  lat: number;
  lng: number;
  weight: number;
  label?: string;
}

interface NeonHeatmapProps {
  points: HeatmapPoint[];
  width?: number;
  height?: number;
  cellSize?: number;
  showLegend?: boolean;
  animated?: boolean;
  className?: string;
  onClick?: (point: HeatmapPoint) => void;
}

export function NeonHeatmap({
  points,
  width = 300,
  height = 200,
  cellSize = 20,
  showLegend = true,
  animated = true,
  className = '',
  onClick,
}: NeonHeatmapProps) {
  const { normalizedPoints, bounds } = useMemo(() => {
    if (points.length === 0) {
      return { normalizedPoints: [], bounds: { minLat: 0, maxLat: 1, minLng: 0, maxLng: 1 } };
    }

    const minLat = Math.min(...points.map(p => p.lat));
    const maxLat = Math.max(...points.map(p => p.lat));
    const minLng = Math.min(...points.map(p => p.lng));
    const maxLng = Math.max(...points.map(p => p.lng));
    
    const latRange = maxLat - minLat || 1;
    const lngRange = maxLng - minLng || 1;
    
    const maxWeight = Math.max(...points.map(p => p.weight), 1);
    
    const normalized = points.map(p => ({
      ...p,
      x: ((p.lng - minLng) / lngRange) * (width - cellSize),
      y: ((maxLat - p.lat) / latRange) * (height - cellSize),
      normalizedWeight: p.weight / maxWeight,
    }));
    
    return { 
      normalizedPoints: normalized, 
      bounds: { minLat, maxLat, minLng, maxLng } 
    };
  }, [points, width, height, cellSize]);

  const getColor = (weight: number): string => {
    if (weight < 0.33) return heatmapColors.low;
    if (weight < 0.66) return heatmapColors.medium;
    return heatmapColors.high;
  };

  const getGlow = (weight: number): string => {
    const color = getColor(weight);
    const intensity = 10 + weight * 20;
    return `0 0 ${intensity}px ${color}`;
  };

  return (
    <div className={`neon-heatmap relative ${className}`} data-testid="neon-heatmap">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{
          background: neonTheme.colors.background,
          borderRadius: 8,
          border: `1px solid ${neonTheme.colors.border}`,
        }}
      >
        <defs>
          <filter id="heatmapGlow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          
          <radialGradient id="cellGradient">
            <stop offset="0%" stopColor="white" stopOpacity={0.8} />
            <stop offset="100%" stopColor="white" stopOpacity={0} />
          </radialGradient>
        </defs>

        <g className="grid-background">
          {Array.from({ length: Math.floor(width / 30) + 1 }).map((_, i) => (
            <line
              key={`v-${i}`}
              x1={i * 30}
              y1={0}
              x2={i * 30}
              y2={height}
              stroke={neonTheme.colors.gridLine}
              strokeWidth={0.5}
            />
          ))}
          {Array.from({ length: Math.floor(height / 30) + 1 }).map((_, i) => (
            <line
              key={`h-${i}`}
              x1={0}
              y1={i * 30}
              x2={width}
              y2={i * 30}
              stroke={neonTheme.colors.gridLine}
              strokeWidth={0.5}
            />
          ))}
        </g>

        <g className="heatmap-points">
          {normalizedPoints.map((point, index) => {
            const color = getColor(point.normalizedWeight);
            const size = cellSize * (0.5 + point.normalizedWeight * 0.5);
            
            return (
              <motion.g
                key={`${point.lat}-${point.lng}-${index}`}
                onClick={() => onClick?.(point)}
                style={{ cursor: onClick ? 'pointer' : 'default' }}
              >
                <motion.circle
                  cx={point.x + cellSize / 2}
                  cy={point.y + cellSize / 2}
                  r={size / 2 * 1.5}
                  fill={`${color}30`}
                  filter="url(#heatmapGlow)"
                  initial={animated ? { scale: 0, opacity: 0 } : undefined}
                  animate={animated ? { 
                    scale: [1, 1.1, 1],
                    opacity: 0.6,
                  } : undefined}
                  transition={{
                    scale: {
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: index * 0.1,
                    },
                    opacity: {
                      duration: 0.3,
                      delay: index * 0.05,
                    },
                  }}
                />
                
                <motion.circle
                  cx={point.x + cellSize / 2}
                  cy={point.y + cellSize / 2}
                  r={size / 2}
                  fill={color}
                  style={{ boxShadow: getGlow(point.normalizedWeight) }}
                  initial={animated ? { scale: 0, opacity: 0 } : undefined}
                  animate={animated ? { scale: 1, opacity: 1 } : undefined}
                  transition={{
                    duration: 0.4,
                    delay: index * 0.05,
                    ease: 'backOut',
                  }}
                  whileHover={{ scale: 1.2 }}
                />
              </motion.g>
            );
          })}
        </g>
      </svg>

      {showLegend && (
        <div 
          className="flex items-center justify-center gap-4 mt-3"
          style={{ color: neonTheme.colors.textSecondary, fontSize: 11 }}
        >
          <div className="flex items-center gap-1">
            <span 
              className="w-3 h-3 rounded-full"
              style={{ 
                background: heatmapColors.low,
                boxShadow: `0 0 8px ${heatmapColors.low}`,
              }}
            />
            <span>Low</span>
          </div>
          <div className="flex items-center gap-1">
            <span 
              className="w-3 h-3 rounded-full"
              style={{ 
                background: heatmapColors.medium,
                boxShadow: `0 0 8px ${heatmapColors.medium}`,
              }}
            />
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-1">
            <span 
              className="w-3 h-3 rounded-full"
              style={{ 
                background: heatmapColors.high,
                boxShadow: `0 0 8px ${heatmapColors.high}`,
              }}
            />
            <span>High</span>
          </div>
        </div>
      )}
    </div>
  );
}

interface NeonDensityGridProps {
  data: Array<{ row: number; col: number; value: number }>;
  rows?: number;
  cols?: number;
  cellSize?: number;
  animated?: boolean;
  className?: string;
}

export function NeonDensityGrid({
  data,
  rows = 5,
  cols = 7,
  cellSize = 40,
  animated = true,
  className = '',
}: NeonDensityGridProps) {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  
  const grid = useMemo(() => {
    const result: (number | null)[][] = Array(rows).fill(null).map(() => 
      Array(cols).fill(null)
    );
    
    data.forEach(d => {
      if (d.row < rows && d.col < cols) {
        result[d.row][d.col] = d.value;
      }
    });
    
    return result;
  }, [data, rows, cols]);

  const getColor = (value: number | null): string => {
    if (value === null) return 'transparent';
    const normalized = value / maxValue;
    if (normalized < 0.33) return heatmapColors.low;
    if (normalized < 0.66) return heatmapColors.medium;
    return heatmapColors.high;
  };

  return (
    <div 
      className={`neon-density-grid ${className}`}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
        gap: 2,
      }}
      data-testid="neon-density-grid"
    >
      {grid.map((row, rowIndex) =>
        row.map((value, colIndex) => {
          const color = getColor(value);
          const opacity = value !== null ? 0.3 + (value / maxValue) * 0.7 : 0.1;
          
          return (
            <motion.div
              key={`${rowIndex}-${colIndex}`}
              style={{
                width: cellSize,
                height: cellSize,
                borderRadius: 4,
                background: value !== null ? color : neonTheme.colors.backgroundSecondary,
                opacity,
                boxShadow: value !== null ? `0 0 10px ${color}50` : 'none',
              }}
              initial={animated ? { scale: 0 } : undefined}
              animate={animated ? { scale: 1 } : undefined}
              transition={{
                duration: 0.3,
                delay: (rowIndex * cols + colIndex) * 0.02,
              }}
              whileHover={{ scale: 1.1 }}
            />
          );
        })
      )}
    </div>
  );
}

export default NeonHeatmap;
