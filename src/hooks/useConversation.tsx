import { useEffect, useCallback, useRef } from 'react';
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
import { MessageStatus, MessageType } from '@/types/message.types';

// TYPING DEBOUNCE CONSTANTS
// STOP_DELAY: how long after the last keystroke before we emit typing_stop
const STOP_DELAY_MS = 1500;

export const useConversation = (
  conversationId: string,   // for DMs: the other user's UUID
  isGroup: boolean          // determines which socket events and API endpoints to use
) => {
  const { user }       = useAuthStore();
  const {
    messages,
    setMessages,
    appendMessage,
    updateMessageStatus,
    typingUsers,
    setTyping,
  } = useChatStore();



  // typing state refs — using refs not state because they do not need
  // to trigger re-renders, they just track timing between keystrokes
  const isTypingRef    = useRef(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const conversationMessages = messages[conversationId] || [];

  // ── 1. Load message history ──────────────────────────────────────
  // fires once when conversationId changes (opening a different chat)
  useEffect(() => {
    if (!conversationId) return;

    const load = async () => {
      try {
        const data = isGroup
          ? await messagesApi.getGroupHistory(conversationId)
          : await messagesApi.getDirectHistory(conversationId);
        setMessages(conversationId, data.messages);
      } catch (err) {
        console.error('Failed to load messages:', err);
      }
    };

    load();
  }, [conversationId, isGroup, setMessages]);

  // ── 2. Join the socket room ──────────────────────────────────────
  // CRITICAL: for DMs, we emit the OTHER USER'S ID, not a conversation ID
  // the backend constructs the room name as dm:lowerUUID:higherUUID
  // for groups we emit the group's UUID directly
  useEffect(() => {
    if (!conversationId) return;
    const socket = getSocket();

    if (isGroup) {
      socket.emit(SOCKET_EVENTS.JOIN_GROUP, conversationId);
    } else {
      socket.emit(SOCKET_EVENTS.JOIN_CONVERSATION, conversationId);
    }

    return () => {
      // leave the room when navigating away from this conversation
      if (!isGroup) {
        socket.emit(SOCKET_EVENTS.LEAVE_CONVERSATION, conversationId);
      }
      // stop typing indicator if we leave mid-composition
      if (isTypingRef.current) {
        const payload = isGroup
          ? { groupId: conversationId }
          : { receiverId: conversationId };
        socket.emit(SOCKET_EVENTS.TYPING_STOP, payload);
        isTypingRef.current = false;
      }
    };
  }, [conversationId, isGroup]);

  // ── 3. Listen for incoming messages ─────────────────────────────
  useEffect(() => {
    const socket = getSocket();
    const event  = isGroup
      ? SOCKET_EVENTS.NEW_GROUP_MESSAGE
      : SOCKET_EVENTS.NEW_MESSAGE;

    const handleNewMessage = (message: Message) => {
      // determine which conversation slot to append to
      // for DMs: if I sent it → slot is receiverId, if I received it → slot is senderId
      // for groups: slot is always groupId
      const slot = isGroup
        ? (message.groupId as string)
        : message.senderId === user?.id
          ? (message.receiverId as string)
          : message.senderId;

      appendMessage(slot, message);
    };

    socket.on(event, handleNewMessage);

    return () => {
      socket.off(event, handleNewMessage);
    };
  }, [conversationId, isGroup, user?.id, appendMessage]);

  // ── 4. Listen for read receipts ──────────────────────────────────
  // fires when the OTHER person marks OUR message as seen
  useEffect(() => {
    const socket = getSocket();

    const handleRead = ({
      messageId, readAt, status
    }: { messageId: string; readAt: string; status: MessageStatus }) => {
      updateMessageStatus(messageId, { status, readAt });
    };

    socket.on(SOCKET_EVENTS.MESSAGE_READ, handleRead);
    return () => { socket.off(SOCKET_EVENTS.MESSAGE_READ, handleRead); };
  }, [updateMessageStatus]);

  // ── 5. Listen for ephemeral deletions ───────────────────────────
  // fires after recipient views an ephemeral message
  useEffect(() => {
    const socket = getSocket();

    const handleDeleted = ({ messageId }: { messageId: string }) => {
      console.log('[Socket] MESSAGE_DELETED received:', messageId);
      updateMessageStatus(messageId, {
        status:  MessageStatus.DELETED,
        content: null,
      });
    };

    socket.on(SOCKET_EVENTS.MESSAGE_DELETED, handleDeleted);
    return () => { socket.off(SOCKET_EVENTS.MESSAGE_DELETED, handleDeleted); };
  }, [updateMessageStatus]);

  // ── 6. Listen for typing events from remote users ───────────────
  useEffect(() => {
    const socket = getSocket();

    const handleTyping = ({ username }: { userId: string; username: string }) => {
      setTyping(conversationId, username, true);
    };

    const handleStoppedTyping = ({ username }: { username: string }) => {
      setTyping(conversationId, username, false);
    };

    socket.on(SOCKET_EVENTS.USER_TYPING, handleTyping);
    socket.on(SOCKET_EVENTS.USER_STOPPED_TYPING, handleStoppedTyping);

    return () => {
      socket.off(SOCKET_EVENTS.USER_TYPING, handleTyping);
      socket.off(SOCKET_EVENTS.USER_STOPPED_TYPING, handleStoppedTyping);
    };
  }, [conversationId, setTyping]);

  // ── 7. Send a message ────────────────────────────────────────────
  const sendMessage = useCallback((
    content: string,
    isEphemeral: boolean,
    messageType: MessageType = MessageType.TEXT,
    mediaId?: string
  ) => {
    const socket = getSocket();

    if (isGroup) {
      if (!conversationId || conversationId.trim() === '') {
        console.error('sendMessage: groupId is missing or empty', { conversationId, isGroup });
        toast.error('Error: Group missing. Please try again.');
        return;
      }
      const payload: SendGroupMessagePayload = {
        groupId: conversationId,
        content,
        messageType,
        isEphemeral,
        mediaId,
      };
      socket.emit(SOCKET_EVENTS.SEND_GROUP_MESSAGE, payload);
    } else {
      if (!conversationId || conversationId.trim() === '') {
        console.error('sendMessage: receiverId is missing or empty', { conversationId, isGroup });
        toast.error('Error: Recipient missing. Please try again.');
        return;
      }
      const payload: SendMessagePayload = {
        receiverId: conversationId,
        content,
        messageType,
        isEphemeral,
        mediaId,
      };
      socket.emit(SOCKET_EVENTS.SEND_MESSAGE, payload);
    }

    // stop typing indicator immediately after sending
    if (isTypingRef.current) {
      isTypingRef.current = false;
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      const payload = isGroup
        ? { groupId: conversationId }
        : { receiverId: conversationId };
      socket.emit(SOCKET_EVENTS.TYPING_STOP, payload);
    }
  }, [conversationId, isGroup]);

  // ── 8. Mark a message as seen ────────────────────────────────────
  // called by Intersection Observer when message enters viewport
  // or by tap on ephemeral media
  const markSeen = useCallback((
    messageId: string,
    mediaId?: string
  ) => {
    const socket = getSocket();
    const payload: MessageSeenPayload = { messageId, mediaId };
    socket.emit(SOCKET_EVENTS.MESSAGE_SEEN, payload);
  }, []);

  // ── 9. Emit typing indicators ────────────────────────────────────
  // call this on every keystroke in the message input
  // it debounces the typing_stop event automatically
  const onTyping = useCallback(() => {
    const socket = getSocket();
    const payload = isGroup
      ? { groupId: conversationId }
      : { receiverId: conversationId };

    // emit typing_start only on the FIRST keystroke after silence
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit(SOCKET_EVENTS.TYPING_START, payload);
    }

    // reset the stop timer on every keystroke
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit(SOCKET_EVENTS.TYPING_STOP, payload);
    }, STOP_DELAY_MS);
  }, [conversationId, isGroup]);

  // typing users for this specific conversation
  const typingUsernamesSet = typingUsers[conversationId] || new Set<string>();
  const typingUsernames    = Array.from(typingUsernamesSet);

  return {
    messages:       conversationMessages,
    sendMessage,
    markSeen,
    onTyping,
    typingUsernames,
    isAnyoneTyping: typingUsernames.length > 0,
  };
};