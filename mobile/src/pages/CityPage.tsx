import React from 'react';
import { useResolvedCity } from '../hooks/useResolvedCity';

const popularCities = ['minsk', 'brest', 'vitebsk', 'gomel', 'grodno'];

export const CityPage: React.FC = () => {
  const { cityCode, setCityCode } = useResolvedCity();

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-xl font-bold text-slate-900">Выбор города</h1>
      <p className="text-sm text-slate-600">Текущий город: {cityCode}</p>
      <div className="card-surface p-4">
        <p className="text-sm font-semibold text-slate-800">Популярные города</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {popularCities.map((city) => (
            <button
              key={city}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm font-semibold capitalize text-slate-800 hover:border-primary"
              onClick={() => setCityCode(city)}
            >
              {city}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
