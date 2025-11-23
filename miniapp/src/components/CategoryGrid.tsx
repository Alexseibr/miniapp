import { Link } from 'react-router-dom';
import { CategoryNode } from '@/types';

interface Props {
  categories: CategoryNode[];
}

export default function CategoryGrid({ categories }: Props) {
  if (!categories.length) {
    return <p>Категории пока не загружены.</p>;
  }

  return (
    <section className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
      {categories.map((category) => (
        <Link
          key={category.slug}
          to={`/feed?categoryId=${encodeURIComponent(category.slug)}`}
          className="card"
          style={{ textAlign: 'left' }}
        >
          {category.icon && <div style={{ fontSize: '1.8rem' }}>{category.icon}</div>}
          <h3 style={{ margin: '8px 0 4px', fontSize: '1rem' }}>{category.name}</h3>
          <p style={{ margin: 0, color: '#475467', fontSize: '0.85rem' }}>
            {category.description || 'Объявления этой категории.'}
          </p>
        </Link>
      ))}
    </section>
  );
}
