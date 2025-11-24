import React from 'react';
import { useParams } from 'react-router-dom';

export const AdPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold text-slate-900">Объявление</h1>
      <p className="mt-2 text-sm text-slate-600">Карточка объявления #{id} появится здесь.</p>
    </div>
  );
};
