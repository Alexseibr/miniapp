import React from 'react';

interface CategoryGridBlockProps {
  title?: string;
  categoryIds: string[];
  onCategoryClick: (categoryId: string) => void;
}

export const CategoryGridBlock: React.FC<CategoryGridBlockProps> = ({
  title,
  categoryIds,
  onCategoryClick,
}) => {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      {title && <h2 className="mb-3 text-lg font-semibold text-slate-900">{title}</h2>}
      <div className="grid grid-cols-3 gap-3">
        {categoryIds.map((id) => (
          <button
            key={id}
            onClick={() => onCategoryClick(id)}
            className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-xs font-medium text-slate-800 shadow-inner active:scale-[0.98]"
          >
            <span className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold uppercase">
              {id.slice(0, 2)}
            </span>
            <span className="mt-2 text-center leading-tight">{id}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
