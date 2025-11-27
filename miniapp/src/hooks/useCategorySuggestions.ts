import { useState, useEffect, useRef } from 'react';

export interface CategorySuggestion {
  slug: string;
  name: string;
  icon3d: string | null;
  level: number;
  isLeaf: boolean;
  parentSlug: string | null;
  topLevelParentSlug: string;
  directSubcategorySlug: string | null;
  score: number;
  matchType: string;
  disambiguationReason: string;
  displayPath: string;
}

interface SuggestionResponse {
  ok: boolean;
  query: string;
  matches: CategorySuggestion[];
  count: number;
  error?: string;
}

export function useCategorySuggestions(query: string, debounceMs = 300) {
  const [suggestions, setSuggestions] = useState<CategorySuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const abortController = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!query || query.trim().length === 0 || query.trim().length < 3) {
      setSuggestions([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(async () => {
      if (abortController.current) {
        abortController.current.abort();
      }

      abortController.current = new AbortController();
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/categories/suggest?query=${encodeURIComponent(query)}`,
          { signal: abortController.current.signal }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch suggestions');
        }

        const data: SuggestionResponse = await response.json();

        if (data.ok) {
          setSuggestions(data.matches);
        } else {
          setError(data.error || 'Unknown error');
          setSuggestions([]);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Failed to fetch suggestions');
          setSuggestions([]);
        }
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, [query, debounceMs]);

  return {
    suggestions,
    isLoading,
    error,
    hasHighConfidence: suggestions.length === 1 && suggestions[0].score >= 75,
    hasMultipleOptions: suggestions.length > 1,
  };
}
