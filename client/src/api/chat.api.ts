import client from './client';
import { Chat, Message } from '../types';

export const chatApi = {
  // Get all chats for the user
  getChats: async (): Promise<Chat[]> => {
    const res = await client.get<Chat[]>('/chats');
    return res.data;
  },

  // Start a new chat or get existing one
  startChat: async (targetUserId: string, postId?: string): Promise<Chat> => {
    const res = await client.post<Chat>('/chats/start', { targetUserId, postId });
    return res.data;
  },

  // Get messages for a chat
  getMessages: async (chatId: string): Promise<{ chat: Chat; messages: Message[] }> => {
    const res = await client.get<{ chat: Chat; messages: Message[] }>(`/chats/${chatId}/messages`);
    return res.data;
  },

  // Send a message
  sendMessage: async (chatId: string, content: string, image?: string): Promise<Message> => {
    const res = await client.post<Message>(`/chats/${chatId}/messages`, { content, image });
    return res.data;
  },

  // Reveal anonymous identity in a chat
  revealIdentity: async (chatId: string): Promise<any> => {
    const res = await client.post(`/chats/${chatId}/reveal`);
    return res.data;
  },

  // Delete a chat room and its history
  deleteChat: async (chatId: string): Promise<{ success: boolean; message: string }> => {
    const res = await client.delete<{ success: boolean; message: string }>(`/chats/${chatId}`);
    return res.data;
  },
};
