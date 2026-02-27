import { apiClient } from './client';
import type { UserProfile, PublicProfile, UpdateProfileDto, SearchResult } from '@/types/user.types';

export const usersApi = {
  getMe: () =>
    apiClient.get<UserProfile>('/api/users/me').then(r => r.data),

  updateMe: (dto: UpdateProfileDto) =>
    apiClient.patch<UserProfile>('/api/users/me', dto).then(r => r.data),

  requestAvatarUpload: (fileExtension: string) =>
    apiClient.post<{ uploadUrl: string; fileUrl: string }>
      ('/api/users/me/avatar', { fileExtension }).then(r => r.data),

  confirmAvatarUpload: (avatarUrl: string) =>
    apiClient.patch<UserProfile>('/api/users/me/avatar', { avatarUrl })
      .then(r => r.data),

  getProfile: (username: string) =>
    apiClient.get<PublicProfile>(`/api/users/${username}`).then(r => r.data),

  search: (q: string, page = 1, limit = 20) =>
    apiClient.get<SearchResult>('/api/users/search', { params: { q, page, limit } })
      .then(r => r.data),
};