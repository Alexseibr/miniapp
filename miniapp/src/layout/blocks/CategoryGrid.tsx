import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Package } from 'lucide-react';
import { CATEGORY_ICONS } from '@/constants/categoryIcons';

interface CategoryGridProps {
  categories?: string[];
  parentSlug?: string;
  columns?: number;
  showIcons?: boolean;
  config?: {
    categories?: string[];
    parentSlug?: string;
    columns?: number;
    showIcons?: boolean;
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

  const { data: categoriesData, isLoading } = useQuery<any[]>({
    queryKey: ['/api/categories'],
  });

  // Flatten hierarchical tree to work with all categories
  const flatCategories = categoriesData ? flattenCategories(categoriesData) : [];
  let displayCategories: any[] = flatCategories;

  if (parentSlug) {
    displayCategories = displayCategories.filter(
      (cat: any) => cat.parentSlug === parentSlug
    );
  }

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
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
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
            className="card"
            style={{
              cursor: 'pointer',
              textAlign: 'center',
              padding: '16px',
              transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            data-testid={`category-item-${category.slug}`}
          >
            {showIcons && (
              <div style={{ width: '48px', height: '48px', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {iconSrc ? (
                  <img
                    src={iconSrc}
                    alt={category.name}
                    loading="lazy"
                    decoding="async"
                    style={{
                      width: '48px',
                      height: '48px',
                      objectFit: 'contain',
                    }}
                  />
                ) : (
                  <Package size={32} strokeWidth={1.5} color="#9ca3af" />
                )}
              </div>
            )}
            <div
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--color-primary)',
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
