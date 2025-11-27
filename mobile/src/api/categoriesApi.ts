import { apiClient } from './apiClient';

/**
 * Структура категории под дерево.
 * Если в твоём API другие поля (например, _id вместо id, title вместо name),
 * просто поправь интерфейс и mapping в getCategoriesTree().
 */
export interface CategoryNode {
  id: string;          // внутренний идентификатор категории (из API)
  slug: string;        // то, что потом пойдёт в categoryId в /ads
  name: string;        // человекочитаемое название
  iconUrl?: string;    // 3D-иконка, если есть
  parentId?: string | null;
  children?: CategoryNode[];
}

export interface CategoriesResponse {
  items: CategoryNode[];
}

/**
 * Возвращает дерево категорий.
 * GET /categories
 * Query:
 *  - includeAll=false
 *  - flat=false (по умолчанию дерево)
 */
export const categoriesApi = {
  async getCategoriesTree(): Promise<CategoryNode[]> {
    const res = await apiClient.get<CategoriesResponse>('/categories', {
      params: {
        includeAll: false,
        flat: false,
      },
    });

    // если структура в API уже такая, как в интерфейсе — можно сразу вернуть res.data.items
    // здесь оставим hook для маппинга, если надо:
    const items = res.data.items || [];

    // пример на случай, если API отдаёт другие поля:
    // const normalized = items.map(normalizeCategoryNode);
    // return normalized;

    return items;
  },
};

// Если нужно нормализовать, можно добавить такую функцию:
// function normalizeCategoryNode(raw: any): CategoryNode {
//   return {
//     id: raw.id || raw._id || raw.slug,
//     slug: raw.slug,
//     name: raw.name || raw.title || raw.displayName,
//     iconUrl: raw.icon3dUrl || raw.iconUrl,
//     parentId: raw.parentId ?? null,
//     children: raw.children?.map(normalizeCategoryNode) ?? [],
//   };
// }
