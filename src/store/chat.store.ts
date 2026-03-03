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
      // skip if message with same id already present
      if (existing.some(m => m.id === message.id)) {
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
}));