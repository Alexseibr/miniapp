import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';
import { CategoryNode } from '@/types';
import { CATEGORY_ICONS } from '@/constants/categoryIcons';

interface Props {
  categories: CategoryNode[];
}

export default function CategoryScroll({ categories }: Props) {
  if (!categories.length) {
    return null;
  }

  const getCategoryIcon = (categorySlug: string) => {
    return CATEGORY_ICONS[categorySlug] || null;
  };

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
              borderRadius: 20,
              backgroundColor: '#F5F7FA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 8,
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
              overflow: 'hidden',
            }}
          >
            {getCategoryIcon(category.slug) ? (
              <img
                src={getCategoryIcon(category.slug)!}
                alt={category.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
                data-testid={`category-icon-${category.slug}`}
              />
            ) : (
              <Package size={40} strokeWidth={1.5} color="#9ca3af" data-testid={`category-icon-fallback-${category.slug}`} />
            )}
          </div>
          <span
            style={{
              fontSize: '0.75rem',
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
