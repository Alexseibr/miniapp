import React from 'react';
import type { Ad } from '../../types/ad';

interface AdListBlockProps {
  title?: string;
  ads: Ad[];
  layout?: 'horizontal' | 'vertical' | 'grid' | string;
  onAdClick: (ad: Ad) => void;
}

export const AdListBlock: React.FC<AdListBlockProps> = ({ title, ads, layout = 'vertical', onAdClick }) => {
  const isHorizontal = layout === 'horizontal';
  const containerClass = isHorizontal
    ? 'flex gap-3 overflow-x-auto pb-2'
    : layout === 'grid'
      ? 'grid grid-cols-2 gap-3'
      : 'flex flex-col gap-3';

  return (
    <section className="card-surface px-4 py-4">
      {title && <h3 className="text-lg font-semibold text-slate-900">{title}</h3>}
      {ads.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">Пока нет объявлений</p>
      ) : (
        <div className={`mt-3 ${containerClass}`}>
          {ads.map((ad) => (
            <button
              key={ad.id}
              className="min-w-[180px] rounded-xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-card"
              onClick={() => onAdClick(ad)}
            >
              {ad.imageUrl ? (
                <img
                  src={ad.imageUrl}
                  alt={ad.title}
                  className="h-32 w-full rounded-t-xl object-cover"
                />
              ) : (
                <div className="flex h-32 w-full items-center justify-center rounded-t-xl bg-slate-100 text-slate-400">
                  Фото
                </div>
              )}
              <div className="p-3">
                <p className="line-clamp-2 text-sm font-semibold text-slate-900">{ad.title}</p>
                {ad.price !== undefined && (
                  <p className="mt-1 text-sm font-bold text-primary">
                    {ad.price}
                    {ad.currency && <span className="text-xs text-slate-500"> {ad.currency}</span>}
                  </p>
                )}
                {ad.location && <p className="mt-1 text-xs text-slate-500">{ad.location}</p>}
                {ad.distanceKm !== undefined && (
                  <p className="mt-1 text-xs text-slate-500">{ad.distanceKm.toFixed(1)} км</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
};
