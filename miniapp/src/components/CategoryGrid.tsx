import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';
import { CategoryNode } from '@/types';
import { CATEGORY_ICONS } from '@/constants/categoryIcons';

interface Props {
  categories: CategoryNode[];
}

export default function CategoryGrid({ categories }: Props) {
  if (!categories.length) {
    return <p>Категории пока не загружены.</p>;
  }

  const getCategoryIcon = (categorySlug: string) => {
    return CATEGORY_ICONS[categorySlug] || null;
  };

  return (
    <section
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '12px',
        padding: '0 16px',
      }}
    >
      {categories.map((category) => (
        <Link
          key={category.slug}
          to={`/feed?categoryId=${encodeURIComponent(category.slug)}`}
          data-testid={`category-card-${category.slug}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px 12px',
            borderRadius: '16px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            textDecoration: 'none',
            transition: 'all 0.2s ease',
            minHeight: '140px',
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.97)';
            e.currentTarget.style.backgroundColor = '#F9FAFB';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.backgroundColor = '#FFFFFF';
          }}
          onTouchStart={(e) => {
            e.currentTarget.style.transform = 'scale(0.97)';
            e.currentTarget.style.backgroundColor = '#F9FAFB';
          }}
          onTouchEnd={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.backgroundColor = '#FFFFFF';
          }}
        >
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '16px',
              backgroundColor: '#F5F7FA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px',
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
              <Package size={36} strokeWidth={1.5} color="#9ca3af" data-testid={`category-icon-fallback-${category.slug}`} />
            )}
          </div>
          <span
            style={{
              fontSize: '0.875rem',
              textAlign: 'center',
              color: '#111827',
              fontWeight: 500,
              lineHeight: 1.3,
            }}
          >
            {category.name}
          </span>
        </Link>
      ))}
    </section>
  );
}
