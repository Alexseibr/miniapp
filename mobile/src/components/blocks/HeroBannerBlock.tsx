import React from 'react';
import { useTheme } from '../../theme/ThemeProvider';

interface HeroBannerBlockProps {
  title?: string;
  subtitle?: string;
  slotId?: string;
}

export const HeroBannerBlock: React.FC<HeroBannerBlockProps> = ({ title, subtitle, slotId }) => {
  const { primaryColor } = useTheme();

  return (
    <section
      className="card-surface relative overflow-hidden px-4 py-6"
      style={{ background: `linear-gradient(135deg, ${primaryColor}, #0ea5e9)` }}
    >
      <div className="relative z-10">
        <p className="text-sm uppercase tracking-wide text-white/80">Маркетплейс</p>
        <h2 className="mt-2 text-2xl font-bold text-white">{title || 'Kufar Code'}</h2>
        {subtitle && <p className="mt-2 text-base text-white/90">{subtitle}</p>}
        {slotId && (
          <p className="mt-3 text-xs text-white/80">Слот контента: {slotId}</p>
        )}
      </div>
      <div className="pointer-events-none absolute inset-0 opacity-15">
        <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/20 blur-2xl" />
        <div className="absolute -bottom-12 right-0 h-32 w-32 rounded-full bg-white/20 blur-3xl" />
      </div>
    </section>
  );
};
