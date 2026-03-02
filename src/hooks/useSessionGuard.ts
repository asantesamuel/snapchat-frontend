import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { usersApi } from '@/api/users.api';
import { disconnectSocket } from '@/socket/socket.client';

// runs once on app mount
// verifies the stored session is still valid on the backend
// if the token is revoked or expired beyond refresh, clears state and
// sends the user to login — without this, a user whose account was
// deleted or whose session was revoked server-side would stay "logged in"
// on the frontend indefinitely

export const useSessionGuard = () => {
  const { isAuthenticated, clearAuth } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) return;

    const verify = async () => {
      try {
        // GET /api/users/me uses the access token
        // the Axios interceptor will attempt a refresh if it is expired
        // if the refresh also fails, the interceptor redirects to /login
        // if both succeed, the session is valid — do nothing
        await usersApi.getMe();
      } catch {
        // only reaches here if both access AND refresh tokens are invalid
        // (interceptor already tried the refresh before throwing)
        disconnectSocket();
        clearAuth();
      }
    };

    verify();
  }, [isAuthenticated, clearAuth]);
};