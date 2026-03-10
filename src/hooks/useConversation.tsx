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
  SaveEphemeralMessagePayload,
} from '@/types/message.types';
import { MessageStatus, MessageType } from '@/types/message.types';

// TYPING DEBOUNCE CONSTANTS
// STOP_DELAY: how long after the last keystroke before we emit typing_stop
const STOP_DELAY_MS = 1500;

export const useConversation = (
  conversationId: string,   // for DMs: the other user's UUID
  isGroup: boolean          // determines which socket events and API endpoints to use
) => {
  const { user } = useAuthStore();
  const {
    messages,
    setMessages,
    appendMessage,
    updateMessageStatus,
    typingUsers,
    setTyping,
    decrementUnreadCount,    // ← new
    markConversationRead,    // ← new
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

  // ── 2. Clear unread badge when conversation is opened ───────────
  // The sidebar badge (conversations[n].unreadCount) is set once when
  // the conversation list loads and never updates on its own.
  // The moment the user opens a conversation we set it to 0 immediately
  // so the badge clears without waiting for any server confirmation.
  // This is a local optimistic update — the server's own count stays
  // accurate because read receipts are still emitted as normal via markSeen.
  useEffect(() => {
    if (!conversationId) return;
    markConversationRead(conversationId);
  }, [conversationId, markConversationRead]);

  // ── 3. Join the socket room ──────────────────────────────────────
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

  // ── 4. Listen for incoming messages ─────────────────────────────
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
    return () => { socket.off(event, handleNewMessage); };
  }, [conversationId, isGroup, user?.id, appendMessage]);

  // ── 5. Listen for read receipts ──────────────────────────────────
  // Fires when the OTHER person marks OUR message as seen.
  // Updates the message bubble tick icon AND decrements the sidebar badge.
  //
  // WHY decrementUnreadCount is needed:
  // updateMessageStatus() only updates the individual message bubble.
  // The sidebar unread badge (conversations[n].unreadCount) is separate
  // state that never updates on its own — without this call the badge
  // stays at the old number permanently even after the message is read.
  useEffect(() => {
    const socket = getSocket();

    const handleRead = ({
      messageId, readAt, status
    }: { messageId: string; readAt: string; status: MessageStatus }) => {
      updateMessageStatus(messageId, { status, readAt });
      decrementUnreadCount(messageId);    // ← clears 1 from the sidebar badge
    };

    socket.on(SOCKET_EVENTS.MESSAGE_READ, handleRead);
    return () => { socket.off(SOCKET_EVENTS.MESSAGE_READ, handleRead); };
  }, [updateMessageStatus, decrementUnreadCount]);

  // ── 6. Listen for ephemeral deletions ───────────────────────────
  // Fires after recipient views an ephemeral message and the backend
  // has nullified its content. Shows "Snap expired" placeholder AND
  // decrements the sidebar badge.
  //
  // WHY decrementUnreadCount is needed here too:
  // Ephemeral messages increment the unread count when received just
  // like regular messages. When the snap is opened and message_deleted
  // fires, the badge must drop by 1 to match.
  useEffect(() => {
    const socket = getSocket();

    const handleDeleted = ({ messageId }: { messageId: string }) => {
      console.log('[Socket] MESSAGE_DELETED received:', messageId);
      updateMessageStatus(messageId, {
        status:  MessageStatus.DELETED,
        content: null,
      });
      decrementUnreadCount(messageId);    // ← clears 1 from the sidebar badge
    };

    socket.on(SOCKET_EVENTS.MESSAGE_DELETED, handleDeleted);
    return () => { socket.off(SOCKET_EVENTS.MESSAGE_DELETED, handleDeleted); };
  }, [updateMessageStatus, decrementUnreadCount]);

  // ── 6b. Listen for "saved" overrides ──────────────────────────────
  // When either user saves an ephemeral media message, it becomes permanent.
  useEffect(() => {
    const socket = getSocket();

    const handleSaved = ({ messageId, isEphemeral }: { messageId: string; isEphemeral: boolean }) => {
      updateMessageStatus(messageId, { isEphemeral });
    };

    socket.on(SOCKET_EVENTS.MESSAGE_SAVED, handleSaved);
    return () => { socket.off(SOCKET_EVENTS.MESSAGE_SAVED, handleSaved); };
  }, [updateMessageStatus]);

  // ── 7. Listen for typing events from remote users ───────────────
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

  // ── 8. Send a message ────────────────────────────────────────────
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

  // ── 9. Mark a message as seen ────────────────────────────────────
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

  const saveEphemeral = useCallback((messageId: string) => {
    const socket = getSocket();
    const payload: SaveEphemeralMessagePayload = { messageId };
    socket.emit(SOCKET_EVENTS.SAVE_EPHEMERAL, payload);
  }, []);

  // ── 10. Emit typing indicators ───────────────────────────────────
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
    saveEphemeral,
    onTyping,
    typingUsernames,
    isAnyoneTyping: typingUsernames.length > 0,
  };
};