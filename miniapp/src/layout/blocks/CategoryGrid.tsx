import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';

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

export default function CategoryGrid(props: CategoryGridProps) {
  const [, setLocation] = useLocation();
  
  const categories = props.categories || props.config?.categories || [];
  const parentSlug = props.parentSlug || props.config?.parentSlug;
  const columns = props.columns || props.config?.columns || 3;
  const showIcons = props.showIcons !== undefined ? props.showIcons : (props.config?.showIcons ?? true);

  const { data: categoriesData, isLoading } = useQuery<any[]>({
    queryKey: ['/api/categories'],
  });

  let displayCategories: any[] = categoriesData || [];

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
      {displayCategories.map((category: any) => (
        <div
          key={category.slug}
          onClick={() => setLocation(`/category/${category.slug}`)}
          className="card"
          style={{
            cursor: 'pointer',
            textAlign: 'center',
            padding: '16px',
            transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          data-testid={`category-item-${category.slug}`}
        >
          {showIcons && category.iconUrl && (
            <img
              src={category.iconUrl}
              alt={category.name}
              loading="lazy"
              decoding="async"
              style={{
                width: '48px',
                height: '48px',
                margin: '0 auto 8px',
                objectFit: 'contain',
              }}
            />
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
      ))}
    </div>
  );
}
