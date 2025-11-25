import { CategoryNode } from '@/types';

interface SubcategoryChipsProps {
  subcategories: CategoryNode[];
  selectedSlug: string | null;
  onSelect: (slug: string | null) => void;
}

export default function SubcategoryChips({ subcategories, selectedSlug, onSelect }: SubcategoryChipsProps) {
  if (!subcategories || subcategories.length === 0) {
    return null;
  }

  return (
    <div style={{ padding: '0 16px 16px' }}>
      <div style={{ 
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        paddingBottom: 4,
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}>
        {/* Кнопка "Все" */}
        <button
          onClick={() => onSelect(null)}
          style={{
            padding: '10px 20px',
            background: selectedSlug === null ? '#3B73FC' : '#F9FAFB',
            color: selectedSlug === null ? '#ffffff' : '#374151',
            border: selectedSlug === null ? 'none' : '1px solid #E5E7EB',
            borderRadius: 20,
            fontSize: 15,
            fontWeight: selectedSlug === null ? 600 : 500,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flex: '0 0 auto',
            transition: 'all 0.2s',
          }}
          data-testid="chip-all"
        >
          Все
        </button>
        
        {subcategories.map((subcat) => {
          const isSelected = selectedSlug === subcat.slug;
          
          return (
            <button
              key={subcat.slug}
              onClick={() => onSelect(isSelected ? null : subcat.slug)}
              style={{
                padding: '10px 20px',
                background: isSelected ? '#3B73FC' : '#F9FAFB',
                color: isSelected ? '#ffffff' : '#374151',
                border: isSelected ? 'none' : '1px solid #E5E7EB',
                borderRadius: 20,
                fontSize: 15,
                fontWeight: isSelected ? 600 : 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flex: '0 0 auto',
                transition: 'all 0.2s',
              }}
              data-testid={`chip-${subcat.slug}`}
            >
              {subcat.name}
            </button>
          );
        })}
      </div>
      <style>
        {`
          div::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>
    </div>
  );
}
