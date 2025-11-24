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

      <div
        className={`grid gap-2 ${
          suggestions.length === 1
            ? 'grid-cols-1'
            : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
        }`}
      >
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.slug}
            onClick={() => onSelectCategory(suggestion)}
            className="group relative aspect-square rounded-lg border border-border bg-card hover-elevate active-elevate-2 transition-all overflow-hidden"
            data-testid={`suggestion-card-${suggestion.slug}`}
          >
            {suggestion.icon3d && (
              <div className="absolute inset-0 flex items-center justify-center p-3">
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

            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
              <div className="flex items-center justify-between gap-1">
                <div className="flex-1 min-w-0">
                  <p
                    className="text-xs font-medium text-white truncate"
                    data-testid={`suggestion-name-${suggestion.slug}`}
                  >
                    {suggestion.name}
                  </p>
                  <p className="text-[10px] text-white/70 truncate">
                    {suggestion.displayPath}
                  </p>
                </div>
                <ChevronRight className="w-3 h-3 text-white/70 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            {hasHighConfidence && suggestions.length === 1 && (
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-primary/90 text-[10px] font-medium text-primary-foreground">
                Рекомендуем
              </div>
            )}

            <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/60 text-[10px] text-white/90 font-medium">
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
