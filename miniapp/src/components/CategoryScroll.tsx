import { Link } from 'wouter';
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

  const getCategoryIcon = (category: CategoryNode) => {
    if (category.icon3d) {
      return category.icon3d;
    }
    return CATEGORY_ICONS[category.slug] || null;
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
      {categories.map((category) => {
        const iconSrc = getCategoryIcon(category);
        
        return (
          <Link
            key={category.slug}
            to={getCategoryLink(category)}
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
              {iconSrc ? (
                <img
                  src={iconSrc}
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
        );
      })}
    </div>
  );
}
