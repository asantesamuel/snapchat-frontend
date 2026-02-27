import { apiClient } from './client';
import type { Message, ConversationPreview } from '@/types/message.types';

export const messagesApi = {
  getConversations: () =>
    apiClient.get<ConversationPreview[]>('/api/messages/conversations')
      .then(r => r.data),

  getDirectHistory: (userId: string, page = 1, limit = 50) =>
    apiClient.get<{ messages: Message[]; total: number }>(
      `/api/messages/direct/${userId}`, { params: { page, limit } }
    ).then(r => r.data),

  getGroupHistory: (groupId: string, page = 1, limit = 50) =>
    apiClient.get<{ messages: Message[]; total: number }>(
      `/api/messages/group/${groupId}`, { params: { page, limit } }
    ).then(r => r.data),
};