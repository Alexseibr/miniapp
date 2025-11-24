import React from 'react';

interface MapBlockProps {
  title?: string;
  source?: string;
}

export const MapBlock: React.FC<MapBlockProps> = ({ title, source }) => {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      {title && <h2 className="mb-3 text-lg font-semibold text-slate-900">{title}</h2>}
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-slate-500">
        Карта появится здесь ({source || 'source'})
      </div>
    </div>
  );
};
