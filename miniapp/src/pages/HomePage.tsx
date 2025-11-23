import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import CategoryGrid from '@/components/CategoryGrid';
import { fetchCategories } from '@/api/categories';
import { CategoryNode } from '@/types';
import EmptyState from '@/widgets/EmptyState';

export default function HomePage() {
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCategories() {
      try {
        setLoading(true);
        const list = await fetchCategories();
        setCategories(list);
      } catch (error) {
        console.error('load categories error', error);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    }
    loadCategories();
  }, []);

  return (
    <div>
      <Header />
      <div className="container">
        <h2 style={{ marginTop: 0 }}>Категории товаров</h2>
        <p style={{ marginBottom: 16, color: '#475467' }}>
          Локальная витрина объявлений от фермеров и ремесленников
        </p>

        {loading ? (
          <EmptyState title="Загружаем категории" description="Подождите несколько секунд" />
        ) : categories.length > 0 ? (
          <CategoryGrid categories={categories} />
        ) : (
          <EmptyState title="Категории не найдены" description="Попробуйте обновить страницу" />
        )}
      </div>
    </div>
  );
}
