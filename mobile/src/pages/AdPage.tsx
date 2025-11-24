import React from 'react';
import { useParams } from 'react-router-dom';

export const AdPage: React.FC = () => {
  const { id } = useParams();

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-xl font-bold text-slate-900">Объявление</h1>
      <p className="text-sm text-slate-600">ID: {id}</p>
      <div className="card-surface p-4 text-sm text-slate-600">
        Здесь будет детальная карточка объявления и контакт продавца.
      </div>
    </div>
  );
};
