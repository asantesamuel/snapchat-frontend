import { useEffect } from 'react';
import { getSocket, connectSocket, disconnectSocket } from '@/socket/socket.client';
import { useAuthStore } from '@/store/auth.store';

// initialises the socket connection when the user is authenticated
// and tears it down cleanly on logout
// all other hooks (useMessages, useTyping) call getSocket() directly
// because the connection is already established here

export const useSocket = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;

    connectSocket();
    const socket = getSocket();

    socket.on('connect', () => {
      console.log('🔌 Socket connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.error('🔌 Socket connection error:', err.message);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
    };
  }, [isAuthenticated]);
};