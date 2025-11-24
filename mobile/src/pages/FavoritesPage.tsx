import React from 'react';

export const FavoritesPage: React.FC = () => {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-xl font-bold text-slate-900">Избранное</h1>
      <div className="card-surface p-4 text-sm text-slate-600">
        Избранные объявления будут храниться в localStorage. Реализацию добавим позже.
      </div>
    </div>
  );
};
