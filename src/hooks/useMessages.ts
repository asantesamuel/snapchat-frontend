import { useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { getSocket } from '@/socket/socket.client';
import { SOCKET_EVENTS } from '@/socket/socket.events';
import { useChatStore } from '@/store/chat.store';
import { messagesApi } from '@/api/messages.api';
import { useAuthStore } from '@/store/auth.store';
import type {
  Message,
  SendMessagePayload,
  SendGroupMessagePayload,
  MessageSeenPayload,
} from '@/types/message.types';
import { MessageStatus } from '@/types/message.types';

export const useMessages = (conversationId: string, isGroup = false) => {
  const { user } = useAuthStore();
  const {
    messages,
    setMessages,
    appendMessage,
    updateMessageStatus,
    removeMessage,
  } = useChatStore();

  const conversationMessages = messages[conversationId] || [];

  // ── Load history on mount ──────────────────────────────────────────
  useEffect(() => {
    if (!conversationId) return;

    const load = async () => {
      try {
        const data = isGroup
          ? await messagesApi.getGroupHistory(conversationId)
          : await messagesApi.getDirectHistory(conversationId);
        setMessages(conversationId, data.messages);
      } catch (err) {
        // console.error('Failed to load message history:', err);
        console.log('Error details:', (err as any)?.response?.data || err);
      }
    };

    load();
  }, [conversationId, isGroup, setMessages]);

  // ── Join conversation room ─────────────────────────────────────────
  useEffect(() => {
    if (!conversationId) return;
    const socket = getSocket();

    if (isGroup) {
      socket.emit(SOCKET_EVENTS.JOIN_GROUP, conversationId);
    } else {
      socket.emit(SOCKET_EVENTS.JOIN_CONVERSATION, conversationId);
    }

    return () => {
      if (!isGroup) {
        socket.emit(SOCKET_EVENTS.LEAVE_CONVERSATION, conversationId);
      }
    };
  }, [conversationId, isGroup]);

  // ── Listen for incoming messages ───────────────────────────────────
  // NOTE: Message listening is handled by useConversation hook
  // This prevents duplicate message additions. useConversation is responsible
  // for appending incoming messages to the store for the active conversation.
  // We skip the listener here to avoid duplication.

  // ── Listen for read receipts ───────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();

    const handleMessageRead = ({ messageId, readAt, status }: {
      messageId: string;
      readAt: string;
      status: MessageStatus;
    }) => {
      updateMessageStatus(messageId, { status, readAt });
    };

    socket.on(SOCKET_EVENTS.MESSAGE_READ, handleMessageRead);
    return () => { socket.off(SOCKET_EVENTS.MESSAGE_READ, handleMessageRead); };
  }, [updateMessageStatus]);

  // ── Listen for ephemeral deletions ─────────────────────────────────
  useEffect(() => {
    const socket = getSocket();

    const handleMessageDeleted = ({ messageId }: { messageId: string }) => {
      // replace content with null to show "Message deleted" placeholder
      updateMessageStatus(messageId, {
        status: MessageStatus.DELETED,
        content: null,
      });
    };

    socket.on(SOCKET_EVENTS.MESSAGE_DELETED, handleMessageDeleted);
    return () => { socket.off(SOCKET_EVENTS.MESSAGE_DELETED, handleMessageDeleted); };
  }, [updateMessageStatus, removeMessage]);

  // ── Send a direct message ──────────────────────────────────────────
  const sendMessage = useCallback((payload: SendMessagePayload) => {
    const socket = getSocket();
    // validate payload for direct messages
    if (!isGroup && !payload.receiverId) {
      const errorMsg = 'sendMessage called without receiverId for direct message';
      console.error(errorMsg, payload);
      toast.error('Error: Message recipient missing. Please try again.');
      return;
    }
    socket.emit(SOCKET_EVENTS.SEND_MESSAGE, payload);
  }, [isGroup]);

  // ── Send a group message ───────────────────────────────────────────
  const sendGroupMessage = useCallback((payload: SendGroupMessagePayload) => {
    const socket = getSocket();
    // validate group payload
    if (!payload.groupId) {
      const errorMsg = 'sendGroupMessage called without groupId';
      console.error(errorMsg, payload);
      toast.error('Error: Group ID missing. Please try again.');
      return;
    }
    socket.emit(SOCKET_EVENTS.SEND_GROUP_MESSAGE, payload);
  }, []);

  // ── Mark message as seen ───────────────────────────────────────────
  const markSeen = useCallback((payload: MessageSeenPayload) => {
    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.MESSAGE_SEEN, payload);
  }, []);

  return {
    messages: conversationMessages,
    sendMessage,
    sendGroupMessage,
    markSeen,
  };
};