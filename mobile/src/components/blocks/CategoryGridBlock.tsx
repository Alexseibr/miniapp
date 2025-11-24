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
    <section className="card-surface px-4 py-4">
      {title && <h3 className="text-lg font-semibold text-slate-900">{title}</h3>}
      <div className="mt-3 grid grid-cols-2 gap-3">
        {categoryIds.map((categoryId) => (
          <button
            key={categoryId}
            onClick={() => onCategoryClick(categoryId)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left text-sm font-semibold text-slate-800 transition hover:border-primary hover:bg-white"
          >
            <span className="h-10 w-10 rounded-full bg-primary/10 text-center text-base font-bold uppercase text-primary">
              {categoryId.slice(0, 2)}
            </span>
            <span className="flex-1 capitalize">{categoryId.replace('_', ' ')}</span>
          </button>
        ))}
      </div>
    </section>
  );
};
