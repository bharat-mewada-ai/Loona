import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatApi } from '../api/chat.api';
import { useAuthStore } from '../store/authStore';
import { getSocket } from '../utils/socket';

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
    mutationFn: ({ chatId, content, image }: { chatId: string; content: string; image?: string }) =>
      chatApi.sendMessage(chatId, content, image),
    onSuccess: (_data, { chatId }) => {
      qc.invalidateQueries({ queryKey: ['messages', chatId] });
      qc.invalidateQueries({ queryKey: ['chats'] });
    },
  });
};
