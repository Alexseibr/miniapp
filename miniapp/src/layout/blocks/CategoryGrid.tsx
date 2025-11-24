import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Package } from 'lucide-react';
import { CATEGORY_ICONS } from '@/constants/categoryIcons';

interface CategoryGridProps {
  categories?: string[];
  parentSlug?: string;
  columns?: number;
  showIcons?: boolean;
  showOnlyTopLevel?: boolean;
  config?: {
    categories?: string[];
    parentSlug?: string;
    columns?: number;
    showIcons?: boolean;
    showOnlyTopLevel?: boolean;
  };
}

// Flatten hierarchical tree to array
function flattenCategories(tree: any[]): any[] {
  const result: any[] = [];
  
  function traverse(nodes: any[]) {
    for (const node of nodes) {
      result.push(node);
      if (node.subcategories && node.subcategories.length > 0) {
        traverse(node.subcategories);
      }
    }
  }
  
  traverse(tree);
  return result;
}

export default function CategoryGrid(props: CategoryGridProps) {
  const navigate = useNavigate();
  
  const categories = props.categories || props.config?.categories || [];
  const parentSlug = props.parentSlug || props.config?.parentSlug;
  const columns = props.columns || props.config?.columns || 3;
  const showIcons = props.showIcons !== undefined ? props.showIcons : (props.config?.showIcons ?? true);
  const showOnlyTopLevel = props.showOnlyTopLevel ?? props.config?.showOnlyTopLevel ?? false;

  const { data: categoriesData, isLoading } = useQuery<any[]>({
    queryKey: ['/api/categories'],
  });

  // Flatten hierarchical tree to work with all categories
  const flatCategories = categoriesData ? flattenCategories(categoriesData) : [];
  let displayCategories: any[] = flatCategories;

  // Фильтр: только категории верхнего уровня
  if (showOnlyTopLevel) {
    displayCategories = displayCategories.filter(
      (cat: any) => !cat.parentSlug || cat.parentSlug === null
    );
  }

  // Фильтр: по родительской категории
  if (parentSlug) {
    displayCategories = displayCategories.filter(
      (cat: any) => cat.parentSlug === parentSlug
    );
  }

  // Фильтр: конкретные категории по slug
  if (categories.length > 0) {
    displayCategories = displayCategories.filter((cat: any) =>
      categories.includes(cat.slug)
    );
  }

  if (isLoading) {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: '12px',
        }}
      >
        {[...Array(6)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: '100px', borderRadius: 'var(--radius-md)' }} />
        ))}
      </div>
    );
  }

  if (!displayCategories || displayCategories.length === 0) {
    return null;
  }

  return (
    <div
      className="category-grid"
      style={{
        display: 'grid',
        gap: '12px',
      }}
      data-testid="category-grid"
    >
      {displayCategories.map((category: any) => {
        const getCategoryLink = () => {
          if (category.isLeaf) {
            return `/feed?categoryId=${encodeURIComponent(category.slug)}`;
          }
          return `/category/${encodeURIComponent(category.slug)}`;
        };

        // Convert icon3d path to absolute URL if it starts with /attached_assets
        let iconSrc = category.icon3d || CATEGORY_ICONS[category.slug] || null;
        if (iconSrc && iconSrc.startsWith('/attached_assets/')) {
          // Use window.location.origin to build absolute URL
          iconSrc = `${window.location.origin}${iconSrc}`;
        }

        return (
          <div
            key={category.slug}
            onClick={() => navigate(getCategoryLink())}
            style={{
              cursor: 'pointer',
              textAlign: 'center',
              padding: '16px 12px',
              borderRadius: '16px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              minHeight: '140px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            }}
            data-testid={`category-item-${category.slug}`}
            onTouchStart={(e) => {
              e.currentTarget.style.transform = 'scale(0.97)';
              e.currentTarget.style.backgroundColor = '#F9FAFB';
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.backgroundColor = '#FFFFFF';
            }}
          >
            {showIcons && (
              <div style={{ width: '72px', height: '72px', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px', backgroundColor: '#F5F7FA', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)', overflow: 'hidden' }}>
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
                  />
                ) : (
                  <Package size={36} strokeWidth={1.5} color="#9ca3af" />
                )}
              </div>
            )}
            <div
              style={{
                fontSize: '0.8125rem',
                fontWeight: 500,
                color: '#111827',
                lineHeight: 1.25,
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                wordBreak: 'break-word',
                maxWidth: '100%',
              }}
            >
              {category.name}
            </div>
          </div>
        );
      })}
    </div>
  );
}
