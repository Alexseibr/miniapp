import React from 'react';

interface MapBlockProps {
  title?: string;
  source?: string;
}

export const MapBlock: React.FC<MapBlockProps> = ({ title, source }) => {
  return (
    <section className="card-surface px-4 py-4">
      <div className="flex items-center justify-between">
        {title && <h3 className="text-lg font-semibold text-slate-900">{title}</h3>}
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{source || 'nearby'}</span>
      </div>
      <div className="mt-3 flex h-48 items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-500">
        Карта появится позже
      </div>
    </section>
  );
};
