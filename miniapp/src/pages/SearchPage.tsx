import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Clock, X, Sparkles } from 'lucide-react';

const POPULAR_SEARCHES = [
  { text: 'Свежие овощи', emoji: '🥬' },
  { text: 'iPhone', emoji: '📱' },
  { text: 'Запчасти Toyota', emoji: '🚗' },
  { text: 'Одежда детская', emoji: '👕' },
  { text: 'Квартира', emoji: '🏠' },
  { text: 'Ремонт', emoji: '🔧' },
];

const STORAGE_KEY = 'ketmar_search_history';

export default function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setSearchHistory(JSON.parse(saved));
      } catch {
        setSearchHistory([]);
      }
    }
  }, []);

  const handleBack = () => {
    navigate(-1);
  };

  const handleSearch = (searchText: string) => {
    if (!searchText.trim()) return;
    
    const newHistory = [searchText, ...searchHistory.filter(h => h !== searchText)].slice(0, 10);
    setSearchHistory(newHistory);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
    
    navigate(`/search/results?q=${encodeURIComponent(searchText.trim())}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  const handleClearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleRemoveFromHistory = (text: string) => {
    const newHistory = searchHistory.filter(h => h !== text);
    setSearchHistory(newHistory);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#FFFFFF',
      paddingBottom: 100,
    }}>
      {/* Header with Search */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        borderBottom: '1px solid #F0F2F5',
      }}>
        <button
          onClick={handleBack}
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: '#F5F6F8',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
          data-testid="button-back"
        >
          <ArrowLeft size={20} color="#1F2937" />
        </button>

        <form 
          onSubmit={handleSubmit}
          style={{ flex: 1 }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 14px',
            background: '#F5F6F8',
            borderRadius: 14,
          }}>
            <Search size={18} color="#9CA3AF" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск товаров..."
              autoFocus
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                fontSize: 16,
                color: '#1F2937',
                outline: 'none',
              }}
              data-testid="input-search"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                }}
              >
                <X size={18} color="#9CA3AF" />
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Content */}
      <div style={{ padding: '20px 16px' }}>
        {/* Popular Searches */}
        <section style={{ marginBottom: 32 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 14,
          }}>
            <Sparkles size={18} color="#3A7BFF" />
            <h2 style={{
              fontSize: 16,
              fontWeight: 600,
              color: '#1F2937',
              margin: 0,
            }}>
              Популярные запросы
            </h2>
          </div>

          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
          }}>
            {POPULAR_SEARCHES.map((item, index) => (
              <button
                key={index}
                onClick={() => handleSearch(item.text)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 14px',
                  background: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: 20,
                  fontSize: 14,
                  color: '#1F2937',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                data-testid={`popular-search-${index}`}
              >
                <span>{item.emoji}</span>
                <span>{item.text}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Search History */}
        {searchHistory.length > 0 && (
          <section>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 14,
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <Clock size={18} color="#9CA3AF" />
                <h2 style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#1F2937',
                  margin: 0,
                }}>
                  Недавние поиски
                </h2>
              </div>
              
              <button
                onClick={handleClearHistory}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#3A7BFF',
                  cursor: 'pointer',
                  padding: 0,
                }}
                data-testid="button-clear-history"
              >
                Очистить
              </button>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
            }}>
              {searchHistory.map((text, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 0',
                    borderBottom: index < searchHistory.length - 1 ? '1px solid #F0F2F5' : 'none',
                  }}
                >
                  <button
                    onClick={() => handleSearch(text)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      background: 'none',
                      border: 'none',
                      fontSize: 15,
                      color: '#1F2937',
                      cursor: 'pointer',
                      padding: 0,
                      textAlign: 'left',
                    }}
                    data-testid={`history-item-${index}`}
                  >
                    {text}
                  </button>
                  
                  <button
                    onClick={() => handleRemoveFromHistory(text)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 4,
                      cursor: 'pointer',
                    }}
                  >
                    <Search size={18} color="#9CA3AF" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
