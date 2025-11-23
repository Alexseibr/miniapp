import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import CategoryGrid from '@/components/CategoryGrid';
import { fetchCategories } from '@/api/categories';
import { CategoryNode } from '@/types';
import EmptyState from '@/widgets/EmptyState';
import { getTelegramWebApp } from '@/utils/telegram';

export default function HomePage() {
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [debug, setDebug] = useState<string>('');

  useEffect(() => {
    const tg = getTelegramWebApp();
    console.log('🔍 Telegram WebApp:', tg);
    console.log('🔍 InitData:', tg?.initData);
    console.log('🔍 User:', tg?.initDataUnsafe?.user);
    
    setDebug(`WebApp: ${tg ? 'загружен' : 'не найден'}, User: ${tg?.initDataUnsafe?.user?.first_name || 'нет'}`);
    
    async function loadCategories() {
      try {
        setLoading(true);
        console.log('📦 Загружаем категории...');
        const list = await fetchCategories();
        console.log('✅ Категории загружены:', list.length);
        setCategories(list);
      } catch (error) {
        console.error('❌ Ошибка загрузки категорий:', error);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    }
    loadCategories();
  }, []);

  return (
    <div style={{ paddingBottom: '80px' }}>
      <Header />
      <div style={{ paddingTop: '16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
            <h3 style={{ margin: '0 0 8px' }}>Загружаем категории</h3>
            <p style={{ color: '#6b7280', margin: 0 }}>Подождите несколько секунд</p>
          </div>
        ) : categories.length > 0 ? (
          <CategoryGrid categories={categories} />
        ) : (
          <EmptyState title="Категории не найдены" description="Попробуйте обновить страницу" />
        )}
      </div>

      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#FFFFFF',
          borderTop: '1px solid #E5E7EB',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.05)',
          zIndex: 50,
        }}
        data-testid="bottom-bar"
      >
        <div style={{ display: 'flex', flexDirection: 'column' }} data-testid="bottom-bar-branding">
          <span style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '2px' }} data-testid="text-marketplace-label">
            Маркетплейс
          </span>
          <span style={{ fontSize: '1rem', fontWeight: 600, color: '#111827' }} data-testid="text-brand-name">
            KETMAR Market
          </span>
        </div>
        <div
          style={{
            backgroundColor: '#4F46E5',
            color: '#FFFFFF',
            padding: '10px 20px',
            borderRadius: '12px',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
          data-testid="badge-category-count"
        >
          {categories.length} категорий
        </div>
      </div>
    </div>
  );
}
