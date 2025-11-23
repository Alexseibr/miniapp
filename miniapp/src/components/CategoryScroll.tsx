import { Link } from 'react-router-dom';
import { CategoryNode } from '@/types';

interface Props {
  categories: CategoryNode[];
}

export default function CategoryScroll({ categories }: Props) {
  if (!categories.length) {
    return null;
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        overflowX: 'auto',
        padding: '12px 0',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
      className="category-scroll"
    >
      {categories.map((category) => (
        <Link
          key={category.slug}
          to={`/feed?categoryId=${encodeURIComponent(category.slug)}`}
          data-testid={`category-${category.slug}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: 100,
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 8,
              backgroundColor: '#f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              marginBottom: 8,
            }}
          >
            {category.icon}
          </div>
          <span
            style={{
              fontSize: '0.85rem',
              textAlign: 'center',
              color: '#111827',
              fontWeight: 500,
              lineHeight: 1.2,
            }}
          >
            {category.name}
          </span>
        </Link>
      ))}
    </div>
  );
}
