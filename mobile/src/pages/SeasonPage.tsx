import React from 'react';
import { useParams } from 'react-router-dom';

export const SeasonPage: React.FC = () => {
  const { code } = useParams();

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-xl font-bold text-slate-900">Сезонная витрина</h1>
      <p className="text-sm text-slate-600">Подборка для сезона: {code}</p>
      <div className="card-surface p-4 text-sm text-slate-600">
        Здесь появится сервер-дривен раскладка для сезонного экрана.
      </div>
    </div>
  );
};
