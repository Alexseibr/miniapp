import { useEffect, useRef } from 'react';
import { X, Check, ChevronRight, List, FolderOpen } from 'lucide-react';
import { CategoryNode, CategoryStat } from '@/types';

interface CategoriesSheetProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryNode[];
  categoryStats: CategoryStat[];
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  radiusKm: number;
  totalAds: number;
}

export default function CategoriesSheet({
  isOpen,
  onClose,
  categories,
  categoryStats,
  selectedCategoryId,
  onSelectCategory,
  radiusKm,
  totalAds,
}: CategoriesSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getCategoryCount = (categoryId: string): number => {
    const stat = categoryStats.find((s) => s.categoryId === categoryId);
    return stat?.count || 0;
  };

  const handleSelect = (categoryId: string | null) => {
    onSelectCategory(categoryId);
    onClose();
  };

  const formatRadius = (km: number): string => {
    if (km < 1) {
      return `${Math.round(km * 1000)} м`;
    }
    return `${km} км`;
  };

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 100,
        }}
        onClick={onClose}
        data-testid="categories-sheet-backdrop"
      />

      <div
        ref={sheetRef}
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          maxHeight: '80vh',
          background: '#ffffff',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          zIndex: 101,
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideUp 0.3s ease-out',
        }}
        data-testid="categories-sheet"
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 600,
                color: '#111827',
              }}
              data-testid="categories-sheet-title"
            >
              Категории
            </h2>
            <p
              style={{
                margin: '4px 0 0',
                fontSize: 14,
                color: '#6B7280',
              }}
              data-testid="categories-sheet-subtitle"
            >
              в радиусе {formatRadius(radiusKm)} — {totalAds} {getAdsWord(totalAds)}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              border: 'none',
              background: '#F3F4F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            data-testid="button-categories-sheet-close"
          >
            <X size={22} color="#6B7280" />
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px 0',
          }}
          data-testid="categories-sheet-list"
        >
          <button
            onClick={() => handleSelect(null)}
            style={{
              width: '100%',
              padding: '14px 20px',
              background: selectedCategoryId === null ? '#EBF3FF' : 'transparent',
              border: 'none',
              borderBottom: '1px solid #F3F4F6',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              cursor: 'pointer',
              textAlign: 'left',
              minHeight: 72,
            }}
            data-testid="button-category-all"
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: selectedCategoryId === null ? '#3B73FC' : '#F3F4F6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <List size={24} color={selectedCategoryId === null ? '#fff' : '#6B7280'} />
            </div>
            <div style={{ flex: 1 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 17,
                  fontWeight: selectedCategoryId === null ? 600 : 500,
                  color: selectedCategoryId === null ? '#3B73FC' : '#111827',
                }}
              >
                Все категории
              </p>
            </div>
            <div
              style={{
                background: '#3B73FC',
                color: '#fff',
                padding: '6px 12px',
                borderRadius: 20,
                fontSize: 15,
                fontWeight: 600,
              }}
              data-testid="text-total-ads-count"
            >
              {totalAds}
            </div>
            {selectedCategoryId === null && (
              <Check size={22} color="#3B73FC" />
            )}
          </button>

          {categories.map((category) => {
            const count = getCategoryCount(category.slug);
            const isSelected = selectedCategoryId === category.slug;

            return (
              <button
                key={category.slug}
                onClick={() => handleSelect(category.slug)}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  background: isSelected ? '#EBF3FF' : 'transparent',
                  border: 'none',
                  borderBottom: '1px solid #F3F4F6',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  cursor: 'pointer',
                  textAlign: 'left',
                  opacity: count === 0 ? 0.5 : 1,
                  minHeight: 72,
                }}
                data-testid={`button-category-${category.slug}`}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: isSelected ? '#EBF3FF' : '#F9FAFB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {category.icon3d ? (
                    <img
                      src={category.icon3d}
                      alt={category.name}
                      style={{ width: 40, height: 40, objectFit: 'contain' }}
                      loading="lazy"
                    />
                  ) : (
                    <FolderOpen size={24} color={isSelected ? '#3B73FC' : '#9CA3AF'} />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 17,
                      fontWeight: isSelected ? 600 : 500,
                      color: isSelected ? '#3B73FC' : '#111827',
                    }}
                  >
                    {category.name}
                  </p>
                </div>
                {count > 0 && (
                  <div
                    style={{
                      background: isSelected ? '#3B73FC' : '#E5E7EB',
                      color: isSelected ? '#fff' : '#374151',
                      padding: '6px 12px',
                      borderRadius: 20,
                      fontSize: 15,
                      fontWeight: 500,
                    }}
                    data-testid={`text-category-count-${category.slug}`}
                  >
                    {count}
                  </div>
                )}
                {isSelected ? (
                  <Check size={22} color="#3B73FC" />
                ) : (
                  <ChevronRight size={22} color="#9CA3AF" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <style>
        {`
          @keyframes slideUp {
            from {
              transform: translateY(100%);
            }
            to {
              transform: translateY(0);
            }
          }
        `}
      </style>
    </>
  );
}

function getAdsWord(count: number): string {
  const lastTwo = count % 100;
  const lastOne = count % 10;

  if (lastTwo >= 11 && lastTwo <= 14) {
    return 'объявлений';
  }
  if (lastOne === 1) {
    return 'объявление';
  }
  if (lastOne >= 2 && lastOne <= 4) {
    return 'объявления';
  }
  return 'объявлений';
}
