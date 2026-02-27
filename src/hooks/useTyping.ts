import { useEffect, useRef, useCallback } from 'react';
import { getSocket } from '@/socket/socket.client';
import { SOCKET_EVENTS } from '@/socket/socket.events';
import { useChatStore } from '@/store/chat.store';

const TYPING_DEBOUNCE_MS = 1500;

export const useTyping = (
  conversationId: string,
  isGroup: boolean
) => {
  const { setTyping, typingUsers } = useChatStore();
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef    = useRef(false);

  // ── Listen for remote typing events ───────────────────────────────
  useEffect(() => {
    const socket = getSocket();

    const handleTyping = ({ userId, username }: {
      userId: string;
      username: string;
    }) => {
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

  // ── Emit typing events with debounce ──────────────────────────────
  // emits typing_start immediately on first keystroke
  // emits typing_stop after 1.5s of inactivity
  const onTyping = useCallback(() => {
    const socket = getSocket();
    const payload = isGroup
      ? { groupId: conversationId }
      : { receiverId: conversationId };

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit(SOCKET_EVENTS.TYPING_START, payload);
    }

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);

    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit(SOCKET_EVENTS.TYPING_STOP, payload);
    }, TYPING_DEBOUNCE_MS);
  }, [conversationId, isGroup]);

  // ── Stop typing when leaving the conversation ──────────────────────
  const stopTyping = useCallback(() => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      const socket = getSocket();
      const payload = isGroup
        ? { groupId: conversationId }
        : { receiverId: conversationId };
      socket.emit(SOCKET_EVENTS.TYPING_STOP, payload);
    }
  }, [conversationId, isGroup]);

  // clean up on unmount
  useEffect(() => {
    return () => { stopTyping(); };
  }, [stopTyping]);

  const typingSet = typingUsers[conversationId] || new Set();

  return {
    onTyping,
    stopTyping,
    // convert Set to array for rendering
    typingUsernames: Array.from(typingSet),
    isAnyoneTyping: typingSet.size > 0,
  };
};