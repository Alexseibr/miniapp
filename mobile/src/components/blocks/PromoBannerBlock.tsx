import React from 'react';

interface PromoBannerBlockProps {
  title?: string;
  subtitle?: string;
  slotId?: string;
}

export const PromoBannerBlock: React.FC<PromoBannerBlockProps> = ({ title, subtitle, slotId }) => {
  return (
    <section className="card-surface flex items-center justify-between px-4 py-4">
      <div>
        <p className="text-xs uppercase text-primary">Промо</p>
        {title && <h3 className="text-lg font-semibold text-slate-900">{title}</h3>}
        {subtitle && <p className="text-sm text-slate-600">{subtitle}</p>}
        {slotId && <p className="text-xs text-slate-400">slot: {slotId}</p>}
      </div>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">★</div>
    </section>
  );
};
