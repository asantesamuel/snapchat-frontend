export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
}

export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  DELETED = 'deleted',
}

export interface Message {
  id: string;
  senderId: string;
  senderUsername: string;
  senderAvatar: string | null;
  receiverId: string | null;
  groupId: string | null;
  content: string | null;
  messageType: MessageType;
  mediaId: string | null;
  status: MessageStatus;
  isEphemeral: boolean;
  sentAt: string;
  readAt: string | null;
}

export interface ConversationPreview {
  conversationId: string;
  isGroup: boolean;
  name: string;
  avatarUrl: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

export interface SendMessagePayload {
  receiverId: string;
  content: string;
  messageType: MessageType;
  isEphemeral: boolean;
  mediaId?: string;
}

export interface SendGroupMessagePayload {
  groupId: string;
  content: string;
  messageType: MessageType;
  isEphemeral: boolean;
  mediaId?: string;
}

export interface TypingPayload {
  receiverId?: string;
  groupId?: string;
}

export interface MessageSeenPayload {
  messageId: string;
  mediaId?: string;
}

export interface SaveEphemeralMessagePayload {
  messageId: string;
}