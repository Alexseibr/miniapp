import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';
import { CategoryNode } from '@/types';
import { CATEGORY_ICONS } from '@/constants/categoryIcons';

interface Props {
  categories: CategoryNode[];
  selectedSlug?: string | null;
  onCategoryClick?: (slug: string | null) => void;
}

export default function CategoryScroll({ categories, selectedSlug, onCategoryClick }: Props) {
  if (!categories.length) {
    return null;
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
        const isSelected = selectedSlug === category.slug;
        
        const iconElement = (
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 20,
              backgroundColor: isSelected ? 'var(--color-accent-highlight)' : '#F5F7FA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 8,
              boxShadow: isSelected ? '0 2px 8px rgba(59, 115, 252, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.06)',
              overflow: 'hidden',
              transition: 'all 150ms ease',
              border: isSelected ? '2px solid var(--color-accent-highlight)' : '2px solid transparent',
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
        );

        const labelElement = (
          <span
            style={{
              fontSize: '0.75rem',
              textAlign: 'center',
              color: isSelected ? 'var(--color-accent-highlight)' : '#111827',
              fontWeight: isSelected ? 600 : 500,
              lineHeight: 1.2,
            }}
          >
            {category.name}
          </span>
        );

        // If onCategoryClick is provided, render as button
        if (onCategoryClick) {
          return (
            <button
              key={category.slug}
              onClick={() => onCategoryClick(category.slug)}
              data-testid={`category-${category.slug}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                minWidth: 100,
                textDecoration: 'none',
                color: 'inherit',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
              }}
            >
              {iconElement}
              {labelElement}
            </button>
          );
        }

        // Otherwise render as Link
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
            {iconElement}
            {labelElement}
          </Link>
        );
      })}
    </div>
  );
}
