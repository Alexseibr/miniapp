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

  const getCategoryIcon = (category: CategoryNode) => {
    let iconSrc = category.icon3d || CATEGORY_ICONS[category.slug] || null;
    // Convert icon3d path to absolute URL if it starts with /attached_assets
    if (iconSrc && iconSrc.startsWith('/attached_assets/')) {
      iconSrc = `${window.location.origin}${iconSrc}`;
    }
    return iconSrc;
  };

  const getCategoryLink = (category: CategoryNode): string => {
    if (category.isLeaf) {
      return `/feed?categoryId=${encodeURIComponent(category.slug)}`;
    }
    const hasSubcategories = category.subcategories && category.subcategories.length > 0;
    if (hasSubcategories) {
      return `/category/${encodeURIComponent(category.slug)}`;
    }
    return `/feed?categoryId=${encodeURIComponent(category.slug)}`;
  };

  return (
    <section
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(140px, 100%), 1fr))',
        gap: '12px',
      }}
    >
      {categories.map((category) => (
        <Link
          key={category.slug}
          to={getCategoryLink(category)}
          data-testid={`category-card-${category.slug}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            padding: '16px 12px',
            borderRadius: '16px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            textDecoration: 'none',
            transition: 'all 0.2s ease',
            minHeight: '140px',
            height: '100%',
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
            {getCategoryIcon(category) ? (
              <img
                src={getCategoryIcon(category)!}
                alt={category.name}
                loading="lazy"
                decoding="async"
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
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word',
              hyphens: 'auto',
            }}
          >
            {category.name}
          </span>
        </Link>
      ))}
    </section>
  );
}
