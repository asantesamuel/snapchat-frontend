import { cn } from '@/utils/cn';
import { formatMessageTime } from '@/utils/time';
import Avatar from '@/components/ui/Avatar';
import type { ConversationPreview } from '@/types/message.types';

interface ConversationItemProps {
  conversation: ConversationPreview;
  isActive: boolean;
  onClick: () => void;
}

const ConversationItem = ({ conversation, isActive, onClick }: ConversationItemProps) => {
  const hasUnread = conversation.unreadCount > 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 transition-all duration-150 text-left',
        'hover:bg-white/[0.04] active:bg-white/[0.06]',
        isActive && 'bg-white/[0.06] border-l-2 border-[#FFFC00]',
      )}
    >
      <div className="relative shrink-0">
        <Avatar
          src={conversation.avatarUrl}
          username={conversation.name}
          size="md"
          ring={hasUnread}
        />
        {/* group badge */}
        {conversation.isGroup && (
          <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-[#1C1C1E] rounded-full flex items-center justify-center border border-black">
            <span className="text-[8px] text-white/60">G</span>
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={cn(
            'text-sm truncate',
            hasUnread ? 'text-white font-bold' : 'text-white/80 font-medium'
          )}>
            {conversation.name}
          </span>
          {conversation.lastMessageAt && (
            <span className="text-[10px] text-white/30 shrink-0">
              {formatMessageTime(conversation.lastMessageAt)}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between mt-0.5">
          <p className={cn(
            'text-xs truncate',
            hasUnread ? 'text-white/70' : 'text-white/30'
          )}>
            {conversation.lastMessage || 'No messages yet'}
          </p>
          {hasUnread && (
            <span className="ml-2 bg-[#FFFC00] text-black text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center shrink-0">
              {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

export default ConversationItem;