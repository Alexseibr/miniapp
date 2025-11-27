import { apiClient } from './apiClient';

export interface CategoryNode {
  id: string; // _id для корня, slug для детей
  slug: string; // slug категории
  name: string; // название
  icon?: string; // 3D-иконка
  order?: number;
  adCount?: number;
  parentSlug?: string | null;
  children?: CategoryNode[];
}

interface RawCategory {
  _id?: string;
  slug: string;
  name: string;
  icon?: string;
  order?: number;
  adCount?: number;
  parentSlug?: string;
  children?: RawCategory[];
}

interface CategoriesResponse {
  items: RawCategory[];
}

function normalizeCategoryNode(raw: RawCategory, parentSlug: string | null = null): CategoryNode {
  const id = raw._id || raw.slug;

  return {
    id,
    slug: raw.slug,
    name: raw.name,
    icon: raw.icon,
    order: raw.order,
    adCount: raw.adCount,
    parentSlug: raw.parentSlug ?? parentSlug,
    children: raw.children?.map((child) => normalizeCategoryNode(child, raw.slug)) ?? [],
  };
}

export const categoriesApi = {
  async getCategoriesTree(): Promise<CategoryNode[]> {
    const res = await apiClient.get<CategoriesResponse>('/categories', {
      params: {
        includeAll: false,
        flat: false,
      },
    });

    const items = res.data.items || [];
    return items.map((raw) => normalizeCategoryNode(raw));
  },
};
