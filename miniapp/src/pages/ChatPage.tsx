import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import http from '@/api/http';
import { useUserStore } from '@/store/useUserStore';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';

interface Message {
  _id: string;
  text: string;
  sender: string;
  createdAt: string;
}

interface ConversationDetails {
  _id: string;
  ad?: {
    _id: string;
    title: string;
    price: number;
    images?: string[];
  };
  participants: Array<{
    _id: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    telegramUsername?: string;
  }>;
}

export default function ChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const user = useUserStore((state) => state.user);
  const [conversation, setConversation] = useState<ConversationDetails | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMessageTimeRef = useRef<string | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const load = async () => {
      if (!conversationId) return;
      setLoading(true);
      try {
        const { data: messagesData } = await http.get(`/api/chat/${conversationId}/messages`);
        const messagesList = Array.isArray(messagesData) ? messagesData : messagesData.items ?? [];
        setMessages(messagesList);
        const last = messagesList.slice(-1)[0];
        lastMessageTimeRef.current = last?.createdAt;

        // Get conversation details from /api/chat/my
        const { data: conversationsData } = await http.get('/api/chat/my');
        const conv = conversationsData.find((c: ConversationDetails) => c._id === conversationId);
        if (conv) {
          setConversation(conv);
        }
      } catch (error) {
        console.error('Failed to load chat:', error);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!conversationId) return;
    pollingRef.current = setInterval(async () => {
      try {
        const since = lastMessageTimeRef.current;
        const { data } = await http.get(`/api/chat/${conversationId}/poll`, { params: { since } });
        const newMessages = data?.messages || [];
        if (Array.isArray(newMessages) && newMessages.length > 0) {
          lastMessageTimeRef.current = data.newSince || newMessages[newMessages.length - 1]?.createdAt || since;
          setMessages((prev) => [...prev, ...newMessages]);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 3000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [conversationId]);

  const sendMessage = async () => {
    if (!text.trim() || !conversationId || sending) return;
    const newMessage = text.trim();
    setText('');
    setSending(true);
    try {
      const { data } = await http.post(`/api/chat/${conversationId}/messages`, { text: newMessage });
      setMessages((prev) => [...prev, data]);
      lastMessageTimeRef.current = data.createdAt;
    } catch (error) {
      console.error('Failed to send message:', error);
      setText(newMessage);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!user) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-secondary)', marginBottom: '16px' }}>
          Войдите для просмотра чата
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
    );
  }

  const interlocutor = conversation?.participants?.find((p) => p._id !== user._id);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'var(--bg-secondary)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px',
          background: 'var(--bg-elevated)',
          borderBottom: '1px solid var(--color-secondary-soft)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
        data-testid="chat-header"
      >
        <button
          onClick={() => navigate('/chats')}
          style={{
            background: 'transparent',
            border: 'none',
            padding: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            color: 'var(--color-primary)',
          }}
          data-testid="button-back"
        >
          <ArrowLeft size={24} />
        </button>
        <div style={{ flex: 1 }}>
          {conversation?.ad && (
            <Link
              to={`/ads/${conversation.ad._id}`}
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--color-primary)',
                display: 'block',
                marginBottom: '2px',
              }}
              data-testid="link-ad"
            >
              {conversation.ad.title}
            </Link>
          )}
          <div style={{ fontSize: '14px', color: 'var(--color-secondary)' }}>
            {interlocutor
              ? interlocutor.firstName || interlocutor.lastName
                ? `${interlocutor.firstName || ''} ${interlocutor.lastName || ''}`.trim()
                : interlocutor.username || interlocutor.telegramUsername || 'Пользователь'
              : 'Чат'}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          paddingBottom: '100px',
        }}
        data-testid="messages-container"
      >
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Loader2 className="loading-spinner" size={32} />
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-secondary)' }}>
            <p>Нет сообщений</p>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>Начните переписку</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.map((message) => {
              const isMine = message.sender === user._id;
              return (
                <div
                  key={message._id}
                  style={{
                    display: 'flex',
                    justifyContent: isMine ? 'flex-end' : 'flex-start',
                  }}
                  data-testid={`message-${message._id}`}
                >
                  <div
                    style={{
                      maxWidth: '75%',
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-lg)',
                      background: isMine ? 'var(--color-primary)' : 'var(--bg-elevated)',
                      color: isMine ? '#fff' : 'var(--color-primary)',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    <p style={{ margin: 0, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                      {message.text}
                    </p>
                    <div
                      style={{
                        fontSize: '11px',
                        marginTop: '6px',
                        opacity: 0.7,
                        textAlign: 'right',
                      }}
                    >
                      {new Date(message.createdAt).toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '12px 16px',
          background: 'var(--bg-elevated)',
          borderTop: '1px solid var(--color-secondary-soft)',
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-end',
        }}
        data-testid="chat-input-container"
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Сообщение..."
          disabled={sending}
          style={{
            flex: 1,
            padding: '12px',
            border: '1px solid var(--color-secondary-soft)',
            borderRadius: 'var(--radius-md)',
            fontSize: '16px',
            fontFamily: 'inherit',
            background: 'var(--bg-primary)',
            color: 'var(--color-primary)',
            resize: 'none',
            minHeight: '44px',
            maxHeight: '120px',
          }}
          rows={1}
          data-testid="input-message"
        />
        <button
          onClick={sendMessage}
          disabled={!text.trim() || sending}
          style={{
            padding: '12px',
            background: text.trim() && !sending ? 'var(--color-primary)' : 'var(--color-secondary-soft)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: text.trim() && !sending ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '44px',
            minHeight: '44px',
            transition: 'background 150ms ease',
          }}
          data-testid="button-send"
        >
          {sending ? <Loader2 className="loading-spinner" size={20} /> : <Send size={20} />}
        </button>
      </div>
    </div>
  );
}
