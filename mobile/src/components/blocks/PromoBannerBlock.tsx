import React from 'react';

interface PromoBannerBlockProps {
  title?: string;
  subtitle?: string;
  slotId?: string;
}

export const PromoBannerBlock: React.FC<PromoBannerBlockProps> = ({
  title,
  subtitle,
  slotId,
}) => {
  return (
    <div className="rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 p-4 text-white shadow-md">
      <div className="flex items-center justify-between gap-3">
        <div>
          {slotId && <p className="text-[10px] uppercase opacity-80">{slotId}</p>}
          <h3 className="text-lg font-semibold">{title}</h3>
          {subtitle && <p className="text-sm opacity-90">{subtitle}</p>}
        </div>
        <div className="h-12 w-12 rounded-full bg-white/30" aria-hidden />
      </div>
    </div>
  );
};
