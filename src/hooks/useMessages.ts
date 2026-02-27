import { useEffect, useCallback } from 'react';
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
        console.error('Failed to load message history:', err);
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
  useEffect(() => {
    const socket = getSocket();
    const event = isGroup
      ? SOCKET_EVENTS.NEW_GROUP_MESSAGE
      : SOCKET_EVENTS.NEW_MESSAGE;

    const handleNewMessage = (message: Message) => {
      // determine which conversation this message belongs to
      const convId = isGroup
        ? (message.groupId as string)
        : message.senderId === user?.id
          ? (message.receiverId as string)
          : message.senderId;

      appendMessage(convId, message);
    };

    socket.on(event, handleNewMessage);
    return () => { socket.off(event, handleNewMessage); };
  }, [conversationId, isGroup, user?.id, appendMessage]);

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
    socket.emit(SOCKET_EVENTS.SEND_MESSAGE, payload);
  }, []);

  // ── Send a group message ───────────────────────────────────────────
  const sendGroupMessage = useCallback((payload: SendGroupMessagePayload) => {
    const socket = getSocket();
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