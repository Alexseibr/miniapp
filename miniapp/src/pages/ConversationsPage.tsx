import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import http from '@/api/http';
import { useUserStore } from '@/store/useUserStore';
import { MessageCircle, Loader2, ChevronRight } from 'lucide-react';

interface Conversation {
  _id: string;
  ad?: {
    _id: string;
    title: string;
    price: number;
    images?: string[];
  } | null;
  interlocutor?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    telegramUsername?: string;
    avatar?: string;
  } | null;
  lastMessage?: {
    _id: string;
    text: string;
    createdAt: string;
    sender: string;
  } | null;
}

export default function ConversationsPage() {
  const navigate = useNavigate();
  const user = useUserStore((state) => state.user);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const { data } = await http.get('/api/chat/my');
        setConversations(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load conversations:', err);
        setError('Не удалось загрузить чаты');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [user]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин`;
    if (diffHours < 24) return `${diffHours} ч`;
    if (diffDays < 7) return `${diffDays} д`;
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  if (!user) {
    return (
      <div className="container">
        <div
          style={{
            textAlign: 'center',
            padding: '40px 20px',
          }}
        >
          <MessageCircle size={64} style={{ color: 'var(--color-secondary-soft)', margin: '0 auto 16px' }} />
          <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 600 }}>Чаты</h2>
          <p style={{ color: 'var(--color-secondary)', marginBottom: '24px' }}>
            Войдите для просмотра ваших чатов
          </p>
          <Link
            to="/profile"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              background: 'var(--color-primary)',
              color: '#fff',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
            }}
            data-testid="link-login"
          >
            Перейти к профилю
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 700 }}>Чаты</h1>
        <p style={{ margin: 0, color: 'var(--color-secondary)' }}>
          {conversations.length > 0
            ? `${conversations.length} ${conversations.length === 1 ? 'диалог' : conversations.length < 5 ? 'диалога' : 'диалогов'}`
            : 'Нет активных диалогов'}
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <Loader2 className="loading-spinner" size={32} />
        </div>
      ) : error ? (
        <div
          style={{
            padding: '16px',
            background: 'var(--color-error-bg)',
            border: '1px solid var(--color-error)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-error)',
          }}
          data-testid="error-message"
        >
          {error}
        </div>
      ) : conversations.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-sm)',
          }}
          data-testid="empty-state"
        >
          <MessageCircle size={64} style={{ color: 'var(--color-secondary-soft)', margin: '0 auto 16px' }} />
          <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 600 }}>Нет чатов</h3>
          <p style={{ margin: '0 0 24px', color: 'var(--color-secondary)', fontSize: '14px' }}>
            Начните диалог с продавцом через объявление
          </p>
          <Link
            to="/feed"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              background: 'var(--color-primary)',
              color: '#fff',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
            }}
            data-testid="link-feed"
          >
            Смотреть объявления
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }} data-testid="conversations-list">
          {conversations.map((conversation) => {
            const interlocutorName = conversation.interlocutor
              ? conversation.interlocutor.firstName || conversation.interlocutor.lastName
                ? `${conversation.interlocutor.firstName || ''} ${conversation.interlocutor.lastName || ''}`.trim()
                : conversation.interlocutor.username || conversation.interlocutor.telegramUsername || 'Пользователь'
              : 'Пользователь';

            const isMyMessage = conversation.lastMessage?.sender === user._id;

            return (
              <div
                key={conversation._id}
                onClick={() => navigate(`/chat/${conversation._id}`)}
                style={{
                  display: 'flex',
                  gap: '12px',
                  padding: '16px',
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-sm)',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                  border: '1px solid var(--color-secondary-soft)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                }}
                data-testid={`conversation-${conversation._id}`}
              >
                {/* Avatar or Ad Image */}
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-tertiary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    overflow: 'hidden',
                  }}
                >
                  {conversation.ad?.images?.[0] ? (
                    <img
                      src={conversation.ad.images[0]}
                      alt={conversation.ad.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <MessageCircle size={28} style={{ color: 'var(--color-secondary)' }} />
                  )}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: '16px',
                        fontWeight: 600,
                        color: 'var(--color-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {interlocutorName}
                    </h3>
                    {conversation.lastMessage && (
                      <span
                        style={{
                          fontSize: '12px',
                          color: 'var(--color-secondary)',
                          flexShrink: 0,
                        }}
                      >
                        {formatTime(conversation.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>

                  {conversation.ad && (
                    <div
                      style={{
                        fontSize: '13px',
                        color: 'var(--color-secondary)',
                        marginTop: '2px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {conversation.ad.title}
                      {conversation.ad.price && (
                        <span style={{ fontWeight: 600, marginLeft: '8px' }}>
                          {conversation.ad.price.toLocaleString('ru-RU')} ₽
                        </span>
                      )}
                    </div>
                  )}

                  {conversation.lastMessage && (
                    <p
                      style={{
                        margin: '6px 0 0',
                        fontSize: '14px',
                        color: 'var(--color-secondary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {isMyMessage && <span style={{ fontWeight: 600 }}>Вы: </span>}
                      {conversation.lastMessage.text}
                    </p>
                  )}
                </div>

                {/* Chevron */}
                <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  <ChevronRight size={20} style={{ color: 'var(--color-secondary)' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
