import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check, X, RefreshCw, Tag, FolderTree, FileText, Loader2 } from 'lucide-react';

interface AiAnalysisData {
  description?: {
    shortDescription: string;
    fullDescription: string;
    tags: string[];
    params: {
      brand?: string;
      model?: string;
      condition?: string;
      color?: string;
      size?: string;
    };
    categoryHint?: {
      category: string;
      subcategory?: string;
    };
  };
  category?: {
    categoryName: string;
    subcategoryName?: string;
    confidence: number;
  };
  tags?: {
    tags: string[];
    mainKeywords: string[];
  };
  moderation?: {
    status: string;
    issues: Array<{ type: string; reason?: string }>;
  };
}

interface AiSuggestionsProps {
  title: string;
  onAcceptDescription?: (description: string) => void;
  onAcceptCategory?: (category: string, subcategory?: string) => void;
  onAcceptTags?: (tags: string[]) => void;
  onAcceptAll?: (data: AiAnalysisData) => void;
  debounceMs?: number;
}

export default function AiSuggestions({
  title,
  onAcceptDescription,
  onAcceptCategory,
  onAcceptTags,
  onAcceptAll,
  debounceMs = 800
}: AiSuggestionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState<AiAnalysisData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acceptedItems, setAcceptedItems] = useState<Set<string>>(new Set());
  const [isVisible, setIsVisible] = useState(true);

  const fetchAnalysis = useCallback(async (titleText: string) => {
    if (!titleText || titleText.length < 3) {
      setAnalysisData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/full-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: titleText })
      });

      const result = await response.json();
      
      if (result.success && result.data) {
        setAnalysisData(result.data);
        setAcceptedItems(new Set());
      } else {
        setError('Не удалось получить AI-подсказки');
      }
    } catch (err) {
      console.error('[AiSuggestions] Error:', err);
      setError('Ошибка связи с AI');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAnalysis(title);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [title, debounceMs, fetchAnalysis]);

  const handleAcceptDescription = () => {
    if (analysisData?.description?.fullDescription) {
      onAcceptDescription?.(analysisData.description.fullDescription);
      setAcceptedItems(prev => new Set(prev).add('description'));
    }
  };

  const handleAcceptCategory = () => {
    if (analysisData?.category) {
      onAcceptCategory?.(
        analysisData.category.categoryName,
        analysisData.category.subcategoryName
      );
      setAcceptedItems(prev => new Set(prev).add('category'));
    }
  };

  const handleAcceptTags = () => {
    if (analysisData?.tags?.tags) {
      onAcceptTags?.(analysisData.tags.tags);
      setAcceptedItems(prev => new Set(prev).add('tags'));
    }
  };

  const handleAcceptAll = () => {
    if (analysisData) {
      onAcceptAll?.(analysisData);
      setAcceptedItems(new Set(['description', 'category', 'tags']));
    }
  };

  const handleRefresh = () => {
    fetchAnalysis(title);
  };

  if (!title || title.length < 3) {
    return null;
  }

  if (!isVisible) {
    return (
      <motion.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={() => setIsVisible(true)}
        data-testid="button-show-ai-suggestions"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 16px',
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          color: 'white',
          border: 'none',
          borderRadius: 12,
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: 16
        }}
      >
        <Sparkles size={16} />
        Показать AI-подсказки
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      data-testid="ai-suggestions-panel"
      style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        border: '1px solid rgba(99, 102, 241, 0.2)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Sparkles size={18} color="white" />
          </div>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>
            AI-подсказки
          </span>
        </div>
        
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            data-testid="button-refresh-ai"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={16} color="#64748b" className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setIsVisible(false)}
            data-testid="button-hide-ai"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              cursor: 'pointer'
            }}
          >
            <X size={16} color="#64748b" />
          </button>
        </div>
      </div>

      {isLoading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Loader2 size={24} className="animate-spin" color="#6366f1" />
          <span style={{ marginLeft: 12, color: '#64748b', fontSize: 14 }}>Анализируем...</span>
        </div>
      )}

      {error && (
        <div style={{ color: '#ef4444', fontSize: 14, textAlign: 'center', padding: 16 }}>
          {error}
        </div>
      )}

      {!isLoading && analysisData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {analysisData.description && (
            <SuggestionCard
              icon={<FileText size={16} />}
              title="Описание"
              content={analysisData.description.shortDescription}
              isAccepted={acceptedItems.has('description')}
              onAccept={handleAcceptDescription}
              testId="suggestion-description"
            />
          )}

          {analysisData.category && (
            <SuggestionCard
              icon={<FolderTree size={16} />}
              title="Категория"
              content={
                analysisData.category.subcategoryName
                  ? `${analysisData.category.categoryName} / ${analysisData.category.subcategoryName}`
                  : analysisData.category.categoryName
              }
              badge={`${Math.round(analysisData.category.confidence * 100)}%`}
              isAccepted={acceptedItems.has('category')}
              onAccept={handleAcceptCategory}
              testId="suggestion-category"
            />
          )}

          {analysisData.tags && analysisData.tags.tags.length > 0 && (
            <SuggestionCard
              icon={<Tag size={16} />}
              title="Теги"
              content={
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {analysisData.tags.tags.slice(0, 8).map((tag, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: '4px 10px',
                        background: 'rgba(99, 102, 241, 0.1)',
                        borderRadius: 8,
                        fontSize: 12,
                        color: '#6366f1',
                        fontWeight: 500
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              }
              isAccepted={acceptedItems.has('tags')}
              onAccept={handleAcceptTags}
              testId="suggestion-tags"
            />
          )}

          {analysisData.moderation?.status === 'ok' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                background: 'rgba(34, 197, 94, 0.1)',
                borderRadius: 10,
                marginTop: 4
              }}
            >
              <Check size={16} color="#22c55e" />
              <span style={{ fontSize: 13, color: '#22c55e', fontWeight: 500 }}>
                Объявление прошло проверку AI
              </span>
            </div>
          )}

          {onAcceptAll && !acceptedItems.has('description') && !acceptedItems.has('category') && (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleAcceptAll}
              data-testid="button-accept-all-ai"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                width: '100%',
                padding: '12px 16px',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                marginTop: 8
              }}
            >
              <Check size={18} />
              Принять все подсказки
            </motion.button>
          )}
        </div>
      )}
    </motion.div>
  );
}

interface SuggestionCardProps {
  icon: React.ReactNode;
  title: string;
  content: React.ReactNode;
  badge?: string;
  isAccepted: boolean;
  onAccept: () => void;
  testId: string;
}

function SuggestionCard({ icon, title, content, badge, isAccepted, onAccept, testId }: SuggestionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      data-testid={testId}
      style={{
        background: 'white',
        borderRadius: 12,
        padding: 12,
        border: isAccepted ? '2px solid #22c55e' : '1px solid #e2e8f0'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ color: '#6366f1' }}>{icon}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{title}</span>
            {badge && (
              <span
                style={{
                  padding: '2px 6px',
                  background: '#f0fdf4',
                  color: '#22c55e',
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: 6
                }}
              >
                {badge}
              </span>
            )}
          </div>
          <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
            {content}
          </div>
        </div>
        
        <AnimatePresence mode="wait">
          {isAccepted ? (
            <motion.div
              key="accepted"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: '#22c55e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Check size={18} color="white" />
            </motion.div>
          ) : (
            <motion.button
              key="accept"
              whileTap={{ scale: 0.95 }}
              onClick={onAccept}
              data-testid={`button-accept-${testId}`}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: '#f1f5f9',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <Check size={18} color="#64748b" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
