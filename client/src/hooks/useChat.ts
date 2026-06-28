import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatApi } from '../api/chat.api';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '../store/authStore';
import { getSocket } from '../utils/socket';

// ─── useChats ────────────────────────────────────────────────────────────────
export const useChats = () => {
  return useQuery({
    queryKey: ['chats'],
    queryFn: chatApi.getChats,
    refetchInterval: 30_000,
  });
};

export const useStartChat = () => {
  const qc = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({
    mutationFn: ({ targetUserId, postId }: { targetUserId: string; postId?: string }) =>
      chatApi.startChat(targetUserId, postId),
    onMutate: async (variables) => {
      // Optimistic update: Deduct 10 potatoes instantly on UI if starting chat from Nearby
      if (variables.postId === 'nearby') {
        const currentUser = useAuthStore.getState().user;
        if (currentUser) {
          setUser({
            ...currentUser,
            potato: Math.max(0, (currentUser.potato || 0) - 10)
          });
        }
      }
    },
    onError: async (_err, variables) => {
      // Rollback/sync if it fails
      if (variables.postId === 'nearby') {
        qc.invalidateQueries({ queryKey: ['me'] });
      }
    },
    onSuccess: async (_, variables) => {
      qc.invalidateQueries({ queryKey: ['chats'] });
      // Sync potato balance in real-time only if the chat cost potatoes (started from Nearby)
      if (variables.postId === 'nearby') {
        qc.invalidateQueries({ queryKey: ['me'] });
      }
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

    const handleMessageReaction = (payload: any) => {
      if (payload.chatId === chatId) {
        qc.setQueryData(['messages', chatId], (old: any) => {
          if (!old || !old.messages) return old;
          return {
            ...old,
            messages: old.messages.map((m: any) => {
              if (m._id !== payload.messageId) return m;
              const newReactions = { ...(m.reactions || {}) };
              if (!payload.reaction) {
                delete newReactions[payload.userId];
              } else {
                newReactions[payload.userId] = payload.reaction;
              }
              return { ...m, reactions: newReactions };
            })
          };
        });
      }
    };

    s.on('messageReaction', handleMessageReaction);

    const handleIdentityRevealed = (payload: any) => {
      if (payload.chatId === chatId) {
        qc.invalidateQueries({ queryKey: ['messages', chatId] });
        qc.invalidateQueries({ queryKey: ['chats'] });
      }
    };

    s.on('identityRevealed', handleIdentityRevealed);

    const handleChatDeleted = (payload: any) => {
      if (payload.chatId === chatId) {
        qc.setQueryData(['messages', chatId], null);
        qc.invalidateQueries({ queryKey: ['chats'] });
      }
    };

    s.on('chatDeleted', handleChatDeleted);

    return () => {
      s.emit('leaveChat', chatId);
      s.off('newMessage', handleNewMessage);
      s.off('messageReaction', handleMessageReaction);
      s.off('identityRevealed', handleIdentityRevealed);
      s.off('chatDeleted', handleChatDeleted);
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
    onMutate: async ({ chatId, content, image }) => {
      const queryKey = ['messages', chatId];
      await qc.cancelQueries({ queryKey });

      const previousMessages = qc.getQueryData(queryKey);
      const tempId = `temp-${Date.now()}`;
      
      const optimisticMsg = {
        _id: tempId,
        chatId,
        content,
        image,
        senderType: 'me',
        createdAt: new Date().toISOString(),
        isOptimistic: true,
        status: 'sending',
      };

      qc.setQueryData(queryKey, (old: any) => {
        if (!old) return { messages: [optimisticMsg] };
        return {
          ...old,
          messages: [...(old.messages || []), optimisticMsg]
        };
      });

      return { previousMessages, tempId, chatId };
    },
    onError: (err, variables, context) => {
      if (context?.previousMessages) {
        qc.setQueryData(['messages', context.chatId], context.previousMessages);
      }
    },
    onSuccess: (newMsg, variables, context) => {
      qc.setQueryData(['messages', context.chatId], (old: any) => {
        if (!old || !old.messages) return old;
        return {
          ...old,
          messages: old.messages.map((m: any) => m._id === context.tempId ? newMsg : m)
        };
      });
    },
    onSettled: (data, error, variables, context) => {
      qc.invalidateQueries({ queryKey: ['chats'] });
    },
  });
};

export const useRevealIdentity = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (chatId: string) => chatApi.revealIdentity(chatId),
    onSuccess: (_, chatId) => {
      qc.invalidateQueries({ queryKey: ['messages', chatId] });
      qc.invalidateQueries({ queryKey: ['chats'] });
    },
  });
};

export const useDeleteChat = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (chatId: string) => chatApi.deleteChat(chatId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chats'] });
    },
  });
};

export const useReactToMessage = () => {
  const qc = useQueryClient();
  const user = useAuthStore(s => s.user);
  return useMutation({
    mutationFn: ({ chatId, messageId, reaction }: { chatId: string; messageId: string; reaction: string | null }) =>
      chatApi.reactToMessage(chatId, messageId, reaction),
    onMutate: async ({ chatId, messageId, reaction }) => {
      const queryKey = ['messages', chatId];
      await qc.cancelQueries({ queryKey });
      const previousMessages = qc.getQueryData(queryKey);

      qc.setQueryData(queryKey, (old: any) => {
        if (!old || !old.messages || !user) return old;
        return {
          ...old,
          messages: old.messages.map((m: any) => {
            if (m._id !== messageId) return m;
            const newReactions = { ...(m.reactions || {}) };
            if (!reaction) {
              delete newReactions[user._id];
            } else {
              newReactions[user._id] = reaction;
            }
            return { ...m, reactions: newReactions };
          })
        };
      });

      return { previousMessages, chatId };
    },
    onError: (err, variables, context) => {
      if (context?.previousMessages) {
        qc.setQueryData(['messages', context.chatId], context.previousMessages);
      }
    },
    onSettled: (data, error, variables, context) => {
      qc.invalidateQueries({ queryKey: ['messages', context?.chatId] });
    }
  });
};
