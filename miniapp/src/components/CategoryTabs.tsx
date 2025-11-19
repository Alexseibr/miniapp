import './CategoryTabs.css';
import { CategoryNode } from '@/types';

interface Props {
  categories: CategoryNode[];
  activeCategory?: string;
  activeSubcategory?: string;
  onCategoryChange: (slug: string) => void;
  onSubcategoryChange: (slug: string) => void;
}

export default function CategoryTabs({
  categories,
  activeCategory,
  activeSubcategory,
  onCategoryChange,
  onSubcategoryChange,
}: Props) {
  const active = activeCategory || categories[0]?.slug;
  const subcategories = categories.find((c) => c.slug === active)?.subcategories || [];

  return (
    <div className="category-tabs">
      <div className="category-scroll">
        {categories.map((cat) => (
          <button
            key={cat.slug}
            type="button"
            className={cat.slug === active ? 'tab active' : 'tab'}
            onClick={() => onCategoryChange(cat.slug)}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className="subcategory-row">
        <button
          type="button"
          className={!activeSubcategory ? 'chip active' : 'chip'}
          onClick={() => onSubcategoryChange('')}
        >
          Все
        </button>
        {subcategories.map((sub) => (
          <button
            key={sub.slug}
            type="button"
            className={sub.slug === activeSubcategory ? 'chip active' : 'chip'}
            onClick={() => onSubcategoryChange(sub.slug)}
          >
            {sub.name}
          </button>
        ))}
      </div>
    </div>
  );
}
