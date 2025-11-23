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
    <div>
      <Header />
      <div className="container">
        <h2 style={{ marginTop: 0 }}>🛍️ KETMAR Market</h2>
        <p style={{ marginBottom: 16, color: '#475467' }}>
          Локальная витрина объявлений от фермеров и ремесленников
        </p>
        
        {debug && (
          <div style={{ 
            padding: '12px', 
            background: '#f0f9ff', 
            borderRadius: '8px', 
            marginBottom: '16px',
            fontSize: '0.85rem',
            color: '#0369a1'
          }}>
            🔍 {debug}
          </div>
        )}

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
    </div>
  );
}
