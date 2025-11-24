import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Package } from 'lucide-react';
import { CategoryNode } from '@/types';
import { CATEGORY_ICONS } from '@/constants/categoryIcons';

interface CategoryBreadcrumbProps {
  categorySlug: string;
  categories: CategoryNode[];
}

function flattenCategories(tree: CategoryNode[]): CategoryNode[] {
  const result: CategoryNode[] = [];
  function traverse(nodes: CategoryNode[]): void {
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

function buildBreadcrumbPath(categorySlug: string, categories: CategoryNode[]): CategoryNode[] {
  const flatCategories = flattenCategories(categories);
  const categoryMap = new Map<string, CategoryNode>(flatCategories.map((c: CategoryNode) => [c.slug, c]));
  
  const currentCategory = categoryMap.get(categorySlug);
  if (!currentCategory) return [];
  
  const path: CategoryNode[] = [currentCategory];
  let current = currentCategory;
  
  while (current.parentSlug) {
    const parent = categoryMap.get(current.parentSlug);
    if (!parent) break;
    path.unshift(parent);
    current = parent;
  }
  
  return path;
}

function getCategoryIcon(category: CategoryNode): string | null {
  let iconSrc = category.icon3d || CATEGORY_ICONS[category.slug] || null;
  if (iconSrc && iconSrc.startsWith('/attached_assets/')) {
    if (typeof window !== 'undefined') {
      iconSrc = `${window.location.origin}${iconSrc}`;
    }
  }
  return iconSrc;
}

export default function CategoryBreadcrumb({ categorySlug, categories }: CategoryBreadcrumbProps) {
  const breadcrumbPath = useMemo(() => buildBreadcrumbPath(categorySlug, categories), [categorySlug, categories]);
  
  if (breadcrumbPath.length === 0) return null;
  
  return (
    <div 
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 8, 
        overflowX: 'auto',
        paddingBottom: '4px',
      }}
      data-testid="breadcrumb-navigation"
    >
      {breadcrumbPath.map((category: CategoryNode, index: number) => {
        const isLast = index === breadcrumbPath.length - 1;
        const iconSrc = getCategoryIcon(category);
        
        return (
          <div key={category.slug} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {index > 0 && <ChevronRight size={16} color="#cbd5e1" />}
            
            <Link 
              to={`/category/${category.slug}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                borderRadius: 12,
                background: isLast 
                  ? 'linear-gradient(135deg, #3B73FC 0%, #5B8EFF 100%)'
                  : '#ffffff',
                border: isLast ? 'none' : '1.5px solid #e5e7eb',
                boxShadow: isLast ? '0 4px 12px rgba(59, 115, 252, 0.25)' : '0 2px 4px rgba(0, 0, 0, 0.05)',
                textDecoration: 'none',
                color: isLast ? '#ffffff' : '#1f2937',
                fontSize: 14,
                fontWeight: isLast ? 600 : 500,
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
              }}
              data-testid={`breadcrumb-${category.slug}`}
              onMouseEnter={(e) => {
                if (!isLast) {
                  e.currentTarget.style.borderColor = '#3B73FC';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(59, 115, 252, 0.15)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLast) {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
                {iconSrc ? (
                  <img 
                    src={iconSrc} 
                    alt={category.name}
                    style={{ 
                      width: 24, 
                      height: 24, 
                      objectFit: 'contain',
                      flexShrink: 0,
                      filter: isLast ? 'brightness(0) invert(1)' : 'none'
                    }}
                  />
                ) : (
                  <Package size={20} color={isLast ? '#ffffff' : '#3B73FC'} style={{ flexShrink: 0 }} />
                )}
                <span>{category.name}</span>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
