import React from 'react';
import type { Ad } from '../../types/ad';

interface AdListBlockProps {
  title?: string;
  ads: Ad[];
  layout?: string;
  onAdClick: (ad: Ad) => void;
}

export const AdListBlock: React.FC<AdListBlockProps> = ({
  title,
  ads,
  layout = 'vertical',
  onAdClick,
}) => {
  const isHorizontal = layout === 'horizontal';

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      {title && <h2 className="mb-3 text-lg font-semibold text-slate-900">{title}</h2>}
      <div
        className={
          isHorizontal
            ? 'flex gap-3 overflow-x-auto pb-2'
            : 'grid grid-cols-1 gap-3'
        }
      >
        {ads.map((ad) => (
          <button
            key={ad.id}
            onClick={() => onAdClick(ad)}
            className="min-w-[220px] rounded-xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="h-36 w-full overflow-hidden rounded-t-xl bg-slate-100">
              {ad.imageUrl ? (
                <img
                  src={ad.imageUrl}
                  alt={ad.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-slate-400">
                  Фото скоро
                </div>
              )}
            </div>
            <div className="p-3">
              <p className="text-sm font-semibold text-slate-900 line-clamp-2">
                {ad.title}
              </p>
              {ad.price !== undefined && (
                <p className="mt-1 text-sm text-primary font-semibold">
                  {ad.price.toLocaleString()} {ad.currency || 'BYN'}
                </p>
              )}
              {ad.cityCode && (
                <p className="mt-1 text-xs text-slate-500">{ad.cityCode}</p>
              )}
            </div>
          </button>
        ))}
        {!ads.length && (
          <div className="text-sm text-slate-500">Пока нет объявлений</div>
        )}
      </div>
    </div>
  );
};
