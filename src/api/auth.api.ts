import { apiClient } from './client';
import type {
  LoginDto, RegisterDto, AuthResponse,
  ForgotPasswordDto, ResetPasswordDto,
} from '@/types/auth.types';

export const authApi = {
  register: (dto: RegisterDto) =>
    apiClient.post<{ message: string }>('/api/auth/register', dto)
      .then(r => r.data),

  login: (dto: LoginDto) =>
    apiClient.post<AuthResponse>('/api/auth/login', dto)
      .then(r => r.data),

  logout: () =>
    apiClient.post<{ message: string }>('/api/auth/logout')
      .then(r => r.data),

  forgotPassword: (dto: ForgotPasswordDto) =>
    apiClient.post<{ message: string }>('/api/auth/forgot-password', dto)
      .then(r => r.data),

  resetPassword: (dto: ResetPasswordDto) =>
    apiClient.post<{ message: string }>('/api/auth/reset-password', dto)
      .then(r => r.data),
};