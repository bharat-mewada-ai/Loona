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

export const useMessages = (chatId: string) => {
  const qc = useQueryClient();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!chatId || !token) return;

    const s = getSocket(token);

    // Join the chat room so the server emits newMessage events here
    s.emit('joinChat', chatId);

    // When a new message arrives, update cache manually for zero-latency
    const handleNewMessage = (msg: any) => {
      qc.setQueryData(['messages', chatId], (old: any) => {
        if (!old) return old;
        // Check if message already exists (e.g. from the sender's own HTTP response)
        const exists = old.messages.some((m: any) => m._id === msg._id);
        if (exists) return old;

        const formattedMsg = {
          ...msg,
          senderType: msg.senderId === undefined ? 'other' : (msg.senderId === user?._id ? 'me' : 'other'),
          senderId: undefined
        };

        return {
          ...old,
          messages: [...old.messages, formattedMsg]
        };
      });
      
      // Still invalidate chats to update preview/unread count in the list
      qc.invalidateQueries({ queryKey: ['chats'] });
    };

    s.on('newMessage', handleNewMessage);

    return () => {
      s.emit('leaveChat', chatId);
      s.off('newMessage', handleNewMessage);
    };
  }, [chatId, token, qc, user?._id]);

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
    onSuccess: (newMsg, { chatId }) => {
      qc.setQueryData(['messages', chatId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          messages: [...old.messages, newMsg]
        };
      });
      qc.invalidateQueries({ queryKey: ['chats'] });
    },
  });
};
