import { io, Socket } from 'socket.io-client';
import { API_URL } from '../constants';

/**
 * Socket Manager
 * Handles the singleton connection to the Socket.IO server.
 * Extracted from hooks to prevent circular dependencies.
 */

let socket: Socket | null = null;

export const getSocket = (token: string): Socket => {
  if (!socket || !socket.connected) {
    const baseUrl = API_URL.replace('/api', ''); 
    socket = io(baseUrl, {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const reconnectSocket = (token: string): Socket => {
  disconnectSocket();
  return getSocket(token);
};

