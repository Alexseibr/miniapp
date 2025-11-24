import React from 'react';

interface HeroBannerBlockProps {
  title?: string;
  subtitle?: string;
  slotId?: string;
}

export const HeroBannerBlock: React.FC<HeroBannerBlockProps> = ({
  title,
  subtitle,
  slotId,
}) => {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-primary to-blue-500 text-white p-5 shadow-lg">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wide opacity-80">{slotId}</p>
          <h1 className="text-2xl font-semibold leading-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-sm opacity-90">{subtitle}</p>}
        </div>
        <div className="h-16 w-16 rounded-full bg-white/20" aria-hidden>
          <div className="h-full w-full rounded-full bg-white/30" />
        </div>
      </div>
    </div>
  );
};
