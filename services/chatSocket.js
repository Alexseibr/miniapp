import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import ChatThread from '../models/ChatThread.js';
import User from '../models/User.js';

let chatWss = null;
const rooms = new Map(); // threadId -> Set<WebSocket>

function cleanupSocket(ws) {
  rooms.forEach((clients, threadId) => {
    if (clients.has(ws)) {
      clients.delete(ws);
      if (clients.size === 0) {
        rooms.delete(threadId);
      }
    }
  });
}

async function authenticateRequest(req) {
  try {
    const { searchParams } = new URL(req.url, 'http://localhost');
    const token = searchParams.get('token');
    if (!token) return null;
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const userId = payload?.id || payload?.userId || payload?._id;
    if (!userId) return null;
    const user = await User.findById(userId);
    return user || null;
  } catch (error) {
    return null;
  }
}

async function canJoinThread(userId, threadId) {
  const thread = await ChatThread.findById(threadId);
  if (!thread) return false;
  return (
    thread.buyerId?.toString() === userId.toString() || thread.sellerId?.toString() === userId.toString()
  );
}

function joinRoom(ws, threadId) {
  const existing = rooms.get(threadId) || new Set();
  existing.add(ws);
  rooms.set(threadId, existing);
  ws.joinedThreads = ws.joinedThreads || new Set();
  ws.joinedThreads.add(threadId);
}

export function broadcastChatEvent(threadId, event, payload) {
  const clients = rooms.get(threadId);
  if (!clients) return;
  const message = JSON.stringify({ event, threadId, payload });
  clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
}

export function setupChatSocket(server) {
  chatWss = new WebSocketServer({ noServer: true });

  server.on('upgrade', async (req, socket, head) => {
    const { pathname } = new URL(req.url, 'http://localhost');
    if (pathname !== '/ws/chat') {
      socket.destroy();
      return;
    }

    const user = await authenticateRequest(req);
    if (!user) {
      socket.destroy();
      return;
    }

    chatWss.handleUpgrade(req, socket, head, (ws) => {
      ws.user = user;
      ws.joinedThreads = new Set();
      chatWss.emit('connection', ws, req);
    });
  });

  chatWss.on('connection', (ws) => {
    ws.on('message', async (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        if (parsed?.type === 'chat:join' && parsed.threadId) {
          if (await canJoinThread(ws.user._id, parsed.threadId)) {
            joinRoom(ws, parsed.threadId);
            ws.send(
              JSON.stringify({
                event: 'chat:joined',
                threadId: parsed.threadId,
              })
            );
          }
        }
      } catch (error) {
        console.error('Chat socket error:', error);
      }
    });

    ws.on('close', () => {
      cleanupSocket(ws);
    });
  });

  return chatWss;
}

export function getChatSocket() {
  return chatWss;
}
