import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { neonTheme, NeonColor, getNeonColor, getGlowStyle } from './neonTheme';

export interface LineChartDataPoint {
  label: string;
  value: number;
}

interface NeonLineChartProps {
  data: LineChartDataPoint[];
  height?: number;
  showArea?: boolean;
  showPoints?: boolean;
  showGrid?: boolean;
  showLabels?: boolean;
  showTooltip?: boolean;
  animated?: boolean;
  lineColor?: NeonColor;
  pointColor?: NeonColor;
  areaOpacity?: number;
  curveType?: 'linear' | 'smooth';
  className?: string;
  onClick?: (point: LineChartDataPoint, index: number) => void;
}

export function NeonLineChart({
  data,
  height = 200,
  showArea = true,
  showPoints = true,
  showGrid = true,
  showLabels = true,
  showTooltip = true,
  animated = true,
  lineColor = 'cyan',
  pointColor = 'fuchsia',
  areaOpacity = 0.15,
  curveType = 'smooth',
  className = '',
  onClick,
}: NeonLineChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const containerRef = useRef<SVGSVGElement>(null);
  
  const lineColorValue = getNeonColor(lineColor);
  const pointColorValue = getNeonColor(pointColor);
  
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  
  const { maxValue, minValue, points, pathD, areaD } = useMemo(() => {
    const max = Math.max(...data.map(d => d.value), 1);
    const min = Math.min(...data.map(d => d.value), 0);
    const range = max - min || 1;
    
    const chartWidth = 100;
    const chartHeight = height - padding.top - padding.bottom;
    
    const pts = data.map((d, i) => ({
      x: padding.left + (i / (data.length - 1 || 1)) * (chartWidth - padding.left - padding.right),
      y: padding.top + chartHeight - ((d.value - min) / range) * chartHeight,
      ...d,
    }));
    
    let path = '';
    let area = '';
    
    if (curveType === 'smooth' && pts.length > 2) {
      path = `M ${pts[0].x},${pts[0].y}`;
      area = `M ${pts[0].x},${padding.top + chartHeight} L ${pts[0].x},${pts[0].y}`;
      
      for (let i = 0; i < pts.length - 1; i++) {
        const curr = pts[i];
        const next = pts[i + 1];
        const midX = (curr.x + next.x) / 2;
        path += ` C ${midX},${curr.y} ${midX},${next.y} ${next.x},${next.y}`;
        area += ` C ${midX},${curr.y} ${midX},${next.y} ${next.x},${next.y}`;
      }
      
      area += ` L ${pts[pts.length - 1].x},${padding.top + chartHeight} Z`;
    } else {
      path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');
      area = `M ${pts[0].x},${padding.top + chartHeight} ` + 
             pts.map(p => `L ${p.x},${p.y}`).join(' ') + 
             ` L ${pts[pts.length - 1].x},${padding.top + chartHeight} Z`;
    }
    
    return { maxValue: max, minValue: min, points: pts, pathD: path, areaD: area };
  }, [data, height, curveType, padding.top, padding.bottom, padding.left, padding.right]);
  
  const chartHeight = height - padding.top - padding.bottom;

  return (
    <div className={`neon-line-chart relative ${className}`} data-testid="neon-line-chart">
      <svg
        ref={containerRef}
        width="100%"
        height={height}
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={lineColorValue} />
            <stop offset="100%" stopColor={neonTheme.colors.neonLime} />
          </linearGradient>
          
          <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={lineColorValue} stopOpacity={areaOpacity} />
            <stop offset="100%" stopColor={lineColorValue} stopOpacity={0} />
          </linearGradient>
          
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {showGrid && (
          <g className="grid-lines">
            {[0, 0.25, 0.5, 0.75, 1].map(pct => {
              const y = padding.top + chartHeight * (1 - pct);
              return (
                <g key={pct}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={100 - padding.right}
                    y2={y}
                    stroke={neonTheme.colors.gridLine}
                    strokeDasharray="2,2"
                    strokeWidth={0.3}
                  />
                  <text
                    x={padding.left - 5}
                    y={y}
                    textAnchor="end"
                    dominantBaseline="middle"
                    fill={neonTheme.colors.textMuted}
                    fontSize={3}
                  >
                    {Math.round(minValue + (maxValue - minValue) * pct)}
                  </text>
                </g>
              );
            })}
          </g>
        )}

        {showArea && (
          <motion.path
            d={areaD}
            fill="url(#areaGradient)"
            initial={animated ? { opacity: 0 } : undefined}
            animate={animated ? { opacity: 1 } : undefined}
            transition={{ duration: 0.8, delay: 0.3 }}
          />
        )}

        <motion.path
          d={pathD}
          fill="none"
          stroke="url(#lineGradient)"
          strokeWidth={0.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#glow)"
          initial={animated ? { pathLength: 0, opacity: 0 } : undefined}
          animate={animated ? { pathLength: 1, opacity: 1 } : undefined}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
        />

        {showPoints && points.map((point, index) => (
          <motion.g
            key={`point-${index}`}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            onClick={() => onClick?.(data[index], index)}
            style={{ cursor: onClick ? 'pointer' : 'default' }}
          >
            <motion.circle
              cx={point.x}
              cy={point.y}
              r={hoveredIndex === index ? 2.5 : 1.5}
              fill={pointColorValue}
              filter="url(#glow)"
              initial={animated ? { scale: 0, opacity: 0 } : undefined}
              animate={animated ? { scale: 1, opacity: 1 } : undefined}
              transition={{ 
                duration: 0.3, 
                delay: animated ? 0.8 + index * 0.05 : 0,
              }}
            />
            
            <circle
              cx={point.x}
              cy={point.y}
              r={4}
              fill="transparent"
            />
          </motion.g>
        ))}

        {showLabels && points.map((point, index) => (
          index % Math.ceil(data.length / 7) === 0 && (
            <text
              key={`label-${index}`}
              x={point.x}
              y={height - 10}
              textAnchor="middle"
              fill={neonTheme.colors.textMuted}
              fontSize={3}
            >
              {point.label}
            </text>
          )
        ))}
      </svg>

      <AnimatePresence>
        {showTooltip && hoveredIndex !== null && points[hoveredIndex] && (
          <motion.div
            className="absolute z-50 pointer-events-none px-3 py-2 rounded-lg text-sm"
            style={{
              background: neonTheme.colors.backgroundCard,
              border: `1px solid ${lineColorValue}`,
              boxShadow: getGlowStyle(lineColor, 'subtle'),
              left: `${points[hoveredIndex].x}%`,
              top: points[hoveredIndex].y - 50,
              transform: 'translateX(-50%)',
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <div style={{ color: neonTheme.colors.textSecondary, fontSize: 10 }}>
              {data[hoveredIndex].label}
            </div>
            <div style={{ 
              color: lineColorValue, 
              fontFamily: neonTheme.fonts.digital,
              fontWeight: 'bold',
            }}>
              {data[hoveredIndex].value.toLocaleString()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default NeonLineChart;
