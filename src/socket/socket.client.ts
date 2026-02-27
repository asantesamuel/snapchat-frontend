import { io, Socket } from 'socket.io-client';
import { tokenUtils } from '@/utils/token';

/**
 * Extend ImportMeta to include Vite's env properties
 */
interface ImportMeta {
  readonly env: {
    readonly [key: string]: string | undefined;
  };
}

let socket: Socket | null = null;

// creates one socket instance and reuses it
// calling this multiple times returns the same instance
export const getSocket = (): Socket => {
  if (!socket) {
    socket = io((import.meta as unknown as ImportMeta).env.VITE_SOCKET_URL as string, {
      auth: { token: tokenUtils.getAccessToken() },
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socket;
};

export const connectSocket = (): void => {
  const s = getSocket();
  if (!s.connected) s.connect();
};

export const disconnectSocket = (): void => {
  if (socket?.connected) {
    socket.disconnect();
    socket = null;
  }
};