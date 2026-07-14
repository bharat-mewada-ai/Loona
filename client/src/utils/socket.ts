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
      // Detect dropped connections faster (default is 20s)
      timeout: 10_000,
      // Reconnect up to 10 times with exponential backoff (capped at 5s)
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      // Prevent accidentally creating a duplicate socket on re-renders
      forceNew: false,
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

