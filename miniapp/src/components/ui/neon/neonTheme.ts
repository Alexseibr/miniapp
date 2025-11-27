export const neonTheme = {
  colors: {
    background: '#0A0F14',
    backgroundSecondary: '#0D1318',
    backgroundCard: 'rgba(13, 19, 24, 0.85)',
    
    neonCyan: '#00CFFF',
    neonLime: '#7CFF00',
    neonFuchsia: '#D400FF',
    neonOrange: '#FF6B00',
    neonPink: '#FF0099',
    
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255, 255, 255, 0.7)',
    textMuted: 'rgba(255, 255, 255, 0.5)',
    
    gridLine: 'rgba(0, 207, 255, 0.1)',
    border: 'rgba(0, 207, 255, 0.2)',
    
    success: '#7CFF00',
    warning: '#FFB800',
    error: '#FF4757',
    info: '#00CFFF',
  },
  
  shadows: {
    glowCyan: '0 0 15px rgba(0, 207, 255, 0.5)',
    glowLime: '0 0 15px rgba(124, 255, 0, 0.5)',
    glowFuchsia: '0 0 15px rgba(212, 0, 255, 0.5)',
    glowSoft: '0 0 25px rgba(0, 207, 255, 0.35)',
    card: '0 8px 32px rgba(0, 0, 0, 0.4)',
    cardHover: '0 12px 48px rgba(0, 207, 255, 0.2)',
  },
  
  gradients: {
    cyanToLime: 'linear-gradient(135deg, #00CFFF, #7CFF00)',
    cyanToFuchsia: 'linear-gradient(135deg, #00CFFF, #D400FF)',
    fuchsiaToOrange: 'linear-gradient(135deg, #D400FF, #FF6B00)',
    darkOverlay: 'linear-gradient(180deg, rgba(10, 15, 20, 0) 0%, rgba(10, 15, 20, 0.9) 100%)',
    barVertical: 'linear-gradient(180deg, #00CFFF, #7CFF00)',
    barHorizontal: 'linear-gradient(90deg, #00CFFF, #7CFF00)',
  },
  
  blur: {
    card: 'blur(12px)',
    background: 'blur(20px)',
  },
  
  animation: {
    pulse: 'neonPulse 2s ease-in-out infinite',
    flicker: 'neonFlicker 0.5s ease-in-out',
    glow: 'neonGlow 1.5s ease-in-out infinite alternate',
    fadeIn: 'neonFadeIn 0.3s ease-out',
  },
  
  fonts: {
    digital: "'Orbitron', 'Rajdhani', sans-serif",
    primary: "'Inter', -apple-system, sans-serif",
  },
};

export const neonGradients = {
  cyan: ['#00CFFF', '#00A3CC'],
  lime: ['#7CFF00', '#5ECC00'],
  fuchsia: ['#D400FF', '#A600CC'],
  mixed: ['#00CFFF', '#7CFF00'],
};

export const heatmapColors = {
  low: '#00CFFF',
  medium: '#7CFF00',
  high: '#D400FF',
};

export const glowLevels = {
  subtle: '0 0 8px',
  normal: '0 0 15px',
  intense: '0 0 25px',
  extreme: '0 0 40px',
};

export type NeonColor = 'cyan' | 'lime' | 'fuchsia' | 'orange' | 'pink';

export function getNeonColor(color: NeonColor): string {
  const colors: Record<NeonColor, string> = {
    cyan: neonTheme.colors.neonCyan,
    lime: neonTheme.colors.neonLime,
    fuchsia: neonTheme.colors.neonFuchsia,
    orange: neonTheme.colors.neonOrange,
    pink: neonTheme.colors.neonPink,
  };
  return colors[color];
}

export function getGlowStyle(color: NeonColor, level: keyof typeof glowLevels = 'normal'): string {
  return `${glowLevels[level]} ${getNeonColor(color)}`;
}

export default neonTheme;
