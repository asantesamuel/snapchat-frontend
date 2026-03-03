import { apiClient } from './client';
import type { Message, ConversationPreview } from '@/types/message.types';

// Map backend response to ConversationPreview
// Backend returns snake_case: { conversation_id, is_group, name, avatarUrl, last_message, last_message_at, unread_count }
// Frontend expects camelCase: { conversationId, isGroup, name, avatarUrl, lastMessage, lastMessageAt, unreadCount }
const mapConversationResponse = (data: any): ConversationPreview => {
  return {
    conversationId: data.conversation_id || '',
    isGroup: Boolean(data.is_group),
    name: data.name || '',
    avatarUrl: data.avatarUrl || null,
    lastMessage: data.last_message || null,
    lastMessageAt: data.last_message_at || null,
    unreadCount: parseInt(data.unread_count || '0', 10),
  };
};

export const messagesApi = {
  getConversations: async () => {
    const response = await apiClient.get<any[]>('/api/messages/conversations');
    return response.data.map(mapConversationResponse);
  },

  getDirectHistory: (userId: string, page = 1, limit = 50) =>
    apiClient.get<{ messages: Message[]; total: number }>(
      `/api/messages/direct/${userId}`, { params: { page, limit } }
    ).then(r => r.data),

  getGroupHistory: (groupId: string, page = 1, limit = 50) =>
    apiClient.get<{ messages: Message[]; total: number }>(
      `/api/messages/group/${groupId}`, { params: { page, limit } }
    ).then(r => r.data),
};