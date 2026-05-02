import client from './client';

export const chatApi = {
  // Get all chats for the user
  getChats: async () => {
    const res = await client.get('/chats');
    return res.data;
  },

  // Start a new chat or get existing one
  startChat: async (targetUserId: string, postId: string) => {
    const res = await client.post('/chats/start', { targetUserId, postId });
    return res.data;
  },

  // Get messages for a chat
  getMessages: async (chatId: string) => {
    const res = await client.get(`/chats/${chatId}/messages`);
    return res.data;
  },

  // Send a message
  sendMessage: async (chatId: string, content: string) => {
    const res = await client.post(`/chats/${chatId}/messages`, { content });
    return res.data;
  },
};
