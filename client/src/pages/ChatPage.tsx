import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "@/api/client";
import { useAuth } from "@/context/AuthContext";

interface Message {
  _id: string;
  text: string;
  senderId: string;
  createdAt: string;
}

export default function ChatPage() {
  const { conversationId } = useParams();
  const { token, currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMessageTimeRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const load = async () => {
      if (!conversationId) return;
      setLoading(true);
      try {
        const { data } = await api.get(`/chat/${conversationId}/messages`);
        setMessages(Array.isArray(data) ? data : data.items ?? []);
        const last = (Array.isArray(data) ? data : data.items)?.slice(-1)[0];
        lastMessageTimeRef.current = last?.createdAt;
      } catch (requestError) {
        console.error(requestError);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;
    pollingRef.current = setInterval(async () => {
      try {
        const since = lastMessageTimeRef.current;
        const { data } = await api.get(`/chat/${conversationId}/poll`, { params: { since } });
        if (Array.isArray(data) && data.length) {
          lastMessageTimeRef.current = data[data.length - 1]?.createdAt || since;
          setMessages((prev) => [...prev, ...data]);
        }
      } catch (requestError) {
        console.error(requestError);
      }
    }, 3000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [conversationId]);

  const sendMessage = async () => {
    if (!text.trim() || !conversationId) return;
    const newMessage = text;
    setText("");
    try {
      const { data } = await api.post(`/chat/${conversationId}/messages`, { text: newMessage });
      setMessages((prev) => [...prev, data]);
    } catch (requestError) {
      console.error(requestError);
    }
  };

  if (!token) {
    return (
      <div className="page">
        <p>Войдите для просмотра чата.</p>
        <Link to="/login">Перейти к авторизации</Link>
      </div>
    );
  }

  return (
    <div className="page chat-page">
      <h1>Чат</h1>
      {loading && <div className="loader">Загрузка…</div>}
      <div className="chat-window">
        {messages.map((message) => {
          const isMine = message.senderId === currentUser?._id;
          return (
            <div key={message._id} className={`chat-message ${isMine ? "mine" : ""}`}>
              <div className="chat-bubble">
                <p>{message.text}</p>
                <span className="chat-time">{new Date(message.createdAt).toLocaleTimeString()}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="chat-input">
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Сообщение" />
        <button onClick={sendMessage}>Отправить</button>
      </div>
    </div>
  );
}
