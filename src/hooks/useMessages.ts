import { useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { getSocket } from '@/socket/socket.client';
import { SOCKET_EVENTS } from '@/socket/socket.events';
import { useChatStore } from '@/store/chat.store';
import { messagesApi } from '@/api/messages.api';
import { useAuthStore } from '@/store/auth.store';
import type {
  SendMessagePayload,
  SendGroupMessagePayload,
  MessageSeenPayload,
} from '@/types/message.types';
import { MessageStatus } from '@/types/message.types';

export const useMessages = (conversationId: string, isGroup = false) => {
  useAuthStore();
  const {
    messages,
    setMessages,
    updateMessageStatus,
    removeMessage,
    decrementUnreadCount,
    markConversationRead,
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
        console.log('Error details:', (err as any)?.response?.data || err);
      }
    };

    load();
  }, [conversationId, isGroup, setMessages]);

  // ── Clear unread badge when conversation is opened ─────────────────
  // As soon as the user opens a conversation the sidebar badge should
  // drop to 0 immediately — before the server has confirmed any read
  // receipts. This gives instant visual feedback with no flicker.
  // The server will also update its own count when read receipts arrive,
  // so this is purely a local optimistic update.
  useEffect(() => {
    if (!conversationId) return;
    markConversationRead(conversationId);
  }, [conversationId, markConversationRead]);

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
  // NOTE: Message listening is handled by useConversation hook.
  // This prevents duplicate message additions. useConversation is
  // responsible for appending incoming messages to the store for the
  // active conversation. We skip the listener here to avoid duplication.

  // ── Listen for read receipts ───────────────────────────────────────
  // Fires when the RECIPIENT reads a non-ephemeral message.
  // Updates the message bubble status (e.g. single tick → double tick)
  // AND decrements the sidebar unread badge for that conversation.
  //
  // WHY decrementUnreadCount is needed here:
  // updateMessageStatus() only updates the message bubble inside the
  // chat window. The sidebar badge (conversations[n].unreadCount) is
  // a completely separate piece of state that never updates on its own.
  // Without decrementUnreadCount() the badge stays at the old number
  // permanently even after the message has been read.
  useEffect(() => {
    const socket = getSocket();

    const handleMessageRead = ({ messageId, readAt, status }: {
      messageId: string;
      readAt: string;
      status: MessageStatus;
    }) => {
      // update the message bubble tick icon
      updateMessageStatus(messageId, { status, readAt });
      // clear 1 from the sidebar unread badge
      decrementUnreadCount(messageId);
    };

    socket.on(SOCKET_EVENTS.MESSAGE_READ, handleMessageRead);
    return () => { socket.off(SOCKET_EVENTS.MESSAGE_READ, handleMessageRead); };
  }, [updateMessageStatus, decrementUnreadCount]);

  // ── Listen for ephemeral deletions ─────────────────────────────────
  // Fires when an ephemeral message has been viewed and the backend
  // has nullified its content. Updates the bubble to show the
  // "Snap expired" placeholder AND decrements the sidebar unread badge.
  //
  // WHY decrementUnreadCount is needed here too:
  // Ephemeral messages also increment the unread count when received.
  // When the snap is opened and message_deleted fires, the badge must
  // drop by 1 just like a regular message_read event.
  useEffect(() => {
    const socket = getSocket();

    const handleMessageDeleted = ({ messageId }: { messageId: string }) => {
      // replace content with null to show "Snap expired" placeholder
      updateMessageStatus(messageId, {
        status: MessageStatus.DELETED,
        content: null,
      });
      // clear 1 from the sidebar unread badge
      decrementUnreadCount(messageId);
    };

    socket.on(SOCKET_EVENTS.MESSAGE_DELETED, handleMessageDeleted);
    return () => { socket.off(SOCKET_EVENTS.MESSAGE_DELETED, handleMessageDeleted); };
  }, [updateMessageStatus, removeMessage, decrementUnreadCount]);

  // ── Send a direct message ──────────────────────────────────────────
  const sendMessage = useCallback((payload: SendMessagePayload) => {
    const socket = getSocket();
    if (!isGroup && !payload.receiverId) {
      console.error('sendMessage called without receiverId for direct message', payload);
      toast.error('Error: Message recipient missing. Please try again.');
      return;
    }
    socket.emit(SOCKET_EVENTS.SEND_MESSAGE, payload);
  }, [isGroup]);

  // ── Send a group message ───────────────────────────────────────────
  const sendGroupMessage = useCallback((payload: SendGroupMessagePayload) => {
    const socket = getSocket();
    if (!payload.groupId) {
      console.error('sendGroupMessage called without groupId', payload);
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