import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CategoryNode } from '@/types';
import { fetchCategories } from '@/api/categories';

interface CategoriesState {
  categories: CategoryNode[];
  loading: boolean;
  error: string | null;
  lastFetch: number | null;
  loadCategories: (force?: boolean) => Promise<void>;
  getCategoryBySlug: (slug: string) => CategoryNode | null;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 минут

export const useCategoriesStore = create<CategoriesState>()(
  persist(
    (set, get) => ({
      categories: [],
      loading: false,
      error: null,
      lastFetch: null,

      loadCategories: async (force = false) => {
        const { categories, loading, lastFetch } = get();
        
        const isCacheValid = lastFetch && (Date.now() - lastFetch < CACHE_DURATION);
        
        if (!force && categories.length > 0 && isCacheValid) {
          return;
        }

        if (loading) {
          return;
        }

        set({ loading: true, error: null });
        try {
          const data = await fetchCategories();
          set({ 
            categories: data, 
            loading: false, 
            lastFetch: Date.now() 
          });
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
    }),
    {
      name: 'categories-cache',
      partialize: (state) => ({ 
        categories: state.categories,
        lastFetch: state.lastFetch 
      }),
    }
  )
);
