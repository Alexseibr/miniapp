import { CategorySuggestion } from '@/hooks/useCategorySuggestions';
import { Sparkles, ChevronRight } from 'lucide-react';

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
  hasHighConfidence,
}: CategorySuggestionGalleryProps) {
  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center gap-2 py-8 text-muted-foreground"
        data-testid="suggestion-loading"
      >
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
        <span className="text-sm">Подбираем категорию...</span>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3" data-testid="suggestion-gallery">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-foreground">
          {hasHighConfidence
            ? 'Рекомендуемая категория:'
            : `Подходящие категории (${suggestions.length}):`}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.slug}
            onClick={() => onSelectCategory(suggestion)}
            className="group relative rounded-lg border border-border bg-card hover-elevate active-elevate-2 transition-all overflow-hidden"
            style={{ aspectRatio: '1', minHeight: 0 }}
            data-testid={`suggestion-card-${suggestion.slug}`}
          >
            {suggestion.icon3d && (
              <div className="absolute inset-0 flex items-center justify-center p-2">
                <img
                  src={suggestion.icon3d}
                  alt={suggestion.name}
                  className="w-full h-full object-contain"
                  loading="lazy"
                  decoding="async"
                  data-testid={`suggestion-icon-${suggestion.slug}`}
                />
              </div>
            )}

            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-1.5">
              <p
                className="text-[10px] font-medium text-white truncate leading-tight"
                data-testid={`suggestion-name-${suggestion.slug}`}
              >
                {suggestion.name}
              </p>
            </div>

            <div className="absolute top-1 right-1 px-1 py-0.5 rounded bg-primary/90 text-[9px] text-white font-medium">
              {suggestion.score}%
            </div>
          </button>
        ))}
      </div>

      {!hasHighConfidence && suggestions.length > 1 && (
        <p className="text-xs text-muted-foreground">
          Выберите наиболее подходящую категорию из предложенных вариантов
        </p>
      )}
    </div>
  );
}
