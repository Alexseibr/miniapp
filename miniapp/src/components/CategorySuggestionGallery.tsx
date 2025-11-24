import { CategorySuggestion } from '@/hooks/useCategorySuggestions';

interface CategorySuggestionGalleryProps {
  suggestions: CategorySuggestion[];
  isLoading: boolean;
  onSelectCategory: (suggestion: CategorySuggestion) => void;
  hasHighConfidence: boolean;
}

export default function CategorySuggestionGallery({
  suggestions,
  isLoading,
  onSelectCategory,
}: CategorySuggestionGalleryProps) {
  if (isLoading) {
    return null;
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div style={{ marginBottom: 16 }} data-testid="suggestion-gallery">
      <div style={{ 
        fontSize: 13, 
        color: '#9CA3AF', 
        marginBottom: 8,
        fontWeight: 400
      }}>
        Возможные категории
      </div>
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: '4px',
        alignItems: 'center'
      }}>
        {suggestions.map((suggestion, index) => (
          <span key={`${suggestion.slug}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={() => onSelectCategory(suggestion)}
              style={{
                background: 'none',
                border: 'none',
                color: '#3B73FC',
                fontSize: 14,
                fontWeight: 400,
                cursor: 'pointer',
                padding: 0,
                textDecoration: 'none'
              }}
              data-testid={`suggestion-link-${suggestion.slug}`}
            >
              {suggestion.name}
            </button>
            {index < suggestions.length - 1 && (
              <span style={{ color: '#D1D5DB', fontSize: 14 }}>·</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
