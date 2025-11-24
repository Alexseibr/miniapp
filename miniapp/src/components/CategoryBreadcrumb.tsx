import { useMemo } from 'react';
import { Link } from 'wouter';
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
        padding: '12px 16px',
        overflowX: 'auto',
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
      }}
      data-testid="breadcrumb-navigation"
    >
      {breadcrumbPath.map((category: CategoryNode, index: number) => {
        const isLast = index === breadcrumbPath.length - 1;
        const iconSrc = getCategoryIcon(category);
        
        return (
          <div key={category.slug} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {index > 0 && <ChevronRight size={16} color="#9ca3af" />}
            
            <Link href={`/miniapp/category/${category.slug}`}>
              <a
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 12px',
                  borderRadius: 8,
                  backgroundColor: isLast ? '#f3f4f6' : 'transparent',
                  textDecoration: 'none',
                  color: isLast ? '#1f2937' : '#6b7280',
                  fontSize: 14,
                  fontWeight: isLast ? 600 : 500,
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                }}
                data-testid={`breadcrumb-${category.slug}`}
              >
                {iconSrc ? (
                  <img 
                    src={iconSrc} 
                    alt={category.name}
                    style={{ 
                      width: 24, 
                      height: 24, 
                      objectFit: 'contain',
                      flexShrink: 0 
                    }}
                  />
                ) : (
                  <Package size={20} color={isLast ? '#3B73FC' : '#9ca3af'} style={{ flexShrink: 0 }} />
                )}
                <span>{category.name}</span>
              </a>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
