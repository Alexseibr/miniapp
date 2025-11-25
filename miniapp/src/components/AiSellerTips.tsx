import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Lightbulb, Camera, FileText, TrendingUp, 
  Clock, Plus, ChevronRight, Loader2, RefreshCw, X 
} from 'lucide-react';

interface AiSuggestion {
  type: string;
  priority: 'high' | 'medium' | 'low';
  icon: string;
  text: string;
  actionType: string;
  actionData?: Record<string, any>;
}

interface AiSellerTipsProps {
  sellerId: string;
  onActionClick?: (actionType: string, actionData?: Record<string, any>) => void;
  maxTips?: number;
}

export default function AiSellerTips({ 
  sellerId, 
  onActionClick,
  maxTips = 5 
}: AiSellerTipsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [dismissedTips, setDismissedTips] = useState<Set<number>>(new Set());

  const fetchSuggestions = async () => {
    if (!sellerId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/ai/seller-suggestions/${sellerId}`);
      const result = await response.json();
      
      if (result.success && result.data?.suggestions) {
        setSuggestions(result.data.suggestions);
        setDismissedTips(new Set());
      } else {
        setError('Не удалось получить советы');
      }
    } catch (err) {
      console.error('[AiSellerTips] Error:', err);
      setError('Ошибка загрузки советов');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, [sellerId]);

  const handleDismiss = (index: number) => {
    setDismissedTips(prev => new Set(prev).add(index));
  };

  const getIconComponent = (iconEmoji: string, type: string) => {
    switch (type) {
      case 'photo_missing':
      case 'photo_few':
        return <Camera size={18} />;
      case 'description_short':
        return <FileText size={18} />;
      case 'seasonal_opportunity':
        return <TrendingUp size={18} />;
      case 'timing_tip':
        return <Clock size={18} />;
      case 'first_ad':
      case 'add_more':
        return <Plus size={18} />;
      default:
        return <Lightbulb size={18} />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return { bg: 'rgba(239, 68, 68, 0.1)', border: '#ef4444', text: '#dc2626' };
      case 'medium':
        return { bg: 'rgba(245, 158, 11, 0.1)', border: '#f59e0b', text: '#d97706' };
      default:
        return { bg: 'rgba(59, 130, 246, 0.1)', border: '#3b82f6', text: '#2563eb' };
    }
  };

  const visibleSuggestions = suggestions
    .filter((_, idx) => !dismissedTips.has(idx))
    .slice(0, maxTips);

  if (!sellerId) return null;

  if (visibleSuggestions.length === 0 && !isLoading && !error) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      data-testid="ai-seller-tips-panel"
      style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        border: '1px solid rgba(99, 102, 241, 0.15)'
      }}
    >
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: isExpanded ? 16 : 0,
          cursor: 'pointer'
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Sparkles size={20} color="white" />
          </div>
          <div>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', display: 'block' }}>
              AI-советы для продавца
            </span>
            {visibleSuggestions.length > 0 && (
              <span style={{ fontSize: 12, color: '#64748b' }}>
                {visibleSuggestions.length} {visibleSuggestions.length === 1 ? 'совет' : 'советов'}
              </span>
            )}
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              fetchSuggestions();
            }}
            disabled={isLoading}
            data-testid="button-refresh-seller-tips"
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
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" color="#6366f1" />
            ) : (
              <RefreshCw size={16} color="#64748b" />
            )}
          </button>
          <ChevronRight 
            size={20} 
            color="#94a3b8"
            style={{
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease'
            }}
          />
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}
          >
            {isLoading && suggestions.length === 0 && (
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

            {!isLoading && visibleSuggestions.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {visibleSuggestions.map((suggestion, index) => {
                  const colors = getPriorityColor(suggestion.priority);
                  
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      data-testid={`seller-tip-${index}`}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        padding: 12,
                        background: 'white',
                        borderRadius: 12,
                        borderLeft: `3px solid ${colors.border}`
                      }}
                    >
                      <div
                        style={{
                          flexShrink: 0,
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          background: colors.bg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: colors.text
                        }}
                      >
                        {getIconComponent(suggestion.icon, suggestion.type)}
                      </div>
                      
                      <div style={{ flex: 1 }}>
                        <p style={{ 
                          fontSize: 14, 
                          color: '#374151', 
                          lineHeight: 1.5,
                          margin: 0 
                        }}>
                          {suggestion.text}
                        </p>
                        
                        {suggestion.actionType && suggestion.actionType !== 'info' && (
                          <button
                            onClick={() => onActionClick?.(suggestion.actionType, suggestion.actionData)}
                            data-testid={`button-tip-action-${index}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              marginTop: 8,
                              padding: '6px 12px',
                              background: colors.bg,
                              color: colors.text,
                              border: 'none',
                              borderRadius: 8,
                              fontSize: 13,
                              fontWeight: 500,
                              cursor: 'pointer'
                            }}
                          >
                            {suggestion.actionType === 'edit_ad' && 'Редактировать'}
                            {suggestion.actionType === 'add_product' && 'Добавить товар'}
                            {suggestion.actionType === 'create_ad' && 'Создать объявление'}
                            <ChevronRight size={14} />
                          </button>
                        )}
                      </div>
                      
                      <button
                        onClick={() => handleDismiss(index)}
                        data-testid={`button-dismiss-tip-${index}`}
                        style={{
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 24,
                          height: 24,
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          opacity: 0.5
                        }}
                      >
                        <X size={16} color="#94a3b8" />
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {!isLoading && !error && visibleSuggestions.length === 0 && suggestions.length > 0 && (
              <div style={{ 
                textAlign: 'center', 
                padding: 20, 
                color: '#64748b',
                fontSize: 14 
              }}>
                Все советы просмотрены
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
