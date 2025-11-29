import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUserStore } from '@/store/useUserStore';
import AuthScreen from '@/components/AuthScreen';
import { useGeo } from '@/utils/geo';
import { 
  ArrowLeft, 
  Send, 
  Brain, 
  Sparkles, 
  MapPin, 
  Clock, 
  Lightbulb, 
  Tag,
  ChevronRight,
  Loader2
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  data?: {
    type?: string;
    items?: Array<{
      _id: string;
      title: string;
      price: number;
      photos?: string[];
      distanceKm?: number;
    }>;
    aiTips?: Array<{
      type: string;
      message: string;
      icon: string;
    }>;
    watchItem?: {
      _id: string;
      title: string;
    };
    createWatchSuggestion?: boolean;
    suggestedQuery?: string;
  };
}

const SUGGESTIONS = [
  'Что есть рядом интересного?',
  'Напомни, когда появится свежая малина',
  'Где дешевле iPhone?',
  'Покажи велосипеды до 500 рублей',
];

export default function TwinChatPage() {
  const user = useUserStore((state) => state.user);
  const navigate = useNavigate();
  const { coords, status: geoStatus, requestLocation } = useGeo();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: '1',
          role: 'assistant',
          content: 'Привет! Я ваш персональный ассистент. Я могу:\n\n• Найти товары рядом с вами\n• Создать напоминание о нужных товарах\n• Следить за ценами\n\nПросто напишите, что ищете!',
          timestamp: new Date(),
        },
      ]);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/twin/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-id': String(user?.telegramId),
        },
        body: JSON.stringify({
          message: text.trim(),
          lat: coords?.lat,
          lng: coords?.lng,
          radiusKm: 10,
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        data: {
          type: data.type,
          items: data.items,
          aiTips: data.aiTips,
          watchItem: data.watchItem,
          createWatchSuggestion: data.createWatchSuggestion,
          suggestedQuery: data.suggestedQuery,
        },
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Произошла ошибка. Попробуйте ещё раз.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    sendMessage(suggestion);
  };

  const createWatchFromSuggestion = async (query: string) => {
    try {
      const response = await fetch('/api/twin/watch-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-id': String(user?.telegramId),
        },
        body: JSON.stringify({
          title: query,
          query,
          radiusKm: 10,
          notifyOnNew: true,
          notifyOnPriceDrop: true,
        }),
      });

      if (response.ok) {
        const confirmMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Отлично! Я создал напоминание "${query}". Уведомлю вас, когда появится подходящее предложение.`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, confirmMessage]);
      }
    } catch (err) {
      console.error('Create watch error:', err);
    }
  };

  const getIconForTip = (iconName: string) => {
    switch (iconName) {
      case 'clock': return <Clock className="w-4 h-4" />;
      case 'sparkles': return <Sparkles className="w-4 h-4" />;
      case 'map-pin': return <MapPin className="w-4 h-4" />;
      case 'lightbulb': return <Lightbulb className="w-4 h-4" />;
      default: return <Sparkles className="w-4 h-4" />;
    }
  };

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh',
      background: '#f8fafc' 
    }}>
      <header style={{
        padding: '12px 16px',
        background: 'white',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <button
          onClick={() => navigate('/twin')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 8,
            borderRadius: 8,
            display: 'flex',
          }}
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Brain className="w-5 h-5" style={{ color: 'white' }} />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: 16 }}>AI Ассистент</h3>
          <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>
            {geoStatus === 'ready' ? 'Геопозиция определена' : 'Геопозиция не определена'}
          </p>
        </div>
      </header>

      <div style={{ 
        flex: 1, 
        overflow: 'auto', 
        padding: 16,
        paddingBottom: 100,
      }}>
        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              marginBottom: 16,
              display: 'flex',
              flexDirection: 'column',
              alignItems: message.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                maxWidth: '85%',
                padding: 12,
                borderRadius: 16,
                background: message.role === 'user' 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                  : 'white',
                color: message.role === 'user' ? 'white' : 'inherit',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
              data-testid={`message-${message.role}-${message.id}`}
            >
              <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                {message.content}
              </p>

              {message.data?.aiTips && message.data.aiTips.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  {message.data.aiTips.map((tip, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: 8,
                        background: tip.type === 'deal' ? '#dcfce7' : '#f0f9ff',
                        borderRadius: 8,
                        marginTop: 8,
                      }}
                    >
                      <span style={{ color: tip.type === 'deal' ? '#16a34a' : '#0284c7' }}>
                        {getIconForTip(tip.icon)}
                      </span>
                      <span style={{ fontSize: 13 }}>{tip.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {message.data?.items && message.data.items.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  {message.data.items.slice(0, 3).map((item) => (
                    <Link
                      key={item._id}
                      to={`/ads/${item._id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: 10,
                        background: '#f8fafc',
                        borderRadius: 10,
                        marginTop: 8,
                        textDecoration: 'none',
                        color: 'inherit',
                      }}
                      data-testid={`link-ad-${item._id}`}
                    >
                      {item.photos?.[0] && (
                        <img
                          src={`/api/media/thumbnail/${item.photos[0]}`}
                          alt=""
                          style={{
                            width: 50,
                            height: 50,
                            borderRadius: 8,
                            objectFit: 'cover',
                          }}
                        />
                      )}
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: 500, fontSize: 14 }}>{item.title}</p>
                        <div style={{ display: 'flex', gap: 8, marginTop: 4, fontSize: 12, color: '#6b7280' }}>
                          <span style={{ fontWeight: 600, color: '#111' }}>
                            {item.price?.toLocaleString()} Br
                          </span>
                          {item.distanceKm && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <MapPin className="w-3 h-3" />
                              {item.distanceKm} км
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4" style={{ color: '#9ca3af' }} />
                    </Link>
                  ))}
                </div>
              )}

              {message.data?.createWatchSuggestion && message.data?.suggestedQuery && (
                <button
                  onClick={() => createWatchFromSuggestion(message.data!.suggestedQuery!)}
                  style={{
                    marginTop: 12,
                    padding: '10px 16px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                  data-testid="button-create-reminder"
                >
                  <Tag className="w-4 h-4" />
                  Создать напоминание
                </button>
              )}

              {message.data?.watchItem && (
                <div style={{
                  marginTop: 12,
                  padding: 10,
                  background: '#dcfce7',
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <Sparkles className="w-4 h-4" style={{ color: '#16a34a' }} />
                  <span style={{ fontSize: 13, color: '#166534' }}>
                    Напоминание создано!
                  </span>
                </div>
              )}
            </div>

            <span style={{ 
              fontSize: 11, 
              color: '#9ca3af', 
              marginTop: 4,
              paddingLeft: 4,
              paddingRight: 4,
            }}>
              {message.timestamp.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6b7280' }}>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Думаю...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {messages.length === 1 && (
        <div style={{ 
          padding: '0 16px 16px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
        }}>
          {SUGGESTIONS.map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => handleSuggestionClick(suggestion)}
              style={{
                padding: '8px 14px',
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: 20,
                cursor: 'pointer',
                fontSize: 13,
                color: '#374151',
              }}
              data-testid={`button-suggestion-${idx}`}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        background: 'white',
        borderTop: '1px solid #e2e8f0',
      }}>
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          style={{ display: 'flex', gap: 10 }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Напишите сообщение..."
            style={{ 
              flex: 1,
              padding: '12px 16px',
              borderRadius: 24,
              border: '1px solid #e2e8f0',
              fontSize: 15,
            }}
            disabled={loading}
            data-testid="input-chat-message"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: input.trim() 
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                : '#e2e8f0',
              border: 'none',
              cursor: input.trim() ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: input.trim() ? 'white' : '#9ca3af',
            }}
            data-testid="button-send-message"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
