import { apiClient } from './client';
import type { Friendship, PendingRequest } from '@/types/friendship.types';

export const friendshipsApi = {
  send: (recipientUsername: string) =>
    apiClient.post<{ message: string }>('/api/friendships', { recipientUsername })
      .then(r => r.data),

  list: () =>
    apiClient.get<{ friendships: Friendship[]; total: number }>('/api/friendships')
      .then(r => r.data),

  pending: () =>
    apiClient.get<{ friendships: PendingRequest[]; total: number }>('/api/friendships/pending')
      .then(r => r.data),

  accept: (id: string) =>
    apiClient.patch<{ message: string }>(`/api/friendships/${id}/accept`)
      .then(r => r.data),

  reject: (id: string) =>
    apiClient.patch<{ message: string }>(`/api/friendships/${id}/reject`)
      .then(r => r.data),

  remove: (id: string) =>
    apiClient.delete<{ message: string }>(`/api/friendships/${id}`)
      .then(r => r.data),
};