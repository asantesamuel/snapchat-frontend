import { useEffect, useRef } from 'react';
import { ArrowLeft, MoreVertical, Phone } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useMessages } from '@/hooks/useMessages';
import { useTyping } from '@/hooks/useTyping';
import MessageBubble from '@/components/chat/MessageBubble';
import MessageInput from '@/components/chat/MessageInput';
import TypingIndicator from '@/components/chat/TypingIndicator';
import Avatar from '@/components/ui/Avatar';
// import Spinner from '@/components/ui/Spinner';
import { MessageType } from '@/types/message.types';

interface ConversationPageProps {
  conversationId: string;
  isGroup: boolean;
  name: string;
  avatarUrl?: string | null;
  onBack?: () => void;
}

const ConversationPage = ({
  conversationId,
  isGroup,
  name,
  avatarUrl,
  onBack,
}: ConversationPageProps) => {
  const { user }    = useAuthStore();
  const bottomRef   = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, sendGroupMessage, markSeen } =
    useMessages(conversationId, isGroup);

  const { onTyping, typingUsernames, isAnyoneTyping } =
    useTyping(conversationId, isGroup);

  // scroll to bottom when messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAnyoneTyping]);

  const handleSend = (content: string, isEphemeral: boolean) => {
    if (isGroup) {
      sendGroupMessage({
        groupId: conversationId,
        content,
        messageType: MessageType.TEXT,
        isEphemeral,
      });
    } else {
      sendMessage({
        receiverId: conversationId,
        content,
        messageType: MessageType.TEXT,
        isEphemeral,
      });
    }
  };

  const handleSeen = (messageId: string, mediaId?: string) => {
    markSeen({ messageId, mediaId });
  };

  return (
    <div className="flex flex-col h-full bg-black">
      {/* header */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.06] bg-black/95 backdrop-blur-sm shrink-0">
        {onBack && (
          <button
            onClick={onBack}
            title="Go back"
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/[0.06] transition-colors md:hidden"
          >
            <ArrowLeft className="w-5 h-5 text-white/60" />
          </button>
        )}

        <Avatar src={avatarUrl} username={name} size="sm" ring />

        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm truncate">{name}</p>
          <p className="text-white/30 text-xs">
            {isAnyoneTyping ? 'typing...' : isGroup ? 'group chat' : 'tap to view profile'}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button 
            title="Voice call"
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/[0.06] transition-colors"
          >
            <Phone className="w-4 h-4 text-white/40" />
          </button>
          <button 
            title="More options"
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/[0.06] transition-colors"
          >
            <MoreVertical className="w-4 h-4 text-white/40" />
          </button>
        </div>
      </div>

      {/* messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-0.5">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-3">
            <div className="w-16 h-16 rounded-2xl bg-[#FFFC00]/10 flex items-center justify-center">
              <Avatar src={avatarUrl} username={name} size="md" />
            </div>
            <p className="text-white/40 text-sm">
              Say hello to <span className="text-white font-semibold">{name}</span> 👋
            </p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isMine = message.senderId === user?.id;
            const prevMessage = messages[index - 1];
            const showAvatar = isGroup &&
              !isMine &&
              prevMessage?.senderId !== message.senderId;

            return (
              <MessageBubble
                key={message.id}
                message={message}
                isMine={isMine}
                onSeen={handleSeen}
                showAvatar={showAvatar}
                senderAvatar={message.senderAvatar}
                senderUsername={message.senderUsername}
              />
            );
          })
        )}

        {/* typing indicator */}
        <TypingIndicator usernames={typingUsernames} />

        {/* scroll anchor */}
        <div ref={bottomRef} />
      </div>

      {/* input */}
      <MessageInput
        onSend={handleSend}
        onTyping={onTyping}
      />
    </div>
  );
};

export default ConversationPage;