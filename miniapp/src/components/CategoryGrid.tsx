import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';
import { CategoryNode } from '@/types';
import { CATEGORY_ICONS } from '@/constants/categoryIcons';

interface Props {
  categories: CategoryNode[];
}

const CategoryGrid = memo(({ categories }: Props) => {
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
      className="category-grid icons-only"
      style={{
        display: 'grid',
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
            justifyContent: 'center',
            padding: '12px',
            borderRadius: '16px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            textDecoration: 'none',
            transition: 'all 0.2s ease',
            aspectRatio: '1',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
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
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)',
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
                  imageRendering: 'crisp-edges',
                }}
                data-testid={`category-icon-${category.slug}`}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    const fallback = document.createElement('div');
                    fallback.style.cssText = 'display:flex;align-items:center;justify-content:center;width:100%;height:100%;';
                    fallback.innerHTML = '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>';
                    parent.appendChild(fallback);
                  }
                }}
              />
            ) : (
              <Package size={36} strokeWidth={1.5} color="#9ca3af" data-testid={`category-icon-fallback-${category.slug}`} />
            )}
          </div>
          <span
            className="category-name"
            style={{
              fontSize: '0.8125rem',
              textAlign: 'center',
              color: '#111827',
              fontWeight: 500,
              lineHeight: 1.25,
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word',
              maxWidth: '100%',
            }}
          >
            {category.name}
          </span>
        </Link>
      ))}
    </section>
  );
});

CategoryGrid.displayName = 'CategoryGrid';

export default CategoryGrid;
