import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { chatApi } from '../api/chat.api';
import { useAuthStore } from '../store/authStore';
import { API_URL } from '../constants';

// ─── Singleton Socket.IO client ───────────────────────────────────────────────
// Created once per app session. Passes JWT so the server's io.use() middleware
// can verify it before accepting the connection.
let socket: Socket | null = null;

const getSocket = (token: string): Socket => {
  if (!socket || !socket.connected) {
    const baseUrl = API_URL.replace('/api', ''); // strip /api path for socket root
    socket = io(baseUrl, {
      auth: { token },               // ← sent as handshake.auth.token on the server
      transports: ['websocket'],     // skip long-polling, direct websocket
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
  }
  return socket;
};

/** Call this on logout to cleanly disconnect the socket. */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// ─── useChats ────────────────────────────────────────────────────────────────
export const useChats = () => {
  return useQuery({
    queryKey: ['chats'],
    queryFn: chatApi.getChats,
    refetchInterval: 5000,
  });
};

// ─── useStartChat ────────────────────────────────────────────────────────────
export const useStartChat = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ targetUserId, postId }: { targetUserId: string; postId: string }) =>
      chatApi.startChat(targetUserId, postId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chats'] });
    },
  });
};

// ─── useMessages — real-time via Socket.IO + HTTP fallback ──────────────────
export const useMessages = (chatId: string) => {
  const qc = useQueryClient();
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!chatId || !token) return;

    const s = getSocket(token);

    // Join the chat room so the server emits newMessage events here
    s.emit('joinChat', chatId);

    // When a new message arrives, invalidate the query to re-fetch
    const handleNewMessage = () => {
      qc.invalidateQueries({ queryKey: ['messages', chatId] });
      qc.invalidateQueries({ queryKey: ['chats'] });
    };
    s.on('newMessage', handleNewMessage);

    return () => {
      s.emit('leaveChat', chatId);
      s.off('newMessage', handleNewMessage);
    };
  }, [chatId, token]);

  return useQuery({
    queryKey: ['messages', chatId],
    queryFn: () => chatApi.getMessages(chatId),
    enabled: !!chatId,
    // Fallback polling — still catches messages if socket drops
    refetchInterval: 10_000,
  });
};

// ─── useSendMessage ──────────────────────────────────────────────────────────
export const useSendMessage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ chatId, content }: { chatId: string; content: string }) =>
      chatApi.sendMessage(chatId, content),
    onSuccess: (_data, { chatId }) => {
      qc.invalidateQueries({ queryKey: ['messages', chatId] });
      qc.invalidateQueries({ queryKey: ['chats'] });
    },
  });
};
