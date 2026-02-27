import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/api/auth.api';
import { connectSocket, disconnectSocket } from '@/socket/socket.client';
import type { LoginDto, RegisterDto } from '@/types/auth.types';

export const useAuth = () => {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { user, isAuthenticated, setAuth, clearAuth } = useAuthStore();

  const login = useCallback(async (dto: LoginDto) => {
    const data = await authApi.login(dto);
    setAuth(data.user, data.accessToken, data.refreshToken);
    connectSocket();
    // redirect back to where they were trying to go, or /chat
    const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/chat';
    navigate(from, { replace: true });
    toast.success(`Welcome back, ${data.user.username}!`);
  }, [location.state, navigate, setAuth]);

  const register = useCallback(async (dto: RegisterDto) => {
    await authApi.register(dto);
    toast.success('Account created! Please log in.');
    navigate('/login');
  }, [navigate]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // even if the API call fails, clear local state
    } finally {
      disconnectSocket();
      clearAuth();
      navigate('/login', { replace: true });
      toast.success('Logged out');
    }
  }, [clearAuth, navigate]);

  return { user, isAuthenticated, login, register, logout };
};