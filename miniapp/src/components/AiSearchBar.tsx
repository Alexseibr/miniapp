import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, X, MapPin, Loader2, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface IntentData {
  intent: string;
  cleanedQuery: string;
  categoryCandidates: Array<{
    category: string;
    subcategory?: string;
  }>;
  keywords: string[];
  radiusRecommendation: number;
  suggestions: string[];
}

interface AiSearchBarProps {
  placeholder?: string;
  onSearch?: (query: string, intent?: IntentData) => void;
  lat?: number;
  lng?: number;
}

export default function AiSearchBar({ 
  placeholder = 'Что ищете?',
  onSearch,
  lat,
  lng
}: AiSearchBarProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [intentData, setIntentData] = useState<IntentData | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  const fetchIntent = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setIntentData(null);
      setSuggestions([]);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery })
      });

      const result = await response.json();
      
      if (result.success && result.data) {
        setIntentData(result.data);
        setSuggestions(result.data.suggestions || []);
      }
    } catch (err) {
      console.error('[AiSearchBar] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchIntent(query);
    }, 400);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, fetchIntent]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!query.trim()) return;

    if (onSearch) {
      onSearch(query, intentData || undefined);
    } else {
      const params = new URLSearchParams({
        q: query
      });
      
      if (intentData?.radiusRecommendation) {
        params.set('radius', intentData.radiusRecommendation.toString());
      }
      
      if (lat && lng) {
        params.set('lat', lat.toString());
        params.set('lng', lng.toString());
      }

      navigate(`/feed?${params.toString()}`);
    }

    setIsFocused(false);
    inputRef.current?.blur();
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    handleSubmit();
  };

  const handleClear = () => {
    setQuery('');
    setIntentData(null);
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const getIntentLabel = (intent: string) => {
    switch (intent) {
      case 'buy': return 'Хотите купить';
      case 'sell': return 'Хотите продать';
      case 'rent': return 'Хотите снять';
      case 'rent_out': return 'Хотите сдать';
      case 'service': return 'Ищете услугу';
      default: return 'Поиск';
    }
  };

  const getIntentColor = (intent: string) => {
    switch (intent) {
      case 'buy': return '#22c55e';
      case 'sell': return '#3b82f6';
      case 'rent': return '#f59e0b';
      case 'rent_out': return '#8b5cf6';
      case 'service': return '#ec4899';
      default: return '#64748b';
    }
  };

  return (
    <div 
      data-testid="ai-search-bar"
      style={{ position: 'relative' }}
    >
      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            background: isFocused ? 'white' : '#f8fafc',
            border: isFocused ? '2px solid #6366f1' : '2px solid transparent',
            borderRadius: 14,
            transition: 'all 0.2s ease',
            boxShadow: isFocused ? '0 4px 20px rgba(99, 102, 241, 0.15)' : 'none'
          }}
        >
          {isLoading ? (
            <Loader2 size={20} className="animate-spin" color="#6366f1" />
          ) : (
            <Search size={20} color={isFocused ? '#6366f1' : '#94a3b8'} />
          )}
          
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            placeholder={placeholder}
            data-testid="input-ai-search"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 15,
              color: '#1e293b'
            }}
          />
          
          {query && (
            <button
              type="button"
              onClick={handleClear}
              data-testid="button-clear-search"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 24,
                height: 24,
                background: '#f1f5f9',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer'
              }}
            >
              <X size={14} color="#64748b" />
            </button>
          )}
          
          {query && (
            <button
              type="submit"
              data-testid="button-submit-search"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Sparkles size={14} />
              Найти
            </button>
          )}
        </div>
      </form>

      <AnimatePresence>
        {isFocused && (intentData || suggestions.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            data-testid="ai-search-dropdown"
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              right: 0,
              background: 'white',
              borderRadius: 14,
              boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
              padding: 12,
              zIndex: 100
            }}
          >
            {intentData && (
              <div style={{ marginBottom: suggestions.length > 0 ? 12 : 0 }}>
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 8,
                    marginBottom: 8
                  }}
                >
                  <div
                    style={{
                      padding: '4px 10px',
                      background: `${getIntentColor(intentData.intent)}15`,
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      color: getIntentColor(intentData.intent)
                    }}
                  >
                    {getIntentLabel(intentData.intent)}
                  </div>
                  
                  {intentData.radiusRecommendation && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '4px 8px',
                        background: '#f1f5f9',
                        borderRadius: 8,
                        fontSize: 12,
                        color: '#64748b'
                      }}
                    >
                      <MapPin size={12} />
                      {intentData.radiusRecommendation} км
                    </div>
                  )}
                </div>
                
                {intentData.categoryCandidates.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {intentData.categoryCandidates.map((cat, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '4px 10px',
                          background: '#f0f9ff',
                          borderRadius: 8,
                          fontSize: 12,
                          color: '#0369a1'
                        }}
                      >
                        <Tag size={12} />
                        {cat.subcategory ? `${cat.category} / ${cat.subcategory}` : cat.category}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {suggestions.length > 0 && (
              <div>
                <p style={{ 
                  fontSize: 12, 
                  color: '#94a3b8', 
                  marginBottom: 8,
                  fontWeight: 500
                }}>
                  Похожие запросы
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(suggestion)}
                      data-testid={`suggestion-${idx}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 12px',
                        background: '#f8fafc',
                        border: 'none',
                        borderRadius: 10,
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <Search size={14} color="#94a3b8" />
                      <span style={{ fontSize: 14, color: '#374151' }}>
                        {suggestion}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
