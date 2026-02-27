import { apiClient } from './client';
import type { CreateReportDto } from '@/types/moderation.types';

export const moderationApi = {
  block: (username: string) =>
    apiClient.post('/api/moderation/blocks', { username }).then(r => r.data),

  unblock: (username: string) =>
    apiClient.delete(`/api/moderation/blocks/${username}`).then(r => r.data),

  getBlocks: () =>
    apiClient.get('/api/moderation/blocks').then(r => r.data),

  mute: (username: string, muteType: 'stories' | 'chat') =>
    apiClient.post('/api/moderation/mutes', { username, muteType })
      .then(r => r.data),

  unmute: (username: string, muteType: 'stories' | 'chat') =>
    apiClient.delete(`/api/moderation/mutes/${username}/${muteType}`)
      .then(r => r.data),

  report: (dto: CreateReportDto) =>
    apiClient.post('/api/moderation/reports', dto).then(r => r.data),

  exportData: () =>
    apiClient.get('/api/moderation/data-export').then(r => r.data),

  deleteAccount: (password: string) =>
    apiClient.delete('/api/moderation/account', { data: { password } })
      .then(r => r.data),
};