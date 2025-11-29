import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, ChevronRight, Loader2, MapPin, Tag, TrendingUp, Flame } from 'lucide-react';
import { useGeo } from '@/utils/geo';
import { useHotSearches } from '@/hooks/useHotSearches';

interface CategorySuggestion {
  slug: string;
  name: string;
  icon3d: string | null;
  level: number;
  parentSlug: string | null;
  isLeaf: boolean;
  displayPath: string;
  isFarmerCategory: boolean;
}

interface BrandSuggestion {
  brand: string;
  count: number;
}

interface KeywordSuggestion {
  keyword: string;
  categorySlug: string | null;
  count: number;
}

interface Suggestions {
  categories: CategorySuggestion[];
  brands: BrandSuggestion[];
  keywords: KeywordSuggestion[];
}

interface GlobalSearchBarProps {
  placeholder?: string;
  autoFocus?: boolean;
  onSearch?: (query: string) => void;
  defaultValue?: string;
  compact?: boolean;
}

const API_BASE = '/api';
const DEBOUNCE_MS = 300;

export default function GlobalSearchBar({
  placeholder = 'Поиск объявлений...',
  autoFocus = false,
  onSearch,
  defaultValue = '',
  compact = false,
}: GlobalSearchBarProps) {
  const navigate = useNavigate();
  const { coords, radiusKm } = useGeo();
  
  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { searches: hotSearches } = useHotSearches({
    lat: coords?.lat,
    lng: coords?.lng,
    limit: 8,
    scope: coords ? 'local' : 'country',
    enabled: true,
  });

  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setSuggestions(null);
      return;
    }

    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    setIsLoading(true);

    try {
      const response = await fetch(
        `${API_BASE}/search/suggest?query=${encodeURIComponent(searchQuery)}&limit=5`,
        { signal: abortRef.current.signal }
      );

      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();
      if (data.ok) {
        setSuggestions({
          categories: data.categories || [],
          brands: data.brands || [],
          keywords: data.keywords || [],
        });
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Suggestion fetch error:', error);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.trim().length >= 2) {
      debounceRef.current = setTimeout(() => {
        fetchSuggestions(query);
      }, DEBOUNCE_MS);
    } else {
      setSuggestions(null);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, fetchSuggestions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = useCallback(() => {
    if (!query.trim()) return;

    setShowSuggestions(false);

    if (onSearch) {
      onSearch(query.trim());
    } else {
      const params = new URLSearchParams({
        q: query.trim(),
        ...(coords && { lat: coords.lat.toString(), lng: coords.lng.toString() }),
        radiusKm: radiusKm.toString(),
      });
      navigate(`/feed?${params.toString()}`);
    }
  }, [query, coords, radiusKm, navigate, onSearch]);

  const handleCategorySelect = (category: CategorySuggestion) => {
    setShowSuggestions(false);
    setQuery('');

    if (category.isLeaf || category.level === 2) {
      navigate(`/feed?category=${category.parentSlug || category.slug}&subcategory=${category.slug}`);
    } else {
      navigate(`/category/${category.slug}`);
    }
  };

  const handleKeywordSelect = (keyword: string) => {
    setQuery(keyword);
    setShowSuggestions(false);

    const params = new URLSearchParams({
      q: keyword,
      ...(coords && { lat: coords.lat.toString(), lng: coords.lng.toString() }),
      radiusKm: radiusKm.toString(),
    });
    navigate(`/feed?${params.toString()}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || !suggestions) return;

    const totalItems =
      suggestions.categories.length +
      suggestions.brands.length +
      suggestions.keywords.length;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex === -1) {
          handleSearch();
        } else {
          let index = focusedIndex;
          if (index < suggestions.categories.length) {
            handleCategorySelect(suggestions.categories[index]);
          } else {
            index -= suggestions.categories.length;
            if (index < suggestions.keywords.length) {
              handleKeywordSelect(suggestions.keywords[index].keyword);
            }
          }
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  const clearSearch = () => {
    setQuery('');
    setSuggestions(null);
    inputRef.current?.focus();
  };

  const hasSuggestions =
    suggestions &&
    (suggestions.categories.length > 0 ||
      suggestions.brands.length > 0 ||
      suggestions.keywords.length > 0);

  const showHotSearches = showSuggestions && !query.trim() && hotSearches.length > 0;

  const handleHotSearchClick = (searchQuery: string) => {
    setQuery(searchQuery);
    setShowSuggestions(false);
    
    const params = new URLSearchParams({
      q: searchQuery,
      ...(coords && { lat: coords.lat.toString(), lng: coords.lng.toString() }),
      radiusKm: '3',
    });
    navigate(`/feed?${params.toString()}`);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: '#F3F4F6',
          borderRadius: compact ? 10 : 14,
          padding: compact ? '10px 14px' : '14px 18px',
          gap: 10,
          border: showSuggestions && hasSuggestions ? '2px solid #3B73FC' : '2px solid transparent',
          transition: 'border-color 0.2s',
        }}
      >
        <Search size={compact ? 18 : 20} color="#9CA3AF" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            fontSize: compact ? 15 : 16,
            color: '#111827',
            outline: 'none',
          }}
          data-testid="input-global-search"
        />
        {isLoading && (
          <Loader2 size={18} color="#3B73FC" style={{ animation: 'spin 1s linear infinite' }} />
        )}
        {query && !isLoading && (
          <button
            onClick={clearSearch}
            style={{
              background: 'none',
              border: 'none',
              padding: 4,
              cursor: 'pointer',
              display: 'flex',
            }}
            data-testid="button-clear-search"
          >
            <X size={18} color="#9CA3AF" />
          </button>
        )}
        <button
          onClick={handleSearch}
          disabled={!query.trim()}
          style={{
            background: query.trim() ? '#3B73FC' : '#E5E7EB',
            color: query.trim() ? '#fff' : '#9CA3AF',
            border: 'none',
            borderRadius: 8,
            padding: compact ? '6px 12px' : '8px 16px',
            fontSize: compact ? 13 : 14,
            fontWeight: 600,
            cursor: query.trim() ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
          }}
          data-testid="button-search"
        >
          Найти
        </button>
      </div>

      {showHotSearches && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 8,
            background: '#FFFFFF',
            borderRadius: 14,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            border: '1px solid #E5E7EB',
            overflow: 'hidden',
            zIndex: 1000,
            maxHeight: 400,
            overflowY: 'auto',
          }}
          data-testid="hot-searches-dropdown"
        >
          <div style={{ padding: '8px 0' }}>
            <div
              style={{
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Flame size={16} color="#EF4444" />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#6B7280',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                Популярное рядом
              </span>
            </div>
            {hotSearches.map((hs, idx) => (
              <button
                key={hs.normalizedQuery}
                onClick={() => handleHotSearchClick(hs.query)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#F3F4F6')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                data-testid={`hot-search-${idx}`}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <TrendingUp size={16} color="#D97706" />
                </div>
                <span style={{ fontSize: 15, color: '#111827', fontWeight: 500 }}>
                  {hs.query}
                </span>
                {hs.count > 5 && (
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontSize: 11,
                      color: '#9CA3AF',
                      background: '#F3F4F6',
                      padding: '2px 8px',
                      borderRadius: 10,
                    }}
                  >
                    {hs.count} запросов
                  </span>
                )}
                <ChevronRight size={16} color="#9CA3AF" />
              </button>
            ))}
          </div>
          {coords && (
            <div
              style={{
                padding: '12px 16px',
                borderTop: '1px solid #F3F4F6',
                background: '#F9FAFB',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <MapPin size={14} color="#3B73FC" />
              <span style={{ fontSize: 12, color: '#6B7280' }}>
                Популярные запросы рядом с вами
              </span>
            </div>
          )}
        </div>
      )}

      {showSuggestions && hasSuggestions && !showHotSearches && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 8,
            background: '#FFFFFF',
            borderRadius: 14,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            border: '1px solid #E5E7EB',
            overflow: 'hidden',
            zIndex: 1000,
            maxHeight: 400,
            overflowY: 'auto',
          }}
          data-testid="search-suggestions-dropdown"
        >
          {suggestions.categories.length > 0 && (
            <div style={{ padding: '8px 0' }}>
              <div
                style={{
                  padding: '6px 16px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#6B7280',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                Категории
              </div>
              {suggestions.categories.map((cat, idx) => {
                const isActive = focusedIndex === idx;
                return (
                  <button
                    key={cat.slug}
                    onClick={() => handleCategorySelect(cat)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 16px',
                      background: isActive ? '#F3F4F6' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.15s',
                    }}
                    data-testid={`suggestion-category-${cat.slug}`}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: '#EBF3FF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {cat.icon3d ? (
                        <img
                          src={cat.icon3d}
                          alt=""
                          style={{ width: 24, height: 24, objectFit: 'contain' }}
                        />
                      ) : (
                        <Tag size={16} color="#3B73FC" />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 500, color: '#111827' }}>
                        {cat.name}
                      </div>
                      {cat.displayPath && (
                        <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                          {cat.displayPath}
                        </div>
                      )}
                    </div>
                    <ChevronRight size={18} color="#9CA3AF" />
                  </button>
                );
              })}
            </div>
          )}

          {suggestions.keywords.length > 0 && (
            <div style={{ padding: '8px 0', borderTop: '1px solid #F3F4F6' }}>
              <div
                style={{
                  padding: '6px 16px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#6B7280',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                Популярные запросы
              </div>
              {suggestions.keywords.map((kw, idx) => {
                const isActive = focusedIndex === suggestions.categories.length + idx;
                return (
                  <button
                    key={kw.keyword}
                    onClick={() => handleKeywordSelect(kw.keyword)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 16px',
                      background: isActive ? '#F3F4F6' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.15s',
                    }}
                    data-testid={`suggestion-keyword-${kw.keyword}`}
                  >
                    <TrendingUp size={16} color="#9CA3AF" />
                    <span style={{ fontSize: 14, color: '#374151' }}>{kw.keyword}</span>
                    <span style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 'auto' }}>
                      {kw.count} объявлений
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {coords && (
            <div
              style={{
                padding: '12px 16px',
                borderTop: '1px solid #F3F4F6',
                background: '#F9FAFB',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <MapPin size={14} color="#3B73FC" />
              <span style={{ fontSize: 12, color: '#6B7280' }}>
                Поиск в радиусе {radiusKm} км от вашего местоположения
              </span>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
