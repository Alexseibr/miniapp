import { create } from 'zustand';
import { CategoryNode } from '@/types';
import { fetchCategories } from '@/api/categories';

interface CategoriesState {
  categories: CategoryNode[];
  loading: boolean;
  error: string | null;
  loadCategories: () => Promise<void>;
  getCategoryBySlug: (slug: string) => CategoryNode | null;
}

export const useCategoriesStore = create<CategoriesState>((set, get) => ({
  categories: [],
  loading: true,
  error: null,

  loadCategories: async () => {
    const { categories, loading } = get();
    if (categories.length > 0 && !loading) {
      return;
    }

    set({ loading: true, error: null });
    try {
      const data = await fetchCategories();
      set({ categories: data, loading: false });
    } catch (error) {
      console.error('Failed to load categories:', error);
      set({ error: 'Не удалось загрузить категории', loading: false });
    }
  },

  getCategoryBySlug: (slug: string): CategoryNode | null => {
    const { categories } = get();
    
    const findCategory = (cats: CategoryNode[]): CategoryNode | null => {
      for (const cat of cats) {
        if (cat.slug === slug) {
          return cat;
        }
        if (cat.subcategories && cat.subcategories.length > 0) {
          const found = findCategory(cat.subcategories);
          if (found) return found;
        }
      }
      return null;
    };

    return findCategory(categories);
  },
}));
