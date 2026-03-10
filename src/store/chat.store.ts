import { create } from 'zustand';
import type { Message, ConversationPreview } from '@/types/message.types';

interface ChatState {
  conversations: ConversationPreview[];
  // keyed by conversationId (userId for DMs, groupId for groups)
  messages: Record<string, Message[]>;
  // keyed by conversationId, value is Set of usernames currently typing
  typingUsers: Record<string, Set<string>>;

  setConversations: (conversations: ConversationPreview[]) => void;
  setMessages: (conversationId: string, messages: Message[]) => void;
  appendMessage: (conversationId: string, message: Message) => void;
  updateMessageStatus: (messageId: string, updates: Partial<Message>) => void;
  removeMessage: (messageId: string) => void;
  setTyping: (conversationId: string, username: string, isTyping: boolean) => void;

  // ── Unread count management ──────────────────────────────────────────────
  //
  // WHY these are needed:
  // The sidebar unread count badge comes from conversations[n].unreadCount.
  // This value is set once when the conversation list loads from the server.
  // It is never automatically updated when a message is read — the chat
  // window and the sidebar are two completely separate pieces of state.
  //
  // When the backend emits message_read or message_deleted, the socket
  // handler calls updateMessageStatus() which updates the message bubble.
  // But conversations[n].unreadCount stays at the old value forever,
  // so the badge never clears.
  //
  // Fix: the socket handler calls these two actions in addition to
  // updateMessageStatus(), so the badge clears at the same time as
  // the message status updates.

  // Decrement the unread count for the conversation that contains
  // the given messageId by exactly 1. Floors at 0 to prevent negative
  // counts if the event fires more than once for the same message.
  // Used by the message_read and message_deleted socket handlers.
  decrementUnreadCount: (messageId: string) => void;

  // Set the unread count for a specific conversation to exactly 0.
  // Used when the user opens a conversation — all visible messages
  // are considered read so the badge should clear immediately,
  // before the server has even confirmed the read receipts.
  markConversationRead: (conversationId: string) => void;

  // Update the preview text and timestamp shown in the sidebar for a
  // conversation when a new message arrives. Keeps the sidebar in sync
  // without requiring a full re-fetch of the conversation list.
  updateConversationPreview: (
    conversationId: string,
    updates: Partial<ConversationPreview>
  ) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  messages: {},
  typingUsers: {},

  setConversations: (conversations) => set({ conversations }),

  setMessages: (conversationId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [conversationId]: messages },
    })),

  appendMessage: (conversationId, message) =>
    set((state) => {
      const existing = state.messages[conversationId] || [];
      // skip if message with same id already present (deduplication guard)
      if (existing.some((m) => m.id === message.id)) {
        return { messages: state.messages };
      }
      return {
        messages: {
          ...state.messages,
          [conversationId]: [...existing, message],
        },
      };
    }),

  updateMessageStatus: (messageId, updates) =>
    set((state) => {
      const newMessages = { ...state.messages };
      for (const convId in newMessages) {
        newMessages[convId] = newMessages[convId].map((m) =>
          m.id === messageId ? { ...m, ...updates } : m
        );
      }
      return { messages: newMessages };
    }),

  removeMessage: (messageId) =>
    set((state) => {
      const newMessages = { ...state.messages };
      for (const convId in newMessages) {
        newMessages[convId] = newMessages[convId].filter(
          (m) => m.id !== messageId
        );
      }
      return { messages: newMessages };
    }),

  setTyping: (conversationId, username, isTyping) =>
    set((state) => {
      const current = new Set(state.typingUsers[conversationId] || []);
      if (isTyping) current.add(username);
      else current.delete(username);
      return {
        typingUsers: { ...state.typingUsers, [conversationId]: current },
      };
    }),

  // ── decrementUnreadCount ─────────────────────────────────────────────────
  // Finds which conversation the messageId belongs to by scanning
  // the messages map, then decrements that conversation's unreadCount by 1.
  //
  // HOW TO CALL:
  //   In your socket handler, after receiving message_read or message_deleted:
  //
  //   socket.on('message_read', ({ messageId, status }) => {
  //     useChatStore.getState().updateMessageStatus(messageId, { status });
  //     useChatStore.getState().decrementUnreadCount(messageId);
  //   });
  //
  //   socket.on('message_deleted', ({ messageId }) => {
  //     useChatStore.getState().updateMessageStatus(messageId, {
  //       status: MessageStatus.DELETED,
  //       content: null,
  //     });
  //     useChatStore.getState().decrementUnreadCount(messageId);
  //   });
  decrementUnreadCount: (messageId: string) =>
    set((state) => {
      // Step 1: find the conversationId that contains this message
      let conversationId: string | null = null;

      for (const convId in state.messages) {
        const found = state.messages[convId].some((m) => m.id === messageId);
        if (found) {
          conversationId = convId;
          break;
        }
      }

      if (!conversationId) {
        // message not found in local state — nothing to decrement
        return state;
      }

      // Step 2: decrement the unread count for that conversation
      // Math.max(0, ...) prevents the badge from going negative if
      // the event fires more than once for the same message
      return {
        conversations: state.conversations.map((conv) =>
          conv.conversationId === conversationId
            ? {
                ...conv,
                unreadCount: Math.max(0, (conv.unreadCount ?? 0) - 1),
              }
            : conv
        ),
      };
    }),

  // ── markConversationRead ─────────────────────────────────────────────────
  // Sets the unread count for a conversation to exactly 0.
  // Call this the moment the user opens a conversation so the badge
  // clears instantly without waiting for server confirmation.
  //
  // HOW TO CALL:
  //   In your chat component, when the conversation mounts:
  //
  //   useEffect(() => {
  //     useChatStore.getState().markConversationRead(conversationId);
  //   }, [conversationId]);
  markConversationRead: (conversationId: string) =>
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.conversationId === conversationId
          ? { ...conv, unreadCount: 0 }
          : conv
      ),
    })),

  // ── updateConversationPreview ────────────────────────────────────────────
  // Updates the preview text, timestamp, and/or unread count shown in
  // the sidebar for a conversation when a new message arrives.
  //
  // HOW TO CALL:
  //   In your socket handler, after receiving new_direct_message:
  //
  //   socket.on('new_direct_message', (message) => {
  //     useChatStore.getState().appendMessage(conversationId, message);
  //     useChatStore.getState().updateConversationPreview(conversationId, {
  //       lastMessage: message.content ?? '📷 Media',
  //       lastMessageAt: message.sentAt,
  //       unreadCount: (currentPreview.unreadCount ?? 0) + 1,
  //     });
  //   });
  updateConversationPreview: (conversationId, updates) =>
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.conversationId === conversationId
          ? { ...conv, ...updates }
          : conv
      ),
    })),
}));