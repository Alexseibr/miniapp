import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { LogoFull } from './Logo';

interface HeaderProps {
  onSearch?: (query: string) => void;
  showSearch?: boolean;
}

export default function Header({ onSearch, showSearch = true }: HeaderProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = useCallback(() => {
    if (searchQuery.trim()) {
      if (onSearch) {
        onSearch(searchQuery.trim());
      }
      navigate(`/feed?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  }, [searchQuery, onSearch, navigate]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <header style={{ 
      padding: '12px 16px', 
      background: '#FFFFFF',
      borderBottom: '1px solid rgba(0, 0, 0, 0.04)',
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center',
        gap: 12,
      }}>
        <LogoFull width={120} />
        
        {showSearch && (
          <div style={{ 
            flex: 1,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
          }}>
            <div style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
              zIndex: 1,
            }}>
              <Search size={18} color="#8E8E93" />
            </div>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Что вы ищете?"
              style={{
                width: '100%',
                padding: '10px 40px 10px 42px',
                fontSize: 15,
                border: 'none',
                borderRadius: 10,
                background: '#F2F2F7',
                outline: 'none',
                WebkitAppearance: 'none',
                transition: 'background 0.2s',
              }}
              onFocus={(e) => {
                e.currentTarget.style.background = '#E5E5EA';
              }}
              onBlur={(e) => {
                e.currentTarget.style.background = '#F2F2F7';
              }}
              data-testid="input-search"
            />
            {searchQuery && (
              <button
                onClick={handleSearch}
                style={{
                  position: 'absolute',
                  right: 6,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  padding: '6px 12px',
                  background: '#3B73FC',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                data-testid="button-search"
              >
                Найти
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
