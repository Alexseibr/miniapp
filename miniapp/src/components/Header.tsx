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
      padding: '20px 16px 16px', 
      background: 'linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)',
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        marginBottom: 20,
      }}>
        <LogoFull width={180} />
      </div>
      
      {showSearch && (
        <div style={{ 
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
        }}>
          <div style={{
            position: 'absolute',
            left: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            zIndex: 1,
          }}>
            <Search size={20} color="#9CA3AF" />
          </div>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Что вы ищете?"
            style={{
              width: '100%',
              padding: '14px 48px 14px 48px',
              fontSize: 16,
              border: '1px solid #E5E7EB',
              borderRadius: 16,
              background: '#FFFFFF',
              outline: 'none',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#3B73FC';
              e.currentTarget.style.boxShadow = '0 2px 12px rgba(59, 115, 252, 0.15)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#E5E7EB';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
            }}
            data-testid="input-search"
          />
          {searchQuery && (
            <button
              onClick={handleSearch}
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                padding: '8px 16px',
                background: '#3B73FC',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                fontSize: 14,
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
    </header>
  );
}
