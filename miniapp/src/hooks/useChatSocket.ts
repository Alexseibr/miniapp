import { useEffect, useRef } from 'react';

interface ChatSocketOptions {
  threadId?: string;
  token?: string | null;
  onEvent?: (event: string, payload: any) => void;
}

export function useChatSocket({ threadId, token, onEvent }: ChatSocketOptions) {
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!threadId || !token) return;

    const base = import.meta.env.VITE_API_BASE_URL || window.location.origin;
    const wsUrl = base.replace(/^http/, 'ws');
    const url = `${wsUrl}/ws/chat?token=${encodeURIComponent(token)}`;
    const socket = new WebSocket(url);
    socketRef.current = socket;

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: 'chat:join', threadId }));
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data?.event && onEvent) {
          onEvent(data.event, data.payload ?? data);
        }
      } catch (error) {
        console.error('Chat socket parse error', error);
      }
    };

    socket.onerror = (error) => {
      console.error('Chat socket error', error);
    };

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [threadId, token, onEvent]);

  return socketRef.current;
}
