import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import RenderBlocks from '@/layout/RenderBlocks.tsx';
import EmptyState from '@/widgets/EmptyState';
import { useUserStore } from '@/store/useUserStore';
import { useEffect } from 'react';

export default function HomePage() {
  const { cityCode, initialize, status: userStatus } = useUserStore();
  
  useEffect(() => {
    initialize();
  }, [initialize]);

  const currentCityCode = cityCode || 'brest';
  
  const { data: layoutData, isLoading } = useQuery<any>({
    queryKey: ['/api/layout', { cityCode: currentCityCode, screen: 'home' }],
    enabled: userStatus !== 'loading',
  });

  const blocks = layoutData?.blocks || [];
  const city = layoutData?.city;

  return (
    <div className="app-shell">
      <Header />
      
      <main style={{ paddingBottom: '80px' }}>
        <div className="container">
          {isLoading || userStatus === 'loading' ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
                <Loader2 
                  size={48} 
                  color="var(--color-primary)" 
                  className="loading-spinner"
                  data-testid="icon-loading" 
                />
              </div>
              <h3 style={{ margin: '0 0 8px', color: 'var(--color-primary)' }}>
                Загружаем контент
              </h3>
              <p style={{ color: 'var(--color-secondary)', margin: 0 }}>
                {city?.displayName || 'Настраиваем маркетплейс'} • Подождите несколько секунд
              </p>
            </div>
          ) : blocks.length > 0 ? (
            <RenderBlocks blocks={blocks} cityCode={cityCode || 'brest'} />
          ) : (
            <EmptyState 
              title="Контент недоступен" 
              description="Не удалось загрузить блоки для главной страницы. Попробуйте обновить страницу" 
            />
          )}
        </div>
      </main>

      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'var(--bg-primary)',
          borderTop: '1px solid var(--color-secondary-soft)',
          padding: '12px clamp(16px, 3vw, 28px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: 'var(--shadow-md)',
          zIndex: 50,
        }}
        data-testid="bottom-bar"
      >
        <div style={{ display: 'flex', flexDirection: 'column' }} data-testid="bottom-bar-branding">
          <span 
            style={{ 
              fontSize: '0.75rem', 
              color: 'var(--color-secondary)', 
              marginBottom: '2px' 
            }} 
            data-testid="text-marketplace-label"
          >
            {city?.displayName || 'Маркетплейс'}
          </span>
          <span 
            style={{ 
              fontSize: '1rem', 
              fontWeight: 600, 
              color: 'var(--color-primary)' 
            }} 
            data-testid="text-brand-name"
          >
            KETMAR Market
          </span>
        </div>
        
        {blocks.length > 0 && (
          <div
            style={{
              backgroundColor: 'var(--color-primary)',
              color: '#FFFFFF',
              padding: '8px 16px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
            data-testid="badge-block-count"
          >
            {blocks.length} {blocks.length === 1 ? 'блок' : blocks.length < 5 ? 'блока' : 'блоков'}
          </div>
        )}
      </div>
    </div>
  );
}
